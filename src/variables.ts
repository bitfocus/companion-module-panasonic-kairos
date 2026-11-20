import type { CompanionVariableDefinitions, CompanionVariableValues } from '@companion-module/base'
import type KairosInstance from './index.js'
import { auxSource, booleanValue, layerSource } from './state.js'
import { audioMutePath, masterMutePath, playerRepeatPath } from './refs.js'
import { auxCatalog, sourceCatalog } from './choices.js'

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

const muteLabel = (muted: boolean | undefined): string | undefined =>
	muted === undefined ? undefined : muted ? 'muted' : 'unmuted'

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

	// Inputs by their fixed name (`INPUT.NDI1`), so the variable stays the same when one is renamed
	const sources = sourceCatalog(instance.state)
	/** The name a source TCP or REST reports (`NDI1`, or the name it is shown with) is shown with */
	const shownName = (source: string | undefined) =>
		source === undefined ? undefined : sources.resolve(sources.idOf(source))
	const inputSources = sources.choices.map(({ id }) => ({
		name: `Input ${id} - Name`,
		variableId: inputVariableId(id),
	}))

	// AUXes by their fixed name (`AUX.NDI-AUX1`), so the variables stay the same when one is renamed
	const auxIdOf = auxCatalog(instance.state).storedId
	const auxSources: { name: string; variableId: string }[] = []
	const auxNames: { name: string; variableId: string }[] = []
	instance.state.auxes.forEach((AUX) => {
		const id = auxIdOf(AUX.uuid)
		auxSources.push({ name: `AUX ${id} - Source`, variableId: `${auxVariableId(id)}.source` })
		auxSources.push({ name: `AUX ${id} - Sources it accepts`, variableId: `${auxVariableId(id)}.sources` })
		auxNames.push({ name: `AUX ${id} - Name`, variableId: auxVariableId(id) })
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
	const legacyLayerValues: CompanionVariableValues = {}

	for (const layer of instance.state.layers) {
		const id = layerVariableId(layer.sceneName, layer.layerName)
		const sourceA = shownName(layerSource(instance.state, layer, 'sourceA'))
		const sourceB = shownName(layerSource(instance.state, layer, 'sourceB'))
		newVariables[`${id}.sourceA`] = sourceA
		newVariables[`${id}.sourceB`] = sourceB

		// v4.2.2 removed the slash between the scene and layer names.
		const legacyName = `${layer.sceneName}${layer.layerName}`.replace(/[/ ()]/g, '')
		if (sanitizeVariableIdPart(legacyName) === legacyName) {
			legacyLayerValues[`Scene.${legacyName}.sourceA`] = sourceA
			legacyLayerValues[`Scene.${legacyName}.sourceB`] = sourceB
		}
	}
	instance.state.auxes.forEach((AUX) => {
		const id = auxVariableId(auxIdOf(AUX.uuid))
		newVariables[`${id}.source`] = shownName(auxSource(instance.state, AUX))
		// The sources as the Source options store them, as a JSON string: Companion and Buttons flatten a list value to
		// its items' text
		newVariables[`${id}.sources`] = JSON.stringify((AUX.sources ?? []).map((source) => sources.idOf(source)))
		newVariables[id] = AUX.name
	})
	// PLAYERS
	instance.state.players.forEach((PLAYER) => {
		const repeat = booleanValue(instance.state, playerRepeatPath(PLAYER.ref))
		newVariables[`Player.${PLAYER.name}.repeat`] =
			repeat === undefined ? undefined : repeat ? 'repeat on' : 'repeat off'
	})
	// INPUTS
	for (const { id } of sources.choices) newVariables[inputVariableId(id)] = sources.resolve(id)
	// AUDIO
	newVariables['Audio.mute_master_audio'] = muteLabel(booleanValue(instance.state, masterMutePath))
	for (const [index, channel] of instance.state.audioChannels.entries()) {
		newVariables[`Audio.mute_channel_${index + 1}`] = muteLabel(
			booleanValue(instance.state, audioMutePath(channel.name)),
		)
	}
	// Current IDs take precedence if a legacy alias happens to match one.
	instance.setChangedVariableValues({ ...legacyLayerValues, ...newVariables }, definitionsChanged)
}
