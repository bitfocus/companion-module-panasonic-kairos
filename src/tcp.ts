import { InstanceStatus } from '@companion-module/base'
import {
	KairosConnection,
	MinimalKairosConnection,
	TerminateSubscriptionError,
	refAudioMixerChannel,
	refAuxName,
	refToPath,
} from 'kairos-connection'
import type KairosInstance from './index.js'
import { FeedbackId } from './feedback.js'
import { layerRef, sceneRef, sourceName } from './refs.js'
import { updateFlags } from './utils.js'
import { updateBasicVariables } from './variables.js'

// The library swallows "connection refused", so without this a mixer that is down at startup never leaves Connecting
const CONNECT_TIMEOUT_MS = 10000

// The mixer silently skips commands when too many are in flight, and the library's 1500 byte limit is still too much
// for the Kairos emulator (it drops replies from ~1000 bytes), after which every reply is matched to the wrong command
;(MinimalKairosConnection as unknown as { MAX_PENDING_BYTES: number }).MAX_PENDING_BYTES = 500

type ExpectedResponse = Parameters<KairosConnection['executeCommand']>[1]

export class TCP {
	private readonly instance: KairosInstance
	private readonly host: string
	private readonly port: number
	private readonly connection: KairosConnection
	private readonly subscriptions = new Map<string, AbortController>()
	private connectTimer: NodeJS.Timeout | undefined
	private transitionScenes = ''
	private lastErrorMessage: string | null = null
	private destroyed = false

	constructor(instance: KairosInstance, host: string, tcpPort: number) {
		this.instance = instance
		this.host = host
		this.port = tcpPort
		this.connection = new KairosConnection({ host, port: tcpPort, autoConnect: false })

		this.connection.on('connect', this.onConnect)
		this.connection.on('disconnect', this.onDisconnect)
		this.connection.on('reset', this.onReset)
		this.connection.on('error', (error) => this.logError(error))
		this.connection.on('warn', (error) => this.instance.log('debug', `Kairos: ${error.message}`))

		this.connection.connect()
		this.connectTimer = setTimeout(() => {
			this.instance.log('error', `TCP connection to ${this.host}:${this.port} failed`)
			this.instance.connectionStatus.set('tcp', InstanceStatus.ConnectionFailure, 'Unable to connect')
		}, CONNECT_TIMEOUT_MS)
	}

	public get connected(): boolean {
		return this.connection.connected
	}

	/**
	 * @description Close connection on instance disable/removal
	 */
	public readonly destroy = (): void => {
		this.destroyed = true
		clearTimeout(this.connectTimer)
		this.connection.removeAllListeners()
		// disconnect() only ends the socket, and the library reconnects whenever its socket closes
		const internal = (this.connection as unknown as { _connection: InternalConnection })._connection
		clearTimeout(internal._reconnectTimeout)
		internal._socket?.removeAllListeners('close')
		this.connection.disconnect()
		this.connection.discard()
		this.subscriptions.clear()
	}

	/**
	 * Runs a command on the mixer, logging a failure rather than throwing it
	 */
	public readonly run = (description: string, command: (kairos: KairosConnection) => Promise<unknown>): void => {
		if (!this.connection.connected) {
			this.instance.log('warn', `Cannot ${description}: not connected to Kairos`)
			return
		}
		this.instance.log('debug', `Sending command: ${description}`)
		command(this.connection).catch((error: Error) => {
			this.instance.log('warn', `Failed to ${description}: ${error.message}`)
		})
	}

	/**
	 * @param command raw protocol command, e.g. `SCENES.Main.cut` or `SCENES.Main.Layers.Background.sourceA=IP1`
	 */
	public readonly sendCommand = (command: string): void => {
		this.run(`send ${command}`, async (kairos) => kairos.executeCommand(command, 'OK' as ExpectedResponse, null))
	}

	/**
	 * Matches the live subscriptions and the transitions list to the objects REST has found, called whenever they change
	 */
	public readonly sync = (): void => {
		if (this.destroyed || !this.connection.connected) return
		this.syncSubscriptions()
		this.syncTransitions()
	}

	private readonly onConnect = (): void => {
		clearTimeout(this.connectTimer)
		this.lastErrorMessage = null
		this.instance.connectionStatus.set('tcp', InstanceStatus.Ok, null)
		this.connection
			.getSystemInfo()
			.then((info) => this.instance.log('debug', `Kairos release ${info.releaseVersion}`))
			.catch(() => undefined)
		this.refresh()
	}

	private readonly onDisconnect = (): void => {
		this.subscriptions.clear()
		this.transitionScenes = ''
		this.instance.log('error', `TCP connection to ${this.host}:${this.port} lost`)
		this.instance.connectionStatus.set('tcp', InstanceStatus.ConnectionFailure, 'Disconnected')
	}

	// The mixer was restarted or loaded a new configuration, which ends all subscriptions
	private readonly onReset = (): void => {
		this.instance.log('debug', 'Kairos was reset, refreshing all data')
		this.subscriptions.clear()
		this.transitionScenes = ''
		this.refresh()
	}

