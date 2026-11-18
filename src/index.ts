import type { config, secrets } from './config.js'
import { getActions, type ActionsSchema } from './actions.js'
import { getConfigFields } from './config.js'
import { getFeedbacks, type FeedbacksSchema } from './feedback.js'
import { getPresets } from './presets.js'
import { updateBasicVariables } from './variables.js'
import { TCP } from './tcp.js'
import { REST } from './rest.js'
import { InstanceBase, type CompanionVariableValues, type SomeCompanionConfigField } from '@companion-module/base'
import { ConnectionStatus } from './status.js'
import { updateFlags } from './utils.js'
import { UpgradeScripts } from './upgrades.js'

export type KairosTypes = {
	config: config
	secrets: secrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: CompanionVariableValues
}

export { UpgradeScripts }

export type KairosState = {
	audio_master_mute: number
	INPUTS: { index: number; name: string; tally: number; uuid: string; shortcut: string }[]
	MEDIA_STILLS: Array<string>
	SCENES: {
		layers: { name: string; sourceA: string; sourceB?: string; sources: string[]; uuid: string }[]
		name: string
		tally: string
		uuid: string
		path: string
		macros: { color: string; name: string; state: string; uuid: string }[]
		SNAPSHOTS: { name: string; state: string; uuid: string }[]
		actions: { name: string; state: string; uuid: string }[]
	}[]
	AUX: { index: string; name: string; source: string; sources: string[]; uuid: string }[]
	MACROS: {
		color: string
		name: string
		path: string
		state: string
		uuid: string
	}[]
	SCENES_MACROS: {
		scene: string
		/** The scene's folder path, e.g. `Templates/` */
		path: string
		/** The macro's own name, where `name` also has the scene's */
		macroName: string
		color: string
		name: string
		state: string
		uuid: string
	}[]
	SNAPSHOTS: { name: string; state: string; uuid: string; scene: string }[]
	MULTIVIEWERS: {
		index: number
		name: string
		preset: string
		presets: { id: string; name: string; usr: string }[]
		uuid: string
		sdp: string
	}[]
	PLAYERS: { player: string; repeat: number }[]
	TRANSITIONS: { sceneName: string; path: string; name: string }[]
	AUDIO_CHANNELS: { channel: string; mute: number }[]
}

const emptyKairosState = (): KairosState => ({
	audio_master_mute: 100,
	INPUTS: [],
	MEDIA_STILLS: [],
	SCENES: [],
	AUX: [],
	MACROS: [],
	PLAYERS: [],
	TRANSITIONS: [],
	AUDIO_CHANNELS: [],
	SCENES_MACROS: [],
	SNAPSHOTS: [],
	MULTIVIEWERS: [],
})

/**
 * Companion instance class for Panasonic Kairos
 */
export default class KairosInstance extends InstanceBase<KairosTypes> {
	config: config | undefined
	secrets: secrets | undefined
	rest: REST | undefined
	tcp: TCP | undefined
	readonly connectionStatus = new ConnectionStatus(
		(status, message) => this.updateStatus(status, message),
		(message) => this.log('info', message),
	)
	constructor(internal: unknown) {
		super(internal)
	}

	public KairosObj: KairosState = emptyKairosState()

	public combinedLayerArray: {
		path: string
		sceneName: string
		layerName: string
		sourceA: string
		sourceB: string
		uuid: string
	}[] = []

	/** Macro statuses (`Playing`, `Stopped`...) reported over TCP, by protocol path */
	public readonly macroStatus = new Map<string, string>()

	private readonly sentDefinitions = new Map<string, string>()
	private sentVariableValues: CompanionVariableValues = {}

	/**
	 * @description triggered on instance being enabled
	 */
	async init(config: config, _isFirstInit: boolean, secrets: secrets): Promise<void> {
		await this.configUpdated(config, secrets)
	}

	/**
	 * Creates the configuration fields for web config.
	 */
	public getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	/**
	 * @param config new configuration data
	 * @param secrets new secrets, stored apart from the config
	 * @description triggered every time the config for this instance is saved
	 */
	public async configUpdated(config: config, secrets: secrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.tcp?.destroy()
		this.rest?.destroy()
		// Forget what the previous connection found, which may have been a different mixer
		this.KairosObj = emptyKairosState()
		this.combinedLayerArray = []
		this.macroStatus.clear()
		this.connectionStatus.reset()
		this.tcp = new TCP(this, config.host, config.tcpPort)
		this.rest = new REST(this, config.host, config.restPort, config.username, secrets.password)
		this.updateInstance(updateFlags.All)
	}

	/**
	 * @description close connections and stop timers/intervals
	 */
	public async destroy(): Promise<void> {
		this.tcp?.destroy()
		this.rest?.destroy()
		this.log('debug', `Instance destroyed: ${this.id}`)
	}

	/**
	 * @description sets actions and feedbacks available for this instance
	 */
	public updateInstance(updateFlag: updateFlags): void {
		if (updateFlag === updateFlags.All) {
			const actions = getActions(this)
			const feedbacks = getFeedbacks(this)

			if (this.definitionsChanged('actions', actions)) this.setActionDefinitions(actions)
			if (this.definitionsChanged('feedbacks', feedbacks)) this.setFeedbackDefinitions(feedbacks)
			this.updatePresets()

			updateBasicVariables(this)
			this.tcp?.sync()
		} else if (updateFlag === updateFlags.onlyVariables) {
			updateBasicVariables(this)
		} else if (updateFlag === updateFlags.presets) {
			this.updatePresets()
		}
	}

	private updatePresets(): void {
		const { structure, presets } = getPresets(this)
		if (this.definitionsChanged('presets', { structure, presets })) this.setPresetDefinitions(structure, presets)
	}

	/**
	 * REST rebuilds every definition on each poll, and Companion reprocesses (and logs) each one it is sent, so only
	 * send them when they differ from the last ones sent. The callbacks look everything up when they run, so
	 * definitions with the same options behave the same.
	 */
	public definitionsChanged(kind: 'actions' | 'feedbacks' | 'presets' | 'variables', definitions: unknown): boolean {
		const serialized = JSON.stringify(definitions)
		if (this.sentDefinitions.get(kind) === serialized) return false
		this.sentDefinitions.set(kind, serialized)
		return true
	}

	/**
	 * Sends the variable values that differ from the last ones sent
	 * @param resend send them all, as after the variable definitions changed
	 */
	public setChangedVariableValues(values: CompanionVariableValues, resend: boolean): void {
		if (resend) this.sentVariableValues = {}
		const changed: CompanionVariableValues = {}
		for (const [id, value] of Object.entries(values)) {
			if (id in this.sentVariableValues && this.sentVariableValues[id] === value) continue
			changed[id] = value
			this.sentVariableValues[id] = value
		}
		if (Object.keys(changed).length > 0) this.setVariableValues(changed)
	}
}
