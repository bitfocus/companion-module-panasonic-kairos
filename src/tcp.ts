import { InstanceStatus } from '@companion-module/base'
import { KairosConnection, TerminateSubscriptionError, refSceneTransition, refToPath } from 'kairos-connection'
import type KairosInstance from './index.js'
import { parseBoolean } from './state.js'
import { FeedbackId } from './feedback.js'
import { masterMutePath, audioMutePath, playerRepeatPath, sceneMacroPath, sceneRef } from './refs.js'
import { updateFlags } from './utils.js'
import { updateBasicVariables } from './variables.js'

// The library suppresses connection-refused errors and retries in the background.
const CONNECT_TIMEOUT_MS = 10000
const SUBSCRIPTION_RETRY_MS = 5000

type ExpectedResponse = Parameters<KairosConnection['executeCommand']>[1]
type SubscriptionTarget = {
	feedbacks: [FeedbackId, ...FeedbackId[]]
	uuid?: string
	/** Called with each value instead of storing it in the live readings */
	onValue?: (value: string) => void
}
type Subscription = SubscriptionTarget & { controller: AbortController }

export class TCP {
	private readonly connection: KairosConnection
	private readonly subscriptions = new Map<string, Subscription>()
	private readonly failedSubscriptions = new Set<string>()
	private readonly booleanWrites = new Map<string, Promise<void>>()
	private connectTimer: NodeJS.Timeout | undefined
	private retryTimer: NodeJS.Timeout | undefined
	private transitionRequest: { key: string } | undefined
	private lastErrorMessage: string | null = null
	private destroyed = false
	private generation = 0
	private variablesPending = false
	private definitionsPending = false
	private sharedMacroPaths = ''

	constructor(
		private readonly instance: KairosInstance,
		host: string,
		port: number,
	) {
		this.connection = new KairosConnection({ host, port, autoConnect: false })
		this.connection.on('connect', this.onConnect)
		this.connection.on('disconnect', this.onDisconnect)
		this.connection.on('reset', this.onReset)
		this.connection.on('error', this.logError)
		this.connection.on('warn', (error) => {
			if (!this.destroyed) this.instance.log('debug', `Kairos: ${error.message}`)
		})

		this.connectTimer = setTimeout(() => {
			this.instance.connectionStatus.set('tcp', InstanceStatus.ConnectionFailure, 'Unable to connect')
		}, CONNECT_TIMEOUT_MS)
		this.connection.connect()
	}

	private get connected(): boolean {
		return !this.destroyed && this.connection.connected
	}

	public readonly destroy = (): void => {
		if (this.destroyed) return
		this.destroyed = true
		clearTimeout(this.connectTimer)
		this.connection.disconnect()
		this.connection.discard()
		this.invalidate()
	}

	public readonly run = async (
		description: string,
		command: (kairos: KairosConnection) => Promise<unknown>,
	): Promise<void> => {
		if (!this.connected) {
			if (!this.destroyed) this.instance.log('error', `Cannot ${description}: TCP is disconnected`)
			return
		}
		this.instance.log('debug', `Sending KAIROS TCP command to ${description}`)
		try {
			await command(this.connection)
		} catch (error) {
			if (!this.destroyed)
				this.instance.log(
					'error',
					`KAIROS TCP failed to ${description}: ${error instanceof Error ? error.message : String(error)}`,
				)
		}
	}

	public readonly sendCommand = async (command: string): Promise<void> =>
		this.run(`send ${command}`, async (kairos) => kairos.executeCommand(command, 'OK' as ExpectedResponse, null))

	// Read the mixer before toggling. Serialize writes to the same property so two presses each toggle once.
	public async setBoolean(path: string, value: boolean | 'toggle', description: string): Promise<void> {
		const generation = this.generation
		const previous = this.booleanWrites.get(path)
		const write = this.run(description, async (kairos) => {
			if (previous) await previous
			if (generation !== this.generation) throw new Error('Connection changed before the write')
			let next = value
			if (next === 'toggle') {
				const current = parseBoolean(await kairos.getAttribute(path))
				if (current === undefined) throw new Error(`Unexpected value for ${path}`)
				if (generation !== this.generation) throw new Error('Connection changed before the write')
				next = !current
			}
			await kairos.setAttribute(path, next ? '1' : '0')
		})
		this.booleanWrites.set(path, write)
		await write
		if (this.booleanWrites.get(path) === write) this.booleanWrites.delete(path)
	}

	public readonly sync = (): void => {
		if (!this.connected) return
		this.syncSubscriptions()
		this.syncTransitions()
	}

	private readonly onConnect = (): void => {
		if (!this.connected) return
		clearTimeout(this.connectTimer)
		this.lastErrorMessage = null
		this.instance.connectionStatus.set('tcp', InstanceStatus.Ok, null)
		const generation = this.generation
		void this.connection
			.getSystemInfo()
			.then((info) => {
				if (generation === this.generation) this.instance.log('debug', `Kairos release ${info.releaseVersion}`)
			})
			.catch(() => undefined)
		this.refresh()
	}

