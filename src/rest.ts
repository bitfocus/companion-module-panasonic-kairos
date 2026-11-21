import type KairosInstance from './index.js'
import { mergeRestIds, type MixerState } from './state.js'
import { InstanceStatus } from '@companion-module/base'
import { FeedbackId } from './feedback.js'
import type { SourceStatus } from './status.js'
import { updateFlags } from './utils.js'

const POLL_INTERVAL_MS = 5000
const REQUEST_TIMEOUT_MS = 4000

class RestConnectionError extends Error {
	constructor(error: unknown) {
		const cause = (error as { cause?: { code?: string; message?: string } } | null)?.cause
		const message = error instanceof Error ? error.message : String(error)
		super(cause?.code ?? cause?.message ?? message)
	}
}

class RestHttpError extends Error {
	constructor(
		readonly status: number,
		statusText: string,
		detail: string,
	) {
		super(`HTTP ${status} ${statusText}${detail ? ` (${detail})` : ''}`)
	}
}

/**
 * A scene as REST lists it. TCP lists the scenes and what is in them; REST is read for the scene actions, which TCP
 * doesn't list, and, like the macros and AUXes, for the UUIDs that older buttons stored.
 */
type RestScene = {
	name: string
	path?: string
	uuid: string
	layers?: { name: string; uuid: string }[]
	macros?: { name: string; uuid: string }[]
	snapshots?: { name: string; uuid: string }[]
	actions?: { name: string; uuid: string }[]
}

export class REST {
	private pollTimer: NodeJS.Timeout | undefined
	private readonly lifetime = new AbortController()
	private lastStatus: SourceStatus | null = null
	private readonly pullErrors = new Map<string, string>()
	private readonly headers: Headers