	private readonly refresh = (): void => {
		this.fetchStills()
		this.instance.updateInstance(updateFlags.All)
	}

	// TCP errors tend to repeat on every reconnect attempt, so only log one when it differs from the last
	private readonly logError = (error: Error): void => {
		if (error.message === this.lastErrorMessage) return
		this.lastErrorMessage = error.message
		this.instance.log('error', `TCP connection error: ${error.message}`)
	}

	private readonly fetchStills = (): void => {
		this.connection
			.listMediaStills(undefined, true)
			.then((stills) => {
				if (this.destroyed) return
				this.instance.KairosObj.MEDIA_STILLS = stills.map((still) => refToPath(still))
				this.instance.updateInstance(updateFlags.All)
			})
			.catch((error: Error) => this.instance.log('debug', `Unable to list media stills: ${error.message}`))
	}

	private readonly syncTransitions = (): void => {
		const scenes = this.instance.KairosObj.SCENES
		const key = scenes.map((scene) => `${scene.path}${scene.name}`).join('\n')
		if (key === this.transitionScenes) return
		this.transitionScenes = key

		Promise.all(
			scenes.map(async (scene) => {
				const transitions = await this.connection.listSceneTransitions(sceneRef(scene.path, scene.name))
				return transitions.map((transition) => ({ sceneName: scene.name, path: scene.path, name: transition.name }))
			}),
		)
			.then((transitions) => {
				if (this.destroyed || key !== this.transitionScenes) return
				this.instance.KairosObj.TRANSITIONS = transitions.flat()
				this.instance.updateInstance(updateFlags.All)
			})
			.catch((error: Error) => {
				this.transitionScenes = ''
				this.instance.log('debug', `Unable to list scene transitions: ${error.message}`)
			})
	}

	private readonly syncSubscriptions = (): void => {
		const KairosObj = this.instance.KairosObj
		const wanted = new Map<string, (value: string) => void>()

		wanted.set('AUDIOMIXER.mute', (value) => {
			KairosObj.audio_master_mute = parseInt(value)
			this.instance.checkFeedbacks(FeedbackId.audioMuteMaster)
		})
		for (const { channel } of KairosObj.AUDIO_CHANNELS) {
			wanted.set(`${refToPath(refAudioMixerChannel([channel]))}.mute`, (value) => {
				const entry = KairosObj.AUDIO_CHANNELS.find((x) => x.channel === channel)
				if (entry) entry.mute = parseInt(value)
				this.instance.checkFeedbacks(FeedbackId.audioMuteChannel)
			})
		}
		for (const { player } of KairosObj.PLAYERS) {
			wanted.set(`${player}.repeat`, (value) => {
				const entry = KairosObj.PLAYERS.find((x) => x.player === player)
				if (entry) entry.repeat = parseInt(value)
			})
		}
		for (const { name } of KairosObj.AUX) {
			wanted.set(`${refToPath(refAuxName(name))}.source`, (value) => {
				const entry = KairosObj.AUX.find((x) => x.name === name)
				if (entry) entry.source = sourceName(value, this.inputNames())
				this.instance.checkFeedbacks(FeedbackId.aux)
			})
		}
		// Only the A/B sources are needed: subscribeSceneLayer would subscribe to every attribute of every layer
		for (const layer of this.instance.combinedLayerArray) {
			const path = refToPath(layerRef(layer))
			// REST has no sourceB for layers without a B bus, where TCP would still report one (BLACK)
			const buses = layer.sourceB == null ? (['sourceA'] as const) : (['sourceA', 'sourceB'] as const)
			for (const sourceAB of buses) {
				wanted.set(`${path}.${sourceAB}`, (value) => {
					// REST replaces the layer list on every poll, so look the layer up again
					const entry = this.instance.combinedLayerArray.find((x) => refToPath(layerRef(x)) === path)
					if (entry) entry[sourceAB] = sourceName(value, this.inputNames())
					this.instance.checkFeedbacks(FeedbackId.inputSource, FeedbackId.inputMediaStill)
				})
			}
		}

		for (const [path, controller] of this.subscriptions) {
			if (wanted.has(path)) continue
			controller.abort()
			this.subscriptions.delete(path)
		}
		for (const [path, onValue] of wanted) {
			if (this.subscriptions.has(path)) continue
			this.subscribe(path, onValue)
		}
	}

	private readonly subscribe = (path: string, onValue: (value: string) => void): void => {
		const controller = new AbortController()
		this.subscriptions.set(path, controller)
		this.connection.subscribeValue(path, controller.signal, (_path, error, value) => {
			if (error) {
				// Subscriptions end on disconnect and reset, and are made again after
				if (!(error instanceof TerminateSubscriptionError))
					this.instance.log('debug', `Subscription to ${path} failed: ${error.message}`)
				return
			}
			if (value === null) return
			onValue(value)
			updateBasicVariables(this.instance)
		})
	}

	private readonly inputNames = (): string[] => this.instance.KairosObj.INPUTS.map((input) => input.name)
}

interface InternalConnection {
	_socket?: { removeAllListeners(event: string): void }
	_reconnectTimeout?: NodeJS.Timeout
}
