import type KairosInstance from './index.js'
import { InstanceStatus } from '@companion-module/base'
import { FeedbackId } from './feedback.js'
import type { SourceStatus } from './status.js'
import { allPlayers, layerRef, macroRef } from './refs.js'
import { createInputWithName, updateFlags } from './utils.js'
import { refAuxName } from 'kairos-connection'

const POLL_INTERVAL_MS = 5000
const REQUEST_TIMEOUT_MS = 4000

/**
 * The mixer could not be reached: refused, timed out, or the host is unknown
 */
export class RestConnectionError extends Error {
	constructor(error: unknown) {
		// fetch only says "fetch failed", the reason (ECONNREFUSED etc.) is in its cause
		const cause = (error as { cause?: { code?: string; message?: string } }).cause
		const timedOut = (error as Error).name === 'TimeoutError'
		super(timedOut ? 'Timed out' : (cause?.code ?? cause?.message ?? (error as Error).message))
	}
}

/**
 * The mixer answered, but with an HTTP error
 */
export class RestHttpError extends Error {
	readonly status: number

	constructor(status: number, statusText: string) {
		super(`HTTP ${status} ${statusText}`)
		this.status = status
	}
}

export class REST {
	private readonly instance: KairosInstance
	private pollTimer: NodeJS.Timeout | undefined
	private destroyed = false
	private lastStatus: SourceStatus | null = null
	private readonly pullErrors = new Map<string, string>()
	host: string
	restPort: number
	username: string
	password: string

	constructor(instance: KairosInstance, host: string, restPort: number, username: string, password: string) {
		this.instance = instance
		this.host = host
		this.restPort = restPort
		this.username = username
		this.password = password

		void this.setupKairos()
	}

