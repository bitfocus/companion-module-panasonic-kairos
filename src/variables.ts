import type { CompanionVariableDefinitions, CompanionVariableValues } from '@companion-module/base'
import type KairosInstance from './index.js'

interface InstanceVariableDefinition {
	name: string
	variableId: string
}

/**
 * Variable ids may only contain letters, numbers, '-', '_', '.' and '!', and Companion drops definitions with any
 * other character. These names come from the mixer, so strip anything else (ids that were already valid are unchanged).
 */
const sanitizeVariableIdPart = (name: string): string => name.replace(/[^a-zA-Z0-9\-_.!]/g, '')

export const inputVariableId = (inputName: string): string =>
	`INPUT.${sanitizeVariableIdPart(inputName.replace(/ /g, '_'))}`
export const auxVariableId = (auxName: string): string => `AUX.${sanitizeVariableIdPart(auxName.replace(/ /g, '_'))}`
const layerVariableId = (sceneName: string, layerName: string): string =>
	`Scene.${sanitizeVariableIdPart(sceneName)}.${sanitizeVariableIdPart(layerName)}`

/**
 * @description Sets variable definitions
 */
export function updateBasicVariables(instance: KairosInstance): void {
	const audio_mute: Set<InstanceVariableDefinition> = new Set([
		{ name: 'Audio Master - Mute', variableId: 'Audio.mute_master_audio' },
		{ name: 'Audio Channel 1 - Mute', variableId: 'Audio.mute_channel_1' },
		{ name: 'Audio Channel 2 - Mute', variableId: 'Audio.mute_channel_2' },
		{ name: 'Audio Channel 3 - Mute', variableId: 'Audio.mute_channel_3' },
		{ name: 'Audio Channel 4 - Mute', variableId: 'Audio.mute_channel_4' },
		{ name: 'Audio Channel 5 - Mute', variableId: 'Audio.mute_channel_5' },
		{ name: 'Audio Channel 6 - Mute', variableId: 'Audio.mute_channel_6' },
		{ name: 'Audio Channel 7 - Mute', variableId: 'Audio.mute_channel_7' },
		{ name: 'Audio Channel 8 - Mute', variableId: 'Audio.mute_channel_8' },
		{ name: 'Audio Channel 9 - Mute', variableId: 'Audio.mute_channel_9' },
		{ name: 'Audio Channel 10 - Mute', variableId: 'Audio.mute_channel_10' },
		{ name: 'Audio Channel 11 - Mute', variableId: 'Audio.mute_channel_11' },
		{ name: 'Audio Channel 12 - Mute', variableId: 'Audio.mute_channel_12' },
		{ name: 'Audio Channel 13 - Mute', variableId: 'Audio.mute_channel_13' },
		{ name: 'Audio Channel 14 - Mute', variableId: 'Audio.mute_channel_14' },
		{ name: 'Audio Channel 15 - Mute', variableId: 'Audio.mute_channel_15' },
		{ name: 'Audio Channel 16 - Mute', variableId: 'Audio.mute_channel_16' },
	])

	const inputSources: { name: string; variableId: string }[] = []
	instance.state.inputs.forEach((INPUT) => {
		inputSources.push({ name: `Input ${INPUT.name} - Name`, variableId: inputVariableId(INPUT.name) })
	})

	const auxSources: { name: string; variableId: string }[] = []
	const auxNames: { name: string; variableId: string }[] = []
	instance.state.auxes.forEach((AUX) => {
		auxSources.push({ name: `AUX ${AUX.name} - Source`, variableId: `${auxVariableId(AUX.name)}.source` })
		auxNames.push({ name: `AUX ${AUX.name} - Name`, variableId: auxVariableId(AUX.name) })
	})

	const layerSources: { name: string; variableId: string }[] = []
	instance.state.layers.forEach((LAYER) => {
		layerSources.push({
			name: `Layer ${LAYER.sceneName}/${LAYER.layerName} - Source A`,
			variableId: `${layerVariableId(LAYER.sceneName, LAYER.layerName)}.sourceA`,
		})
		layerSources.push({
			name: `Layer ${LAYER.sceneName}/${LAYER.layerName} - Source B`,
			variableId: `${layerVariableId(LAYER.sceneName, LAYER.layerName)}.sourceB`,
		})
	})
	const playerRepeat: { name: string; variableId: string }[] = []
	instance.state.players.forEach((PLAYER) => {
		playerRepeat.push({ name: `Player ${PLAYER.name} - Repeat`, variableId: `Player.${PLAYER.name}.repeat` })
	})

	const filteredVariables = [
		...layerSources,
		...inputSources,
		...auxSources,
		...auxNames,
		...audio_mute,
		...playerRepeat,
	]
	const variableDefinitions: CompanionVariableDefinitions = {}
	for (const variable of filteredVariables) {
		variableDefinitions[variable.variableId] = { name: variable.name }
	}
	const definitionsChanged = instance.definitionsChanged('variables', variableDefinitions)
	if (definitionsChanged) instance.setVariableDefinitions(variableDefinitions)

	const newVariables: CompanionVariableValues = {}

	instance.state.layers.forEach((LAYER) => {
		newVariables[`${layerVariableId(LAYER.sceneName, LAYER.layerName)}.sourceA`] = LAYER.sourceA
		newVariables[`${layerVariableId(LAYER.sceneName, LAYER.layerName)}.sourceB`] = LAYER.sourceB
	})
	instance.state.auxes.forEach((AUX) => {
		newVariables[`${auxVariableId(AUX.name)}.source`] = AUX.source
		newVariables[auxVariableId(AUX.name)] = AUX.name
	})
	// PLAYERS
	instance.state.players.forEach((PLAYER) => {
		newVariables[`Player.${PLAYER.name}.repeat`] = PLAYER.repeat ? 'repeat on' : 'repeat off'
	})
	// INPUTS
	instance.state.inputs.forEach((INPUT) => {
		newVariables[inputVariableId(INPUT.name)] = INPUT.name
	})
	// AUDIO
	newVariables['Audio.mute_master_audio'] = instance.state.masterMuted ? 'muted' : 'unmuted'
	for (let index = 0; index < 16; index++) {
		if (instance.state.audioChannels[index] == undefined) continue
		newVariables[`Audio.mute_channel_${index + 1}`] = instance.state.audioChannels[index].muted ? 'muted' : 'unmuted'
	}
	// Companion drops the values of removed variables, so after a definition change send every value again
	instance.setChangedVariableValues(newVariables, definitionsChanged)
}
