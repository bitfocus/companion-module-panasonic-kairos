import KairosInstance from './'
import _ from 'lodash'

interface InstanceVariableDefinition {
	label: string
	name: string
	type?: string
}

interface InstanceVariableValue {
	[key: string]: string | number | undefined
}

export class Variables {
	private readonly instance: KairosInstance

	constructor(instance: KairosInstance) {
		this.instance = instance
	}

	/**
	 * @param name Instance variable name
	 * @returns Value of instance variable or undefined
	 * @description Retrieves instance variable from any Kairos instances
	 */
	public readonly get = (variable: string): string | undefined => {
		let data

		this.instance.parseVariables(variable, (value) => {
			data = value
		})

		return data
	}

	/**
	 * @param variables Object of variablenames and their values
	 * @description Updates or removes variable for current instance
	 */
	public readonly set = (variables: InstanceVariableValue): void => {
		const newVariables: { [variableId: string]: string | undefined } = {}

		for (const name in variables) {
			newVariables[name] = variables[name]?.toString()
		}

		this.instance.setVariables(newVariables)
	}

	/**
	 * @description Sets variable definitions
	 */
	public readonly updateDefinitions = (): void => {
		const audio_mute: Set<InstanceVariableDefinition> = new Set([
			// Status
			{ label: 'Mute Master', name: 'mute_master_audio' },
			{ label: 'Mute Channel 1', name: 'mute_channel_1' },
			{ label: 'Mute Channel 2', name: 'mute_channel_2' },
			{ label: 'Mute Channel 3', name: 'mute_channel_3' },
			{ label: 'Mute Channel 4', name: 'mute_channel_4' },
			{ label: 'Mute Channel 5', name: 'mute_channel_5' },
			{ label: 'Mute Channel 6', name: 'mute_channel_6' },
			{ label: 'Mute Channel 7', name: 'mute_channel_7' },
			{ label: 'Mute Channel 8', name: 'mute_channel_8' },
			{ label: 'Mute Channel 9', name: 'mute_channel_9' },
			{ label: 'Mute Channel 10', name: 'mute_channel_10' },
			{ label: 'Mute Channel 11', name: 'mute_channel_11' },
			{ label: 'Mute Channel 12', name: 'mute_channel_12' },
			{ label: 'Mute Channel 13', name: 'mute_channel_13' },
			{ label: 'Mute Channel 14', name: 'mute_channel_14' },
			{ label: 'Mute Channel 15', name: 'mute_channel_15' },
			{ label: 'Mute Channel 16', name: 'mute_channel_16' },
		])

		let inputSources = []
		for (const input of this.instance.KairosObj.INPUTS) {
			inputSources.push({ label: `${input.shortcut} name`, name: `${input.shortcut}` })
		}
		let auxSources = []
		for (const AUX of this.instance.KairosObj.AUX) {
			auxSources.push({ label: `Source in ${AUX.aux}`, name: AUX.aux })
		}
		let layerSources = []
		for (const LAYER of this.instance.combinedLayerArray) {
			layerSources.push({ label: `SourceA in ${LAYER.name.slice(7)}`, name: `${LAYER.name}.sourceA` })
			layerSources.push({ label: `SourceB in ${LAYER.name.slice(7)}`, name: `${LAYER.name}.sourceB` })
		}
		let auxAvailable = []
		for (const AUX of this.instance.KairosObj.AUX) {
			auxAvailable.push({ label: `${AUX.aux} available`, name: `${AUX.aux}.available` })
		}
		let playerRepeat = []
		for (const PLAYER of this.instance.KairosObj.PLAYERS) {
			playerRepeat.push({ label: `${PLAYER.player} in repeat modus`, name: `${PLAYER.player}.repeat` })
		}

		let presetEnabled = []
		for (const LAYER of this.instance.combinedLayerArray) {
			presetEnabled.push({ label: `PVW bus for ${LAYER.name.slice(7)}`, name: `${LAYER.name}.preset_enabled` })
		}

		let filteredVariables = [
			...layerSources,
			...inputSources,
			...auxSources,
			...audio_mute,
			...playerRepeat,
			...auxAvailable,
			...presetEnabled,
		]

		this.instance.setVariableDefinitions(filteredVariables)
	}

	/**
	 * @description Update variables
	 */
	public readonly updateVariables = (): void => {
		const newVariables: InstanceVariableValue = {}

		// LIVE LAYERS
		for (const LAYER of this.instance.combinedLayerArray) {
			newVariables[`${LAYER.name}.sourceA`] = this.instance.KairosObj.INPUTS.find(
				(o) => o.shortcut === LAYER.sourceA
			)?.name
			newVariables[`${LAYER.name}.sourceB`] = this.instance.KairosObj.INPUTS.find(
				(o) => o.shortcut === LAYER.sourceB
			)?.name
			newVariables[`${LAYER.name}.preset_enabled`] = LAYER.preset_enabled === 1 ? 'enabled' : 'disabled'
		}
		// AUX
		for (const AUX of this.instance.KairosObj.AUX) {
			// newVariables[AUX.aux] = this.instance.KairosObj.INPUTS.find((x) => x.input == AUX.live)
			newVariables[AUX.aux] = this.instance.KairosObj.INPUTS.find((o) => o.shortcut === AUX.liveSource)?.name
			newVariables[`${AUX.aux}.available`] = AUX.available == 0 ? 'disabled' : 'enabled'
		}
		// PLAYERS
		for (const PLAYER of this.instance.KairosObj.PLAYERS) {
			newVariables[`${PLAYER.player}.repeat`] = PLAYER.repeat == 0 ? 'repeat off' : 'repeat on'
		}
		// INPUTS
		for (const INPUT of this.instance.KairosObj.INPUTS) {
			newVariables[INPUT.shortcut] = INPUT.name
		}
		// AUDIO
		newVariables['mute_master_audio'] = this.instance.KairosObj.audio_master_mute == 0 ? 'unmuted' : 'muted'
		for (let index = 0; index < 16; index++) {
			newVariables[`mute_channel_${index + 1}`] =
				this.instance.KairosObj.AUDIO_CHANNELS[index].mute == 0 ? 'unmuted' : 'muted'
		}

		this.set(newVariables)

		this.updateDefinitions()
	}
}