	/**
	 * @description Create initial requests to Kairos
	 */
	public readonly setupKairos = async (): Promise<void> => {
		this.instance.state.players = allPlayers()
		this.instance.state.audioChannels = Array.from({ length: 16 }, (_, i) => ({
			name: `Channel ${i + 1}`,
			muted: false,
		}))
		/**
		 * Pulls the macro's
		 */
		const pullMacros = async () => {
			const macroResult = await this.sendCommand('/macros')
			if (this.destroyed) return
			this.instance.state.macros = JSON.parse(macroResult).map((macro: { path: string; name: string }) => ({
				...macro,
				ref: macroRef(macro.path, macro.name),
			}))
		}

		const pullMultiviewers = async () => {
			const multiviewerResult = await this.sendCommand('/multiviewers')
			if (this.destroyed) return
			this.instance.state.multiviewers = JSON.parse(multiviewerResult)
		}

		const pullScenesAndAux = async () => {
			const sceneResult = await this.sendCommand('/scenes')
			if (this.destroyed) return
			this.instance.state.scenes = JSON.parse(sceneResult)

			// clear arrays
			this.instance.state.layers = []
			this.instance.state.sceneMacros = []
			this.instance.state.snapshots = []

			// Load inputs, macros and snapshots from scenes into Kairos
			this.instance.state.scenes.forEach((scene: any) => {
				if (scene.macros) {
					scene.macros.forEach((macro: { color: string; name: string; state: string; uuid: string }) => {
						this.instance.state.sceneMacros.push({
							...macro,
							name: `${scene.path ?? ''}${scene.name}-${macro.name}`,
							macroName: macro.name,
							sceneName: scene.name,
							path: scene.path ?? '',
						})
					})
				}
				if (scene.snapshots) {
					scene.snapshots.forEach((snapshot: any) => {
						snapshot.sceneName = scene.name
						this.instance.state.snapshots.push(snapshot)
					})
				}
				if (!scene.layers) return
				scene.layers.forEach((layer: any) => {
					this.instance.state.layers.push({
						path: scene.path,
						sceneName: scene.name,
						layerName: layer.name,
						sourceA: layer.sourceA,
						sourceB: layer.sourceB,
						uuid: `/${scene.uuid}/${layer.uuid}`,
						ref: layerRef(scene.path, scene.name, layer.name),
					})
					if (!layer.sources) return
					layer.sources.forEach((source: any) => {
						if (this.instance.state.inputs.findIndex((x) => x.name == source) == -1)
							this.instance.state.inputs.push(createInputWithName(source))
					})
				})
			})

			const auxResult = await this.sendCommand('/aux')
			if (this.destroyed) return
			this.instance.state.auxes = JSON.parse(auxResult).map((aux: { name: string }) => ({
				...aux,
				ref: refAuxName(aux.name),
			}))

			// Load inputs from aux into Kairos
			this.instance.state.auxes.forEach((aux: any) => {
				if (!aux.sources) return
				aux.sources.forEach((source: any) => {
					if (this.instance.state.inputs.findIndex((x) => x.name == source) == -1)
						this.instance.state.inputs.push(createInputWithName(source))
				})
			})

			this.instance.checkFeedbacks(FeedbackId.aux)
			this.instance.checkFeedbacks(FeedbackId.inputSource)
			this.instance.updateInstance(updateFlags.All)
		}

		/**
		 * Pulls the current state of the switcher and updates the REST connection status from the result
		 */
		const pullState = async (): Promise<void> => {
			const pulls = { macros: pullMacros, multiviewers: pullMultiviewers, 'scenes and aux': pullScenesAndAux }
			const results = await Promise.allSettled(Object.values(pulls).map(async (pull) => pull()))
			if (this.destroyed) return

			const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason as Error] : []))
			const connectionError = errors.find((error) => error instanceof RestConnectionError)
			const authError = errors.find(
				(error) => error instanceof RestHttpError && (error.status === 401 || error.status === 403),
			)
			if (connectionError) {
				this.setStatus(InstanceStatus.ConnectionFailure, connectionError.message)
				return
			}
			if (authError) {
				this.setStatus(InstanceStatus.BadConfig, 'Authentication failed, check the username and password')
				return
			}
			if (errors.length === results.length) {
				this.setStatus(InstanceStatus.UnknownError, errors[0].message)
				return
			}
			this.setStatus(InstanceStatus.Ok, null)

			// Any other failure is specific to one endpoint, so log it without repeating it on every poll
			Object.keys(pulls).forEach((name, i) => {
				const result = results[i]
				const message = result.status === 'rejected' ? (result.reason as Error).message : null
				if (message !== null && message !== this.pullErrors.get(name)) {
					this.instance.log('error', `Error pulling ${name}: ${message}`)
				}
				if (message === null) this.pullErrors.delete(name)
				else this.pullErrors.set(name, message)
			})
		}

		const addInternalSources = () => {
			this.instance.state.inputs.push(createInputWithName('Black'))
			this.instance.state.inputs.push(createInputWithName('White'))
			this.instance.state.inputs.push(createInputWithName('ColorBar'))
			this.instance.state.inputs.push(createInputWithName('ColorCircle'))
		}

		/**
		 * Polls every few seconds, scheduling the next poll only once the previous one has finished
		 */
		const poll = async (): Promise<void> => {
			this.pollTimer = undefined
			await pullState()
			if (this.destroyed) return
			this.pollTimer = setTimeout(() => void poll(), POLL_INTERVAL_MS)
		}

		addInternalSources()
		this.instance.updateInstance(updateFlags.All)
		await poll()
	}

	/**
	 * Reports the REST connection status, logging only when it changes
	 */
	private readonly setStatus = (status: InstanceStatus, message: string | null): void => {
		if (this.destroyed) return
		if (status === this.lastStatus?.status && message === this.lastStatus.message) return
		this.lastStatus = { status, message }

		if (status !== InstanceStatus.Ok)
			this.instance.log('error', `REST API at ${this.host}:${this.restPort} unavailable: ${message}`)
		this.instance.connectionStatus.set('rest', status, message)
	}

	/**
	 * @description Close connection on instance disable/removal
	 */
	public readonly destroy = (): void => {
		this.destroyed = true
		if (this.pollTimer != undefined) clearTimeout(this.pollTimer)
	}
	/**
	 * Send rest command to Kairos
	 * @param command
	 * @returns string response
	 * @throws RestConnectionError when the mixer can't be reached, RestHttpError when it answers with an error
	 */
	public readonly sendCommand = async (command: string): Promise<string> => {
		const formattedRestRequest = `http://${this.host}:${this.restPort}${command}`
		const base64Credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64')
		const headers = new Headers({
			Authorization: `Basic ${base64Credentials}`,
		})
		if (command !== '/scenes' && command !== '/aux' && command !== '/macros' && command !== '/multiviewers')
			this.instance.log('debug', `Sending command: ${formattedRestRequest}`)

		let response: Response
		try {
			response = await fetch(formattedRestRequest, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
		} catch (error) {
			throw new RestConnectionError(error)
		}
		if (!response.ok) throw new RestHttpError(response.status, response.statusText)
		return response.text()
	}
}
