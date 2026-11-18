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
		{ name: 'Mute Master', variableId: 'Audio.mute_master_audio' },
		{ name: 'Mute Channel 1', variableId: 'Audio.mute_channel_1' },
		{ name: 'Mute Channel 2', variableId: 'Audio.mute_channel_2' },
		{ name: 'Mute Channel 3', variableId: 'Audio.mute_channel_3' },
		{ name: 'Mute Channel 4', variableId: 'Audio.mute_channel_4' },
		{ name: 'Mute Channel 5', variableId: 'Audio.mute_channel_5' },
		{ name: 'Mute Channel 6', variableId: 'Audio.mute_channel_6' },
		{ name: 'Mute Channel 7', variableId: 'Audio.mute_channel_7' },
		{ name: 'Mute Channel 8', variableId: 'Audio.mute_channel_8' },
		{ name: 'Mute Channel 9', variableId: 'Audio.mute_channel_9' },
		{ name: 'Mute Channel 10', variableId: 'Audio.mute_channel_10' },
		{ name: 'Mute Channel 11', variableId: 'Audio.mute_channel_11' },
		{ name: 'Mute Channel 12', variableId: 'Audio.mute_channel_12' },
		{ name: 'Mute Channel 13', variableId: 'Audio.mute_channel_13' },
		{ name: 'Mute Channel 14', variableId: 'Audio.mute_channel_14' },
		{ name: 'Mute Channel 15', variableId: 'Audio.mute_channel_15' },
		{ name: 'Mute Channel 16', variableId: 'Audio.mute_channel_16' },
	])

	const inputSources: { name: string; variableId: string }[] = []
	instance.KairosObj.INPUTS.forEach((INPUT) => {
		inputSources.push({ name: `Source ${INPUT.name} name`, variableId: inputVariableId(INPUT.name) })
	})

	const auxSources: { name: string; variableId: string }[] = []
	const auxNames: { name: string; variableId: string }[] = []
	instance.KairosObj.AUX.forEach((AUX) => {
		auxSources.push({ name: `Source in ${AUX.name}`, variableId: `${auxVariableId(AUX.name)}.source` })
		auxNames.push({ name: `AUX ${AUX.name} name`, variableId: auxVariableId(AUX.name) })
	})

	const layerSources: { name: string; variableId: string }[] = []
	instance.combinedLayerArray.forEach((LAYER) => {
		layerSources.push({
			name: `SourceA in ${LAYER.sceneName}.${LAYER.layerName}`,
			variableId: `${layerVariableId(LAYER.sceneName, LAYER.layerName)}.sourceA`,
		})
		layerSources.push({
			name: `SourceB in ${LAYER.sceneName}.${LAYER.layerName}`,
			variableId: `${layerVariableId(LAYER.sceneName, LAYER.layerName)}.sourceB`,
		})
	})
	const playerRepeat: { name: string; variableId: string }[] = []
	instance.KairosObj.PLAYERS.forEach((PLAYER) => {
		playerRepeat.push({ name: `${PLAYER.player} in repeat mode`, variableId: `Player.${PLAYER.player}.repeat` })
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
	instance.setVariableDefinitions(variableDefinitions)

	const newVariables: CompanionVariableValues = {}

	instance.combinedLayerArray.forEach((LAYER) => {
		newVariables[`${layerVariableId(LAYER.sceneName, LAYER.layerName)}.sourceA`] = LAYER.sourceA
		newVariables[`${layerVariableId(LAYER.sceneName, LAYER.layerName)}.sourceB`] = LAYER.sourceB
	})
	instance.KairosObj.AUX.forEach((AUX) => {
		newVariables[`${auxVariableId(AUX.name)}.source`] = AUX.source
		newVariables[auxVariableId(AUX.name)] = AUX.name
	})
	// PLAYERS
	instance.KairosObj.PLAYERS.forEach((PLAYER) => {
		newVariables[`Player.${PLAYER.player}.repeat`] = PLAYER.repeat == 0 ? 'repeat off' : 'repeat on'
	})
	// INPUTS
	instance.KairosObj.INPUTS.forEach((INPUT) => {
		newVariables[inputVariableId(INPUT.name)] = INPUT.name
	})
	// AUDIO
	newVariables['Audio.mute_master_audio'] = instance.KairosObj.audio_master_mute == 0 ? 'unmuted' : 'muted'
	for (let index = 0; index < 16; index++) {
		if (instance.KairosObj.AUDIO_CHANNELS[index] == undefined) continue
		newVariables[`Audio.mute_channel_${index + 1}`] =
			instance.KairosObj.AUDIO_CHANNELS[index].mute == 0 ? 'unmuted' : 'muted'
	}
	instance.setVariableValues(newVariables)
}
