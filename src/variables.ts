import KairosInstance from './'

interface InstanceVariableDefinition {
	name: string
	variableId: string
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
	 * @description Sets variable definitions
	 */
	public readonly updateDefinitions = (): void => {
		const audio_mute: Set<InstanceVariableDefinition> = new Set([
			// Status
			{ name: 'Mute Master', variableId: 'mute_master_audio' },
			{ name: 'Mute Channel 1', variableId: 'mute_channel_1' },
			{ name: 'Mute Channel 2', variableId: 'mute_channel_2' },
			{ name: 'Mute Channel 3', variableId: 'mute_channel_3' },
			{ name: 'Mute Channel 4', variableId: 'mute_channel_4' },
			{ name: 'Mute Channel 5', variableId: 'mute_channel_5' },
			{ name: 'Mute Channel 6', variableId: 'mute_channel_6' },
			{ name: 'Mute Channel 7', variableId: 'mute_channel_7' },
			{ name: 'Mute Channel 8', variableId: 'mute_channel_8' },
			{ name: 'Mute Channel 9', variableId: 'mute_channel_9' },
			{ name: 'Mute Channel 10', variableId: 'mute_channel_10' },
			{ name: 'Mute Channel 11', variableId: 'mute_channel_11' },
			{ name: 'Mute Channel 12', variableId: 'mute_channel_12' },
			{ name: 'Mute Channel 13', variableId: 'mute_channel_13' },
			{ name: 'Mute Channel 14', variableId: 'mute_channel_14' },
			{ name: 'Mute Channel 15', variableId: 'mute_channel_15' },
			{ name: 'Mute Channel 16', variableId: 'mute_channel_16' },
		])

		let inputSources = []
		for (const input of this.instance.KairosObj.INPUTS) {
			inputSources.push({ name: `${input.shortcut} name`, variableId: `${input.shortcut}` })
		}
		let auxSources = []
		for (const AUX of this.instance.KairosObj.AUX) {
			auxSources.push({ name: `Source in ${AUX.aux}`, variableId: `${AUX.aux}.source` })
		}
		let auxNames = []
		for (const AUX of this.instance.KairosObj.AUX) {
			auxNames.push({ name: `${AUX.aux} variableId`, variableId: AUX.aux })
		}
		let layerSources = []
		for (const LAYER of this.instance.combinedLayerArray) {
			layerSources.push({ name: `SourceA in ${LAYER.name.slice(7)}`, variableId: `${LAYER.name}.sourceA` })
			layerSources.push({ name: `SourceB in ${LAYER.name.slice(7)}`, variableId: `${LAYER.name}.sourceB` })
		}
		//let auxAvailable = []
		//for (const AUX of this.instance.KairosObj.AUX) {
		//	auxAvailable.push({ name: `${AUX.aux} available`, variableId: `${AUX.aux}.available` })
		//}
		let playerRepeat = []
		for (const PLAYER of this.instance.KairosObj.PLAYERS) {
			playerRepeat.push({ name: `${PLAYER.player} in repeat mode`, variableId: `${PLAYER.player}.repeat` })
		}

		//let presetEnabled = []
		//for (const LAYER of this.instance.combinedLayerArray) {
		//	presetEnabled.push({ name: `PVW bus for ${LAYER.name.slice(7)}`, variableId: `${LAYER.name}.preset_enabled` })
		//}

		let filteredVariables = [
			...layerSources,
			...inputSources,
			...auxSources,
			...auxNames,
			...audio_mute,
			...playerRepeat,
			//...auxAvailable,
			//...presetEnabled,
		]

		this.instance.setVariableDefinitions(filteredVariables)
	}

	/**
	 * @description Update variables
	 */
	public readonly updateVariables = (): void => {
		this.updateDefinitions()

		const newVariables: InstanceVariableValue = {}

		// LIVE LAYERS
		for (const LAYER of this.instance.combinedLayerArray) {
			newVariables[`${LAYER.name}.sourceA`] = this.instance.KairosObj.INPUTS.find(
				(o) => o.shortcut === LAYER.sourceA
			)?.name
			newVariables[`${LAYER.name}.sourceB`] = this.instance.KairosObj.INPUTS.find(
				(o) => o.shortcut === LAYER.sourceB
			)?.name
			//newVariables[`${LAYER.name}.preset_enabled`] = LAYER.preset_enabled === 1 ? 'enabled' : 'disabled'
		}
		// AUX
		for (const AUX of this.instance.KairosObj.AUX) {
			// newVariables[AUX.aux] = this.instance.KairosObj.INPUTS.find((x) => x.input == AUX.live)
			newVariables[`${AUX.aux}.source`] = this.instance.KairosObj.INPUTS.find((o) => o.shortcut === AUX.liveSource)?.name
			newVariables[AUX.aux] = AUX.name
			//newVariables[`${AUX.aux}.available`] = AUX.available == 0 ? 'disabled' : 'enabled'
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

		this.instance.setVariableValues(newVariables)
	}
}