	constructor(
		private readonly instance: KairosInstance,
		private readonly host: string,
		private readonly restPort: number,
		username: string,
		password: string,
	) {
		this.headers = new Headers({ Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` })
		void this.poll()
	}

	private readonly poll = async (): Promise<void> => {
		this.pollTimer = undefined
		try {
			await this.pullState()
		} catch (error) {
			if (!this.lifetime.signal.aborted)
				this.setStatus(InstanceStatus.UnknownError, error instanceof Error ? error.message : String(error))
		} finally {
			if (!this.lifetime.signal.aborted) this.pollTimer = setTimeout(() => void this.poll(), POLL_INTERVAL_MS)
		}
	}

	private async pullState(): Promise<void> {
		const [scenes, macros, auxes, multiviewers] = await Promise.allSettled([
			this.readList<RestScene>('/scenes'),
			this.readList<{ name: string; path: string; uuid: string }>('/macros'),
			this.readList<{ name: string; uuid: string }>('/aux'),
			this.readList<MixerState['multiviewers'][number]>('/multiviewers'),
		])
		if (this.lifetime.signal.aborted) return

		const state = this.instance.state
		if (scenes.status === 'fulfilled') {
			state.sceneActions = scenes.value.flatMap((scene) =>
				(scene.actions ?? []).map((action) => ({ ...action, sceneName: scene.name, path: scene.path ?? '' })),
			)
			const inScene = (
				scene: RestScene,
				items: { name: string; uuid: string }[] | undefined,
				id: (uuid: string) => string,
			) =>
				(items ?? []).map((item): [string, string] => [`${scene.path ?? ''}${scene.name}/${item.name}`, id(item.uuid)])
			state.restIds = {
				...state.restIds,
				layers: new Map(
					scenes.value.flatMap((scene) => inScene(scene, scene.layers, (uuid) => `/${scene.uuid}/${uuid}`)),
				),
				sceneMacros: new Map(scenes.value.flatMap((scene) => inScene(scene, scene.macros, (uuid) => uuid))),
				snapshots: new Map(scenes.value.flatMap((scene) => inScene(scene, scene.snapshots, (uuid) => uuid))),
			}
		}
		if (macros.status === 'fulfilled')
			state.restIds = {
				...state.restIds,
				macros: new Map(macros.value.map((macro): [string, string] => [`${macro.path}${macro.name}`, macro.uuid])),
			}
		if (auxes.status === 'fulfilled')
			state.restIds = {
				...state.restIds,
				auxes: new Map(auxes.value.map((aux): [string, string] => [aux.name, aux.uuid])),
			}
		if (multiviewers.status === 'fulfilled') state.multiviewers = multiviewers.value
		mergeRestIds(state)

		const pulls = { scenes, macros, auxes, multiviewers }
		if (Object.values(pulls).some((result) => result.status === 'fulfilled')) {
			this.instance.updateInstance(updateFlags.All)
			this.instance.checkFeedbacks(
				FeedbackId.aux,
				FeedbackId.inputSource,
				FeedbackId.inputMediaStill,
				FeedbackId.macroPlaying,
				FeedbackId.sceneMacroPlaying,
				FeedbackId.panelMacroPlaying,
			)
		}

		const errors: Error[] = []
		for (const [name, result] of Object.entries(pulls)) {
			if (result.status === 'fulfilled') {
				this.pullErrors.delete(name)
				continue
			}
			const error = result.reason instanceof Error ? result.reason : new Error(String(result.reason))
			errors.push(error)
			// An unreachable API fails every list, and the connection status reports that once.
			if (error instanceof RestConnectionError) continue
			if (error.message !== this.pullErrors.get(name)) {
				this.instance.log('warn', `Unable to read KAIROS REST ${name}: ${error.message}`)
				this.pullErrors.set(name, error.message)
			}
		}
		const connectionError = errors.find((error) => error instanceof RestConnectionError)
		const authError = errors.find(
			(error) => error instanceof RestHttpError && (error.status === 401 || error.status === 403),
		)
		if (connectionError) this.setStatus(InstanceStatus.ConnectionFailure, connectionError.message)
		else if (authError)
			this.setStatus(InstanceStatus.BadConfig, 'Authentication failed, check the username and password')
		else if (errors.length === Object.keys(pulls).length) this.setStatus(InstanceStatus.UnknownError, errors[0].message)
		else this.setStatus(InstanceStatus.Ok, null)
	}

	private async readList<T>(path: string): Promise<T[]> {
		const data: unknown = JSON.parse(await this.request(path))
		if (!Array.isArray(data) || data.some((item) => typeof item?.name !== 'string'))
			throw new Error(`Expected an array of named objects from ${path}`)
		return data as T[]
	}

	private setStatus(status: InstanceStatus, message: string | null): void {
		if (status === this.lastStatus?.status && message === this.lastStatus.message) return
		this.lastStatus = { status, message }
		this.instance.connectionStatus.set('rest', status, message)
	}

	public destroy(): void {
		this.lifetime.abort()
		clearTimeout(this.pollTimer)
	}

	public async patch(path: string, body: object): Promise<void> {
		if (this.lifetime.signal.aborted) throw new Error(`Cannot send KAIROS REST PATCH ${path}: connection was closed`)
		this.instance.log('debug', `Sending KAIROS REST PATCH ${path}`)
		try {
			await this.request(path, body)
		} catch (error) {
			const message = this.lifetime.signal.aborted
				? 'connection was closed'
				: error instanceof Error
					? error.message
					: String(error)
			throw new Error(`KAIROS REST PATCH ${path} failed: ${message}`, { cause: error })
		}
	}

	private async request(path: string, patchBody?: object): Promise<string> {
		const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		const signal = AbortSignal.any([this.lifetime.signal, timeout])
		const headers = new Headers(this.headers)
		if (patchBody) headers.set('Content-Type', 'application/merge-patch+json')

		let response: Response
		let body: string
		try {
			response = await fetch(`http://${this.host}:${this.restPort}${path}`, {
				method: patchBody ? 'PATCH' : 'GET',
				body: patchBody ? JSON.stringify(patchBody) : undefined,
				headers,
				signal,
			})
			body = await response.text()
		} catch (error) {
			if (timeout.aborted) throw new RestConnectionError(new Error('Timed out'))
			throw new RestConnectionError(error)
		}
		if (!response.ok) throw new RestHttpError(response.status, response.statusText, body.trim().slice(0, 300))
		return body
	}
}
