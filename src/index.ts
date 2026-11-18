import type { config } from './config.js'
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
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: CompanionVariableValues
}

export { UpgradeScripts }

/**
 * Companion instance class for Panasonic Kairos
 */
export default class KairosInstance extends InstanceBase<KairosTypes> {
	config: config | undefined
	rest: REST | undefined
	tcp: TCP | undefined
	readonly connectionStatus = new ConnectionStatus(
		(status, message) => this.updateStatus(status, message),
		(message) => this.log('info', message),
	)
	constructor(internal: unknown) {
		super(internal)
	}

	public KairosObj: {
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
			color: string
			name: string
			state: string
			path: string
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
	} = {
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
	}

	public combinedLayerArray: {
		path: string
		sceneName: string
		layerName: string
		sourceA: string
		sourceB: string
		uuid: string
	}[] = []

	/**
	 * @description triggered on instance being enabled
	 */
	async init(config: config): Promise<void> {
		await this.configUpdated(config)
		updateBasicVariables(this)
	}

	/**
	 * Creates the configuration fields for web config.
	 */
	public getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	/**
	 * @param config new configuration data
	 * @description triggered every time the config for this instance is saved
	 */
	public async configUpdated(config: config): Promise<void> {
		this.config = config
		this.tcp?.destroy()
		this.rest?.destroy()
		this.connectionStatus.reset()
		this.tcp = new TCP(this, this.config.host, this.config.tcpPort)
		this.rest = new REST(this, this.config.host, this.config.restPort, this.config.username, this.config.password)
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
			const { structure, presets } = getPresets(this)

			this.setActionDefinitions(actions)
			this.setFeedbackDefinitions(feedbacks)
			this.setPresetDefinitions(structure, presets)

			updateBasicVariables(this)
			this.tcp?.sync()
		} else if (updateFlag === updateFlags.onlyVariables) {
			updateBasicVariables(this)
		} else if (updateFlag === updateFlags.presets) {
			const { structure, presets } = getPresets(this)
			this.setPresetDefinitions(structure, presets)
		}
	}
}
