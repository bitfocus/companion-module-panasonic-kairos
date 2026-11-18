import type KairosInstance from './index.js'
import { InstanceStatus } from '@companion-module/base'
import { FeedbackId } from './feedback.js'
import type { SourceStatus } from './status.js'
import { createInputWithName, updateFlags } from './utils.js'

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
		// Load players
		this.instance.KairosObj.PLAYERS = [
			{ player: 'RR1', repeat: 0 },
			{ player: 'RR2', repeat: 0 },
			{ player: 'RR3', repeat: 0 },
			{ player: 'RR4', repeat: 0 },
			{ player: 'RR5', repeat: 0 },
			{ player: 'RR6', repeat: 0 },
			{ player: 'RR7', repeat: 0 },
			{ player: 'RR8', repeat: 0 },
			{ player: 'CP1', repeat: 0 },
			{ player: 'CP2', repeat: 0 },
			{ player: 'AP1', repeat: 0 },
			{ player: 'AP2', repeat: 0 },
			{ player: 'AP3', repeat: 0 },
			{ player: 'AP4', repeat: 0 },
			{ player: 'AP5', repeat: 0 },
			{ player: 'AP6', repeat: 0 },
			{ player: 'AP7', repeat: 0 },
			{ player: 'AP8', repeat: 0 },
			{ player: 'AP9', repeat: 0 },
			{ player: 'AP10', repeat: 0 },
			{ player: 'AP11', repeat: 0 },
			{ player: 'AP12', repeat: 0 },
			{ player: 'AP13', repeat: 0 },
			{ player: 'AP14', repeat: 0 },
			{ player: 'AP15', repeat: 0 },
			{ player: 'AP16', repeat: 0 },
		]
		// Load audio channels
		this.instance.KairosObj.AUDIO_CHANNELS = [
			{ channel: 'Channel 1', mute: 0 },
			{ channel: 'Channel 2', mute: 0 },
			{ channel: 'Channel 3', mute: 0 },
			{ channel: 'Channel 4', mute: 0 },
			{ channel: 'Channel 5', mute: 0 },
			{ channel: 'Channel 6', mute: 0 },
			{ channel: 'Channel 7', mute: 0 },
			{ channel: 'Channel 8', mute: 0 },
			{ channel: 'Channel 9', mute: 0 },
			{ channel: 'Channel 10', mute: 0 },
			{ channel: 'Channel 11', mute: 0 },
			{ channel: 'Channel 12', mute: 0 },
			{ channel: 'Channel 13', mute: 0 },
			{ channel: 'Channel 14', mute: 0 },
			{ channel: 'Channel 15', mute: 0 },
			{ channel: 'Channel 16', mute: 0 },
		]
		/**
		 * Pulls the macro's
		 */
		const pullMacros = async () => {
			const macroResult = await this.sendCommand('/macros')
			if (this.destroyed) return
			this.instance.KairosObj.MACROS = JSON.parse(macroResult)
		}

		const pullMultiviewers = async () => {
			const multiviewerResult = await this.sendCommand('/multiviewers')
			if (this.destroyed) return
			this.instance.KairosObj.MULTIVIEWERS = JSON.parse(multiviewerResult)
		}

		const pullScenesAndAux = async () => {
			const sceneResult = await this.sendCommand('/scenes')
			if (this.destroyed) return
			this.instance.KairosObj.SCENES = JSON.parse(sceneResult)

			// clear arrays
			this.instance.combinedLayerArray = []
			this.instance.KairosObj.SCENES_MACROS = []
			this.instance.KairosObj.SNAPSHOTS = []

			// Load inputs, macros and snapshots from scenes into Kairos
			this.instance.KairosObj.SCENES.forEach((scene: any) => {
				if (scene.macros) {
					if (scene.macros.lenght != this.instance.KairosObj.SCENES_MACROS.length) {
						scene.macros.forEach(
							(macro: { color: string; name: string; state: string; uuid: string; scene: string; path: string }) => {
								macro.name = scene.path ? `${scene.path}${scene.name}-${macro.name}` : `${scene.name}-${macro.name}`
								// macro.scene = scene.path ? scene.path + scene.name : scene.name
								macro.scene = scene.name
								this.instance.KairosObj.SCENES_MACROS.push(macro)
							},
						)
					}
				}
				if (scene.snapshots) {
					scene.snapshots.forEach((snapshot: any) => {
						snapshot.scene = scene.name
						this.instance.KairosObj.SNAPSHOTS.push(snapshot)
					})
				}
				if (!scene.layers) return
				scene.layers.forEach((layer: any) => {
					this.instance.combinedLayerArray.push({
						path: scene.path,
						sceneName: scene.name,
						layerName: layer.name,
						sourceA: layer.sourceA,
						sourceB: layer.sourceB,
						uuid: `/${scene.uuid}/${layer.uuid}`,
					})
					if (!layer.sources) return
					layer.sources.forEach((source: any) => {
						if (this.instance.KairosObj.INPUTS.findIndex((x) => x.name == source) == -1)
							this.instance.KairosObj.INPUTS.push(createInputWithName(source))
					})
				})
			})

			const auxResult = await this.sendCommand('/aux')
			if (this.destroyed) return
			this.instance.KairosObj.AUX = JSON.parse(auxResult)

			// Load inputs from aux into Kairos
			this.instance.KairosObj.AUX.forEach((aux: any) => {
				if (!aux.sources) return
				aux.sources.forEach((source: any) => {
					if (this.instance.KairosObj.INPUTS.findIndex((x) => x.name == source) == -1)
						this.instance.KairosObj.INPUTS.push(createInputWithName(source))
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
			this.instance.KairosObj.INPUTS.push(createInputWithName('Black'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('White'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('ColorBar'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('ColorCircle'))
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
