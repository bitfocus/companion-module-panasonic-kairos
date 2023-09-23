import { config } from './config'
import { getActions } from './actions'
import { getConfigFields } from './config'
import { getFeedbacks } from './feedback'
import { getPresets } from './presets'
import { updateBasicVariables } from './variables'
import { TCP } from './tcp'
import { REST } from './rest'
import { InstanceBase, InstanceStatus, runEntrypoint, SomeCompanionConfigField } from '@companion-module/base'

enum updateFlags {
	NONE = 0,
	onlyVariables = 1,
	All = 2,
}
/**
 * Companion instance class for Panasonic Kairos
 */
class KairosInstance extends InstanceBase<config> {
	config: config | undefined
	rest: REST | undefined
	tcp: any
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
		}[]
		AUX: { index: string; name: string; source: string; sources: string[]; uuid: string }[]
		MACROS: Array<string>
		PLAYERS: { player: string; repeat: number }[]
		MV_PRESETS: Array<string>
		AUDIO_CHANNELS: { channel: string; mute: number }[]
	} = {
		audio_master_mute: 100,
		INPUTS: [],
		MEDIA_STILLS: [],
		SCENES: [],
		AUX: [],
		MACROS: [],
		PLAYERS: [],
		MV_PRESETS: [],
		AUDIO_CHANNELS: [],
	}

	public combinedLayerArray: { name: string; sourceA: string; sourceB: string; preset_enabled?: number; uuid: string}[] = []
	public combinedTransitionsArray: Array<string> = []
	public combinedSmacrosArray: Array<string> = []
	public combinedSnapshotsArray: Array<string> = []

	public connected = false

	/**
	 * @description triggered on instance being enabled
	 */
	async init(config: config): Promise<void> {
		// New Module warning
		this.log('info', `Welcome, Panasonic module is loading`)
		this.updateStatus(InstanceStatus.Connecting, 'Connecting')

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
	public configUpdated(config: config): Promise<void> {
		this.config = config
		this.tcp?.destroy()
		this.tcp = new TCP(this, this.config.host, this.config.tcpPort)
		this.rest = new REST(this, this.config.host, this.config.restPort, this.config.username, this.config.password)
		this.updateInstance(updateFlags.All)
		return Promise.resolve()
	}

	/**
	 * @description close connections and stop timers/intervals
	 */
	public async destroy(): Promise<void> {
		this.tcp?.destroy()
		this.rest?.destroy()
		this.log('debug', `Instance destroyed: ${this.id}`)
	}

	//  /**
	//    * @param option string from text inputs
	//    * @returns array of strings indexed by the button modifier delimiter
	//    * @description first splits the string by the position of the delimiter, then parses any instance variables in each part
	//    */
	//   public readonly parseOption = (option: string): string[] => {
	//     const instanceVariable = RegExp(/\$\(([^:$)]+):([^)$]+)\)/)

	//     return option.split(this.config.shiftDelimiter).map((value) => {
	//       if (instanceVariable.test(value)) {
	//         return this.variables ? this.variables.get(value) || '' : ''
	//       } else {
	//         return value
	//       }
	//     })
	//   }
	/**
	 * @description sets actions and feedbacks available for this instance
	 */
	public updateInstance(updateFlag: updateFlags): void {
		// const begin = Date.now()
		// Cast actions and feedbacks from Kairos types to Companion types

		if (updateFlag === updateFlags.All) {
			const actions = getActions(this)
			const feedbacks = getFeedbacks(this)
			const presets = getPresets(this)

			this.setActionDefinitions(actions)
			this.setFeedbackDefinitions(feedbacks)
			this.setPresetDefinitions(presets)

			updateBasicVariables(this)
		} else if (updateFlag === updateFlags.onlyVariables) {
			updateBasicVariables(this)
		}
		// const end = Date.now()
		// this.log('debug',`updateInstance:${updateFlag === updateFlags.onlyVariables ? 'variables' : 'all'} ${end - begin}, 'ms'`)
	}
}

runEntrypoint(KairosInstance, [])

export = KairosInstance