	private readonly onDisconnect = (): void => {
		if (this.destroyed) return
		this.invalidate()
		// The connection status logs the loss, with the socket error that caused it.
		this.instance.connectionStatus.set('tcp', InstanceStatus.ConnectionFailure, this.lastErrorMessage ?? 'Disconnected')
		this.instance.updateInstance(updateFlags.All)
		this.checkLiveFeedbacks()
	}

	private readonly onReset = (): void => {
		if (this.destroyed) return
		this.instance.log('debug', 'Kairos was reset, refreshing all data')
		this.invalidate()
		this.refresh()
		this.checkLiveFeedbacks()
	}

	private invalidate(): void {
		this.generation++
		clearTimeout(this.retryTimer)
		this.retryTimer = undefined
		this.failedSubscriptions.clear()
		const subscriptions = [...this.subscriptions.values()]
		this.subscriptions.clear()
		this.instance.state.live.clear()
		for (const { controller } of subscriptions) controller.abort()
		this.booleanWrites.clear()
		this.transitionRequest = undefined
		this.instance.state.transitions = []
		this.instance.state.mediaStills = []
		this.instance.state.auxSlots = []
	}

	private checkLiveFeedbacks(): void {
		this.instance.checkFeedbacks(
			FeedbackId.aux,
			FeedbackId.inputSource,
			FeedbackId.inputMediaStill,
			FeedbackId.audioMuteMaster,
			FeedbackId.audioMuteChannel,
			FeedbackId.playerRepeat,
			FeedbackId.macroPlaying,
			FeedbackId.sceneMacroPlaying,
		)
	}

	private refresh(): void {
		const generation = this.generation
		void this.connection
			.listMediaStills(undefined, true)
			.then((stills) => {
				if (generation !== this.generation) return
				this.instance.state.mediaStills = stills.map((still) => refToPath(still))
				this.instance.updateInstance(updateFlags.All)
			})
			.catch((error: Error) => {
				if (generation === this.generation) this.instance.log('debug', `Unable to list media stills: ${error.message}`)
			})
		void this.connection
			.listAuxes()
			.then((auxes) => {
				if (generation !== this.generation) return
				this.instance.state.auxSlots = auxes.map((aux) => refToPath(aux))
				this.instance.updateInstance(updateFlags.All)
			})
			.catch((error: Error) => {
				if (generation === this.generation) this.instance.log('debug', `Unable to list AUXes: ${error.message}`)
			})
		this.instance.updateInstance(updateFlags.All)
	}

	// Socket errors come with a disconnect or a failed reconnect, which the connection status reports.
	private readonly logError = (error: Error): void => {
		if (this.destroyed || error.message === this.lastErrorMessage) return
		this.lastErrorMessage = error.message
		this.instance.log('debug', `TCP connection error: ${error.message}`)
	}

	private syncTransitions(): void {
		const scenes = this.instance.state.scenes
		const key = JSON.stringify(scenes.map(({ uuid, path, name }) => [uuid, path, name]))
		if (key === this.transitionRequest?.key) return
		const request = { key }
		this.transitionRequest = request
		this.instance.state.transitions = []
		if (scenes.length === 0) return

		void Promise.all(
			scenes.map(async (scene) => {
				const ref = sceneRef(scene.path, scene.name)
				const transitions = await this.connection.listSceneTransitions(ref)
				return transitions.map((transition) => ({
					sceneName: scene.name,
					path: scene.path,
					name: transition.name,
					ref: refSceneTransition(ref, transition.transitionPath),
				}))
			}),
		)
			.then((transitions) => {
				if (request !== this.transitionRequest) return
				this.instance.state.transitions = transitions.flat()
				this.instance.updateInstance(updateFlags.All)
			})
			.catch((error: Error) => {
				if (request !== this.transitionRequest) return
				this.transitionRequest = undefined
				this.instance.log('debug', `Unable to list scene transitions: ${error.message}`)
			})
	}

