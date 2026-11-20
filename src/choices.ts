import { layerFeedbackId, sceneFullName } from './refs.js'
import type { MixerState } from './state.js'
import { sceneActionLabel } from './utils.js'

/**
 * A dropdown choice whose id the mixer needs (often a UUID), with the readable names a user can type instead when the
 * option is switched to an expression. `names` are unique (they include the scene's folder), the first being the
 * canonical one; `shortNames` leave out a folder, so they can be shared by several choices.
 */
export type NamedChoice = { id: string; label: string; names: string[]; shortNames: string[] }

/** What a stored or typed value refers to: an id, or several choices it could mean */
export type ChoiceMatch = { id: string } | { ambiguous: string[] }

/** The UUID ending an id (`Main/macros/<uuid>`), shortened, to tell apart items with the same name */
const shortId = (id: string): string => (id.split('/').at(-1) ?? id).slice(0, 8)

/**
 * The dropdown choices. KAIROS allows two macros (etc) with the same name in the same folder, so labels shared by
 * several choices get the start of the UUID to tell them apart.
 */
export const dropdownChoices = (choices: NamedChoice[]): { id: string; label: string }[] => {
	const counts = new Map<string, number>()
	for (const { label } of choices) counts.set(label, (counts.get(label) ?? 0) + 1)
	return choices.map(({ id, label }) => ({
		id,
		label: (counts.get(label) ?? 0) > 1 ? `${label} (${shortId(id)})` : label,
	}))
}

/**
 * Resolves an id as it is, then a name, then a short name, first matching the case and then in any case. A name shared
 * by several choices resolves to none of them, so that it can't act on the wrong one. A value matching nothing is kept,
 * as it may name something the mixer has that is not polled yet.
 */
export const resolveChoice = (choices: NamedChoice[], value: string): ChoiceMatch => {
	if (choices.some((choice) => choice.id === value)) return { id: value }
	const trimmed = String(value).trim()
	const lower = trimmed.toLowerCase()
	const tiers: ((choice: NamedChoice) => boolean)[] = [
		(choice) => choice.names.includes(trimmed),
		(choice) => choice.shortNames.includes(trimmed),
		(choice) => choice.names.some((name) => name.toLowerCase() === lower),
		(choice) => choice.shortNames.some((name) => name.toLowerCase() === lower),
	]
	for (const matches of tiers) {
		const found = choices.filter(matches)
		if (found.length === 1) return { id: found[0].id }
		if (found.length > 1) {
			const names = found.map((choice) => choice.names[0] ?? choice.label)
			// Items with the same full name can only be told apart by their id
			const distinct = new Set(names).size === names.length
			return { ambiguous: distinct ? names : found.map((choice, i) => `${names[i]} (${choice.id})`) }
		}
	}
	return { id: value }
}

/** The id a value resolves to, or undefined if it is ambiguous */
export const matchedId = (match: ChoiceMatch): string | undefined => ('id' in match ? match.id : undefined)

/** A RAM recorder, clip player or audio player by its name (`RR1`), in any case */
export const findPlayer = (players: MixerState['players'], value: string): MixerState['players'][number] | undefined =>
	players.find((player) => player.name.toLowerCase() === String(value).trim().toLowerCase())

/**
 * An audio channel by its name in any case, or by its number (`3` is `Channel 3`), which an expression can give
 */
export const findAudioChannel = (channels: MixerState['audioChannels'], value: string | number): string | undefined => {
	const name = String(value).trim().toLowerCase()
	return channels.find(
		(channel) => channel.name.toLowerCase() === name || channel.name.toLowerCase() === `channel ${name}`,
	)?.name
}

export const sceneChoices = (state: MixerState): NamedChoice[] =>
	state.scenes.map((scene) => {
		const fullName = sceneFullName(scene.path, scene.name)
		return { id: fullName, label: fullName, names: [fullName], shortNames: [scene.name] }
	})

/** Layers by UUID, which the actions store; the feedbacks store the first name (`/Templates/2Box/Background`) */
export const layerChoices = (state: MixerState): NamedChoice[] =>
	state.layers.map((layer) => {
		const path = layerFeedbackId(layer)
		return {
			id: layer.uuid,
			label: path.slice(1),
			names: [path, path.slice(1)],
			shortNames: [`/${layer.sceneName}/${layer.layerName}`, `${layer.sceneName}/${layer.layerName}`],
		}
	})

export const transitionChoices = (state: MixerState): NamedChoice[] =>
	state.transitions.map((transition) => {
		const sceneName = sceneFullName(transition.path, transition.sceneName)
		return {
			id: `${sceneName}.${transition.name}`,
			label: `${sceneName}/${transition.name}`,
			names: [`${sceneName}/${transition.name}`],
			shortNames: [`${transition.sceneName}.${transition.name}`, `${transition.sceneName}/${transition.name}`],
		}
	})

export const sceneActionChoices = (state: MixerState): NamedChoice[] =>
	state.scenes.flatMap((scene) => {
		const sceneName = sceneFullName(scene.path, scene.name)
		return scene.actions.map((action) => {
			const label = sceneActionLabel(action.name)
			return {
				id: `/${scene.name}/actions/${action.uuid}`,
				label: `${sceneName}/${label}`,
				names: [`${sceneName}/${action.name}`, `${sceneName}/${label}`],
				shortNames: [`${scene.name}/${action.name}`, `${scene.name}/${label}`],
			}
		})
	})

export const macroChoices = (state: MixerState): NamedChoice[] =>
	state.macros.map((macro) => ({
		id: macro.uuid,
		label: `${macro.path}${macro.name}`,
		names: [`${macro.path}${macro.name}`],
		shortNames: [macro.name],
	}))

export const sceneMacroChoices = (state: MixerState): NamedChoice[] =>
	state.sceneMacros.map((macro) => ({
		id: `${macro.sceneName}/macros/${macro.uuid}`,
		label: macro.name,
		names: [`${sceneFullName(macro.path, macro.sceneName)}/${macro.macroName}`, macro.name],
		shortNames: [`${macro.sceneName}/${macro.macroName}`],
	}))

export const snapshotChoices = (state: MixerState): NamedChoice[] =>
	state.snapshots.map((snapshot) => {
		const name = `${sceneFullName(snapshot.path, snapshot.sceneName)}/${snapshot.name}`
		return {
			id: `${snapshot.sceneName}/snapshots/${snapshot.uuid}`,
			label: name,
			names: [name],
			shortNames: [`${snapshot.sceneName}/${snapshot.name}`],
		}
	})

export const multiviewerChoices = (state: MixerState): NamedChoice[] =>
	state.multiviewers.map((multiviewer) => ({
		id: multiviewer.uuid,
		label: multiviewer.name,
		names: [multiviewer.name],
		shortNames: [],
	}))
