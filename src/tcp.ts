import { InstanceStatus } from '@companion-module/base'
import { KairosConnection, TerminateSubscriptionError, refToPath } from 'kairos-connection'
import type KairosInstance from './index.js'
import { mergeRestIds, parseBoolean } from './state.js'
import { discover, type Discovered } from './discovery.js'
import { sourcePaths } from './choices.js'
import { FeedbackId } from './feedback.js'
import { masterMutePath, audioMutePath, playerRepeatPath, sceneMacroPath, isInputPath } from './refs.js'
import { updateFlags } from './utils.js'
import { updateBasicVariables } from './variables.js'

// The library suppresses connection-refused errors and retries in the background.
const CONNECT_TIMEOUT_MS = 10000
const SUBSCRIPTION_RETRY_MS = 5000
const DISCOVERY_INTERVAL_MS = 10000
/** How long to gather changes, such as the names of every input arriving after connecting, before rebuilding the lists */
const DEFINITIONS_DELAY_MS = 100

/** A TCP list value (`BLACK,IP1,NDI1,`) as its items */
const parseList = (value: string): string[] => value.split(',').filter((item) => item !== '')

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
	private lastErrorMessage: string | null = null
	private destroyed = false
	private generation = 0
	private variablesPending = false
	private definitionsPending = false
	private readonly pendingFeedbacks = new Set<FeedbackId>()
	/** Every AUX output's fixed name, and what TCP has reported about it so far */
	private auxSlots: string[] = []
	private discoveryTimer: NodeJS.Timeout | undefined
	private lastDiscovery = ''
	private lastDiscoveryErrors = ''
	private auxInfo = new Map<string, { available?: boolean; name?: string; sourceOptions?: string[] }>()

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
		clearTimeout(this.discoveryTimer)
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

	/** Forgets what TCP reported live. What discovery listed is kept, and replaced by the next discovery. */
	private invalidate(): void {
		this.generation++
		clearTimeout(this.retryTimer)
		clearTimeout(this.discoveryTimer)
		this.lastDiscovery = ''
		this.lastDiscoveryErrors = ''
		this.retryTimer = undefined
		this.failedSubscriptions.clear()
		const subscriptions = [...this.subscriptions.values()]
		this.subscriptions.clear()
		this.instance.state.live.clear()
		for (const { controller } of subscriptions) controller.abort()
		this.booleanWrites.clear()
		this.pendingFeedbacks.clear()
		this.auxInfo.clear()
		this.instance.state.auxes = []
		this.instance.state.layerSourceOptions = new Map()
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
			FeedbackId.panelMacroPlaying,
		)
	}

	private refresh(): void {
		void this.rediscover(this.generation)
		this.instance.updateInstance(updateFlags.All)
	}

	// Socket errors come with a disconnect or a failed reconnect, which the connection status reports.
	private readonly logError = (error: Error): void => {
		if (this.destroyed || error.message === this.lastErrorMessage) return
		this.lastErrorMessage = error.message
		this.instance.log('debug', `TCP connection error: ${error.message}`)
	}

	private syncSubscriptions(): void {
		const state = this.instance.state
		const wanted = new Map<string, SubscriptionTarget>()
		wanted.set(masterMutePath, { feedbacks: [FeedbackId.audioMuteMaster] })
		for (const { name } of state.audioChannels)
			wanted.set(audioMutePath(name), { feedbacks: [FeedbackId.audioMuteChannel] })
		for (const { ref } of state.players) wanted.set(playerRepeatPath(ref), { feedbacks: [FeedbackId.playerRepeat] })
		// Every AUX output reports whether it is in use; those that are, their name, source options and source
		for (const slot of this.auxSlots) {
			wanted.set(`${slot}.available`, {
				feedbacks: [FeedbackId.aux],
				onValue: (value) => this.updateAux(slot, { available: value === '1' }),
			})
			if (!this.auxInfo.get(slot)?.available) continue
			wanted.set(`${slot}.name`, { feedbacks: [FeedbackId.aux], onValue: (name) => this.updateAux(slot, { name }) })
			wanted.set(`${slot}.sourceOptions`, {
				feedbacks: [FeedbackId.aux],
				onValue: (value) => this.updateAux(slot, { sourceOptions: parseList(value) }),
			})
			wanted.set(`${slot}.source`, { uuid: slot, feedbacks: [FeedbackId.aux] })
		}
		for (const macro of state.macros) {
			const path = refToPath(macro.ref)
			wanted.set(`${path}.status`, { uuid: path, feedbacks: [FeedbackId.macroPlaying] })
		}
		for (const macro of state.sceneMacros) {
			const path = sceneMacroPath(macro)
			wanted.set(`${path}.status`, { uuid: path, feedbacks: [FeedbackId.sceneMacroPlaying] })
		}
		for (const { path } of state.panelMacros)
			wanted.set(`${path}.status`, { uuid: path, feedbacks: [FeedbackId.panelMacroPlaying] })

		// An input's name is how the lists, presets and variables show it, so a rename rebuilds them
		for (const input of sourcePaths(state).filter(isInputPath))
			wanted.set(`${input}.name`, {
				feedbacks: [FeedbackId.inputSource, FeedbackId.aux],
				onValue: (name) => {
					if (this.instance.state.inputNames.get(input) === name) return
					this.instance.state.inputNames = new Map(this.instance.state.inputNames).set(input, name)
					this.scheduleDefinitions()
				},
			})

		for (const layer of state.layers) {
			const path = refToPath(layer.ref)
			wanted.set(`${path}.sourceOptions`, {
				feedbacks: [FeedbackId.inputSource],
				onValue: (value) => {
					const options = parseList(value)
					const current = this.instance.state.layerSourceOptions.get(path)
					if (current?.join() === options.join()) return
					this.instance.state.layerSourceOptions = new Map(this.instance.state.layerSourceOptions).set(path, options)
					this.scheduleDefinitions()
				},
			})
		}

		for (const layer of state.layers) {
			const path = refToPath(layer.ref)
			const target: SubscriptionTarget = {
				uuid: path,
				feedbacks: [FeedbackId.inputSource, FeedbackId.inputMediaStill],
			}
			wanted.set(`${path}.sourceA`, target)
			// TCP can report BLACK for a B bus that doesn't exist on this layer.
			if (layer.hasSourceB) wanted.set(`${path}.sourceB`, target)
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
					this.scheduleFeedbacks(target.feedbacks)
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
		this.scheduleFeedbacks(subscription.feedbacks)
		this.scheduleVariables()
		this.retryTimer ??= setTimeout(() => {
			this.retryTimer = undefined
			this.failedSubscriptions.clear()
			this.sync()
		}, SUBSCRIPTION_RETRY_MS)
	}

	/** What discovery has listed so far, which a list that can't be read keeps */
	private discovered(): Discovered {
		const { scenes, layers, snapshots, sceneMacros, transitions, macros, mediaStills, panelMacros } =
			this.instance.state
		return {
			scenes,
			layers,
			snapshots,
			sceneMacros,
			transitions,
			macros,
			mediaStills,
			panelMacros,
			auxSlots: this.auxSlots,
		}
	}

	/**
	 * Lists what is on the mixer, and again every few seconds, as TCP doesn't report new items. The lists are only
	 * replaced, and the definitions rebuilt, when something has changed.
	 */
	private async rediscover(generation: number): Promise<void> {
		try {
			const { found, errors } = await discover(this.connection, this.discovered())
			if (generation !== this.generation) return
			const errorText = errors.join('; ')
			if (errorText !== this.lastDiscoveryErrors) {
				this.lastDiscoveryErrors = errorText
				for (const error of errors) this.instance.log('debug', error)
			}
			const json = JSON.stringify(found)
			if (json !== this.lastDiscovery) {
				this.lastDiscovery = json
				const { auxSlots, ...lists } = found
				Object.assign(this.instance.state, lists)
				this.auxSlots = auxSlots
				mergeRestIds(this.instance.state)
				this.publishAuxes()
				this.instance.updateInstance(updateFlags.All)
			}
		} catch (error) {
			if (generation === this.generation)
				this.instance.log(
					'debug',
					`Unable to list the mixer's contents: ${error instanceof Error ? error.message : String(error)}`,
				)
		} finally {
			if (generation === this.generation && !this.destroyed)
				this.discoveryTimer = setTimeout(() => void this.rediscover(generation), DISCOVERY_INTERVAL_MS)
		}
	}

	/** Records what an AUX output reported */
	private updateAux(slot: string, update: { available?: boolean; name?: string; sourceOptions?: string[] }): void {
		this.auxInfo.set(slot, { ...this.auxInfo.get(slot), ...update })
		// A newly available output still needs its name and source options subscribed
		if (!this.publishAuxes() && update.available) this.scheduleDefinitions()
	}

	/**
	 * Publishes the AUXes in use whose name and source options are known
	 * @returns whether they changed
	 */
	private publishAuxes(): boolean {
		const { restIds } = this.instance.state
		const auxes = this.auxSlots.flatMap((slot) => {
			const { available, name, sourceOptions } = this.auxInfo.get(slot) ?? {}
			if (!available || name === undefined || !sourceOptions) return []
			return [{ slot, name, sourceOptions, restId: restIds.auxes.get(name) }]
		})
		if (JSON.stringify(auxes) === JSON.stringify(this.instance.state.auxes)) return false
		this.instance.state.auxes = auxes
		this.scheduleDefinitions()
		return true
	}

	private scheduleDefinitions(): void {
		if (this.definitionsPending) return
		this.definitionsPending = true
		setTimeout(() => {
			this.definitionsPending = false
			if (!this.destroyed) this.instance.updateInstance(updateFlags.All)
		}, DEFINITIONS_DELAY_MS)
	}

	/** Checks the feedbacks a reading affects, together with those of every other reading that arrives with it */
	private scheduleFeedbacks(feedbacks: FeedbackId[]): void {
		const first = this.pendingFeedbacks.size === 0
		for (const feedback of feedbacks) this.pendingFeedbacks.add(feedback)
		if (!first) return
		setImmediate(() => {
			const [feedback, ...rest] = this.pendingFeedbacks
			this.pendingFeedbacks.clear()
			if (!this.destroyed && feedback) this.instance.checkFeedbacks(feedback, ...rest)
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