	private syncSubscriptions(): void {
		const state = this.instance.state
		const wanted = new Map<string, SubscriptionTarget>()
		wanted.set(masterMutePath, { feedbacks: [FeedbackId.audioMuteMaster] })
		for (const { name } of state.audioChannels)
			wanted.set(audioMutePath(name), { feedbacks: [FeedbackId.audioMuteChannel] })
		for (const { ref } of state.players) wanted.set(playerRepeatPath(ref), { feedbacks: [FeedbackId.playerRepeat] })
		for (const { ref, uuid } of state.auxes)
			wanted.set(`${refToPath(ref)}.source`, { uuid, feedbacks: [FeedbackId.aux] })
		// KAIROS allows macros with the same name in the same folder, but TCP addresses them by path and reports one status
		// for all of them. Their feedbacks stay off rather than show another macro's status.
		const macroTargets: { path: string; target: SubscriptionTarget }[] = []
		for (const macro of state.macros)
			macroTargets.push({
				path: `${refToPath(macro.ref)}.status`,
				target: { uuid: macro.uuid, feedbacks: [FeedbackId.macroPlaying] },
			})
		for (const macro of state.sceneMacros)
			macroTargets.push({
				path: `${sceneMacroPath(macro)}.status`,
				target: { uuid: macro.uuid, feedbacks: [FeedbackId.sceneMacroPlaying] },
			})
		const shared = new Set(macroTargets.map(({ path }) => path).filter((path, i, paths) => paths.indexOf(path) !== i))
		for (const { path, target } of macroTargets) if (!shared.has(path)) wanted.set(path, target)
		const sharedMacroPaths = [...shared].map((path) => path.replace(/\.status$/, '')).join(', ')
		if (sharedMacroPaths !== this.sharedMacroPaths && sharedMacroPaths)
			this.instance.log(
				'warn',
				`Several KAIROS macros share a name, so their feedbacks can't show whether they are playing: ${sharedMacroPaths}`,
			)
		this.sharedMacroPaths = sharedMacroPaths

		// An input's name is how the lists, presets and variables show it, so a rename rebuilds them
		for (const input of state.inputPaths)
			wanted.set(`${input}.name`, {
				feedbacks: [FeedbackId.inputSource, FeedbackId.aux],
				onValue: (name) => {
					if (this.instance.state.inputNames.get(input) === name) return
					this.instance.state.inputNames = new Map(this.instance.state.inputNames).set(input, name)
					this.scheduleDefinitions()
				},
			})

		// REST lists AUXes by name only, so each slot's name is how an AUX is matched to its fixed name
		for (const slot of state.auxSlots)
			wanted.set(`${slot}.name`, {
				feedbacks: [FeedbackId.aux],
				onValue: (name) => {
					if (this.instance.state.auxNames.get(slot) === name) return
					this.instance.state.auxNames = new Map(this.instance.state.auxNames).set(slot, name)
					this.scheduleDefinitions()
				},
			})

		for (const layer of state.layers) {
			const path = refToPath(layer.ref)
			const target: SubscriptionTarget = {
				uuid: layer.uuid,
				feedbacks: [FeedbackId.inputSource, FeedbackId.inputMediaStill],
			}
			wanted.set(`${path}.sourceA`, target)
			// TCP can report BLACK for a B bus that doesn't exist on this layer.
			if (layer.sourceB != null) wanted.set(`${path}.sourceB`, target)
		}

		for (const [path, subscription] of this.subscriptions) {
			if (wanted.has(path) && wanted.get(path)?.uuid === subscription.uuid) continue
			this.subscriptions.delete(path)
			state.live.delete(path)
			subscription.controller.abort()
		}
		for (const [path, target] of wanted) {
			if (!this.subscriptions.has(path) && !this.failedSubscriptions.has(path)) this.subscribe(path, target)
		}
	}

	private subscribe(path: string, target: SubscriptionTarget): void {
		const subscription: Subscription = { ...target, controller: new AbortController() }
		this.subscriptions.set(path, subscription)
		try {
			this.connection.subscribeValue(path, subscription.controller.signal, (_path, error, value) => {
				if (this.destroyed || this.subscriptions.get(path) !== subscription) return
				if (error) {
					// A global termination is followed by the disconnect or reset event, which invalidates everything.
					if (!(error instanceof TerminateSubscriptionError)) this.retrySubscription(path, subscription, error)
				} else if (value !== null) {
					if (target.onValue) target.onValue(value)
					else this.instance.state.live.set(path, { value, uuid: target.uuid })
					this.instance.checkFeedbacks(...target.feedbacks)
					this.scheduleVariables()
				}
			})
		} catch (error) {
			this.retrySubscription(path, subscription, error)
		}
	}

	private retrySubscription(path: string, subscription: Subscription, error: unknown): void {
		this.subscriptions.delete(path)
		this.instance.state.live.delete(path)
		subscription.controller.abort()
		this.failedSubscriptions.add(path)
		this.instance.log(
			'debug',
			`KAIROS TCP subscription to ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
		)
		this.instance.checkFeedbacks(...subscription.feedbacks)
		this.scheduleVariables()
		this.retryTimer ??= setTimeout(() => {
			this.retryTimer = undefined
			this.failedSubscriptions.clear()
			this.sync()
		}, SUBSCRIPTION_RETRY_MS)
	}

	private scheduleDefinitions(): void {
		if (this.definitionsPending) return
		this.definitionsPending = true
		setImmediate(() => {
			this.definitionsPending = false
			if (!this.destroyed) this.instance.updateInstance(updateFlags.All)
		})
	}

	private scheduleVariables(): void {
		if (this.variablesPending) return
		this.variablesPending = true
		setImmediate(() => {
			this.variablesPending = false
			if (!this.destroyed) updateBasicVariables(this.instance)
		})
	}
}
