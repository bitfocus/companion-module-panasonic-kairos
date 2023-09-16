import KairosInstance from './'

interface InstanceVariableDefinition {
	name: string
	variableId: string
	type?: string
}

interface InstanceVariableValue {
	[key: string]: string | number | undefined
}

/**
 * @description Sets variable definitions
 */
export function updateBasicVariables(instance: KairosInstance) {
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

	let inputSources: { name: string; variableId: string }[] = []
	instance.KairosObj.INPUTS.forEach((INPUT) => {
		inputSources.push({ name: `Source index ${INPUT.name} name`, variableId: `${INPUT.name.replace(/ /g, '_')}` })
	})

	let auxSources: { name: string; variableId: string }[] = []
	let auxNames: { name: string; variableId: string }[] = []
	instance.KairosObj.AUX.forEach((AUX) => {
		auxSources.push({ name: `Source in ${AUX.name}`, variableId: `AUX${AUX.name.replace(/ /g, '_')}.source` })
		auxNames.push({ name: `AUX ID ${AUX.name} name`, variableId: `AUX_ID_${AUX.name.replace(/ /g, '_')}` })
	})

	let layerSources: { name: string; variableId: string }[] = []
	instance.combinedLayerArray.forEach((LAYER) => {
		layerSources.push({
			name: `SourceA in ${LAYER.name.replace(/[\/ ()]/g, '')}`,
			variableId: `${LAYER.name.replace(/[\/ ()]/g, '')}.sourceA`,
		})
		layerSources.push({
			name: `SourceB in ${LAYER.name.replace(/[\/ ()]/g, '')}`,
			variableId: `${LAYER.name.replace(/[\/ ()]/g, '')}.sourceB`,
		})
	})
	// let auxAvailable = []
	// for (const AUX of instance.KairosObj.AUX) {
	// 	auxAvailable.push({ name: `${AUX.name} available`, variableId: `${AUX.name}.available` })
	// }
	let playerRepeat: { name: string; variableId: string }[] = []
	instance.KairosObj.PLAYERS.forEach((PLAYER) => {
		playerRepeat.push({ name: `${PLAYER.player} in repeat mode`, variableId: `${PLAYER.player}.repeat` })
	})

	//let presetEnabled = []
	//for (const LAYER of instance.combinedLayerArray) {
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
	// instance.log('debug', `filtered ${JSON.stringify(filteredVariables)}`)
	instance.setVariableDefinitions(filteredVariables)

	const newVariables: InstanceVariableValue = {}

	// LIVE LAYERS
	instance.combinedLayerArray.forEach((LAYER) => {
		newVariables[`${LAYER.name.replace(/[\/ ()]/g, '')}.sourceA`] = LAYER.sourceA
		newVariables[`${LAYER.name.replace(/[\/ ()]/g, '')}.sourceB`] = LAYER.sourceB
		//newVariables[`${LAYER.name}.preset_enabled`] = LAYER.preset_enabled === 1 ? 'enabled' : 'disabled'
	})
	// AUX
	instance.KairosObj.AUX.forEach((AUX) => {
		// newVariables[AUX.name] = instance.KairosObj.INPUTS.find((x) => x.input == AUX.live)
		newVariables[`AUX${AUX.name.replace(/ /g, '_')}.source`] = AUX.source
		newVariables[`AUX_ID_${AUX.name.replace(/ /g, '_')}`] = AUX.name
		//newVariables[`${AUX.name}.available`] = AUX.available == 0 ? 'disabled' : 'enabled'
	})
	// PLAYERS
	instance.KairosObj.PLAYERS.forEach((PLAYER) => {
		newVariables[`${PLAYER.player}.repeat`] = PLAYER.repeat == 0 ? 'repeat off' : 'repeat on'
	})
	// INPUTS
	instance.KairosObj.INPUTS.forEach((INPUT) => {
		newVariables[`${INPUT.name.replace(/ /g, '_')}`] = INPUT.name
	})
	// AUDIO
	newVariables['mute_master_audio'] = instance.KairosObj.audio_master_mute == 0 ? 'unmuted' : 'muted'
	for (let index = 0; index < 16; index++) {
		if (instance.KairosObj.AUDIO_CHANNELS[index] == undefined) continue
		newVariables[`mute_channel_${index + 1}`] = instance.KairosObj.AUDIO_CHANNELS[index].mute == 0 ? 'unmuted' : 'muted'
	}
	instance.setVariableValues(newVariables)
}
