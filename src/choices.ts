import { layerPath, sceneFullName } from './refs.js'
import type { MixerState } from './state.js'
import { mediaStillLabel, sceneActionLabel } from './utils.js'

/** Tooltips for options whose value is typed exactly as the list stores it */
export const VALUE_TOOLTIPS = {
	source: 'In an expression, give an input by its fixed name, e.g. `IP1`, `NDI1`, or any other source by its name',
	layer: 'In an expression, give the layer as `Scene/Layer`, with any folder, e.g. `Templates/2Box/Background`',
	transition: 'In an expression, give the transition as `Scene/Transition`, with any folder, e.g. `Main/BgdMix`',
	mediaStill: 'In an expression, give the still as `Folder/name`, e.g. `Logos/Intro.rr`',
	sceneAction: 'In an expression, give the action as `Scene/action name`, e.g. `Main/show_logo`',
	macro: 'In an expression, give the macro as `Folder/name`, e.g. `Show/Intro`',
	sceneMacro: 'In an expression, give the macro as `Scene/macro name`, e.g. `Main/Wipe`',
	snapshot: 'In an expression, give the snapshot as `Scene/snapshot name`, e.g. `Main/Snap 1`',
	multiviewer: 'In an expression, give the multiviewer by its fixed name, `MV1` to `MV4`',
} as const

/** Something on the mixer an option can choose */
type Item = {
	/** What the option stores, unless another item has it too */
	name: string
	/** What the mixer is sent, and what this option stored before it stored names */
	target: string
	label: string
	/** Other values that were stored for this item before, matched only where no other item has them */
	aliases?: string[]
}

/**
 * The items of one kind (layers, macros…): what their dropdown lists, and what to send the mixer for a stored or typed
 * value.
 *
 * An item is stored by its name, or by its fixed name where it has one (`IP1`), so that a button works on any KAIROS
 * running the same show. KAIROS allows two items with the same name in the same folder, which have nothing else to tell
 * them apart, so those store their target.
 *
 * A value must match exactly: what the list stores, what it stored before (the target, or an alias). A value matching
 * nothing is sent as it is, as it may be something the mixer has that is not polled yet.
 */
export type Catalog = {
	choices: { id: string; label: string }[]
	/** What to send the mixer for a value */
	resolve: (value: string) => string
	/** What a value is stored as now, so that two values can be compared */
	idOf: (value: string) => string
	/** What an item's target is stored as, for presets to store the same as the dropdowns */
	storedId: (target: string) => string
}

/** The UUID ending a target (`Main/macros/<uuid>`), shortened, to tell apart items with the same name */
const shortId = (target: string): string => (target.split('/').at(-1) ?? target).slice(0, 8)

const countOf = (values: string[]): ((value: string) => number) => {
	const counts = new Map<string, number>()
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
	return (value) => counts.get(value) ?? 0
}

const buildCatalog = (items: Item[]): Catalog => {
	const nameCount = countOf(items.map((item) => item.name))
	const labelCount = countOf(items.map((item) => item.label))
	const entries = items.map((item) => ({ ...item, id: nameCount(item.name) === 1 ? item.name : item.target }))
	type Entry = (typeof entries)[number]

	const byValue = new Map<string, Entry>()
	const aliasCount = countOf(entries.flatMap((entry) => entry.aliases ?? []))
	for (const entry of entries) {
		for (const alias of entry.aliases ?? []) if (aliasCount(alias) === 1) byValue.set(alias, entry)
	}
	for (const entry of entries) byValue.set(entry.target, entry)
	// What the list stores wins over anything else
	for (const entry of entries) byValue.set(entry.id, entry)
	const idByTarget = new Map(entries.map((entry) => [entry.target, entry.id]))

	return {
		choices: entries.map(({ id, target, label }) => ({
			id,
			label: labelCount(label) > 1 ? `${label} (${shortId(target)})` : label,
		})),
		resolve: (value) => byValue.get(value)?.target ?? value,
		idOf: (value) => byValue.get(value)?.id ?? value,
		storedId: (target) => idByTarget.get(target) ?? target,
	}
}

/**
 * Builds a catalog once per state array. The mixer's lists are replaced, not changed, when they are polled, so a
 * catalog is rebuilt only after a poll; feedbacks check against it far more often than that.
 */
const cachedCatalog = <T extends object>(toItems: (source: T) => Item[]): ((source: T) => Catalog) => {
	const cache = new WeakMap<T, Catalog>()
	return (source) => {
		let catalog = cache.get(source)
		if (!catalog) {
			catalog = buildCatalog(toItems(source))
			cache.set(source, catalog)
		}
		return catalog
	}
}

const sourceCache = new WeakMap<
	MixerState['inputs'],
	{ inputPaths: MixerState['inputPaths']; inputNames: MixerState['inputNames']; catalog: Catalog }
>()

/**
 * Sources. Inputs are stored by their fixed name (`NDI1`), which stays the same when they are renamed, and are sent to
 * the mixer by the name they are shown with, as REST takes. The name they used to be stored by, and that routing tools
 * use, is accepted too. Other sources (mattes, scenes, players…) have no fixed name and are stored by their name.
 */
export const sourceCatalog = (state: MixerState): Catalog => {
	const cached = sourceCache.get(state.inputs)
	if (cached?.inputPaths === state.inputPaths && cached.inputNames === state.inputNames) return cached.catalog

	const inputs = state.inputPaths.map((path): Item => {
		const name = state.inputNames.get(path) ?? path
		return { name: path, target: name, label: name === path ? path : `${name} (${path})`, aliases: [name] }
	})
	const inputNames = new Set(inputs.flatMap((input) => [input.name, input.target]))
	const others = state.inputs
		.filter((input) => !inputNames.has(input.name))
		.map((input): Item => ({ name: input.name, target: input.name, label: input.name }))
	const catalog = buildCatalog([...inputs, ...others])
	sourceCache.set(state.inputs, { inputPaths: state.inputPaths, inputNames: state.inputNames, catalog })
	return catalog
}

/** A RAM recorder, clip player or audio player by its fixed name (`RR1`) */
export const findPlayer = (players: MixerState['players'], value: string): MixerState['players'][number] | undefined =>
	players.find((player) => player.name === value)

/** An audio channel by its name (`Channel 3`) */
export const findAudioChannel = (channels: MixerState['audioChannels'], value: string): string | undefined =>
	channels.find((channel) => channel.name === value)?.name

const scenes = cachedCatalog((list: MixerState['scenes']) =>
	list.map((scene): Item => {
		const fullName = sceneFullName(scene.path, scene.name)
		// Scenes in folders used to be stored without the folder
		return { name: fullName, target: fullName, label: fullName, aliases: [scene.name] }
	}),
)
export const sceneCatalog = (state: MixerState): Catalog => scenes(state.scenes)

/**
 * Layers, stored as `Templates/2Box/Background`. The actions used to store the layer's REST id, which is the target, and
 * the feedbacks its path with a leading `/`, before 5.0 without the scene's folder.
 */
const layers = cachedCatalog((list: MixerState['layers']) =>
	list.map((layer): Item => {
		const path = layerPath(layer)
		return {
			name: path,
			target: layer.uuid,
			label: path,
			aliases: [`/${path}`, `/${layer.sceneName}/${layer.layerName}`],
		}
	}),
)
export const layerCatalog = (state: MixerState): Catalog => layers(state.layers)

const transitions = cachedCatalog((list: MixerState['transitions']) =>
	list.map((transition): Item => {
		const sceneName = sceneFullName(transition.path, transition.sceneName)
		// Transitions used to be stored as `Scene.Transition`, before 5.0 without the scene's folder
		return {
			name: `${sceneName}/${transition.name}`,
			target: `${sceneName}.${transition.name}`,
			label: `${sceneName}/${transition.name}`,
			aliases: [`${transition.sceneName}.${transition.name}`],
		}
	}),
)
export const transitionCatalog = (state: MixerState): Catalog => transitions(state.transitions)

/** Still images, stored as `Logos/Intro.rr`, and sent to the mixer, and stored before 5.0, by their TCP path */
const mediaStills = cachedCatalog((list: MixerState['mediaStills']) =>
	list.map((path): Item => ({ name: mediaStillLabel(path), target: path, label: mediaStillLabel(path) })),
)
export const mediaStillCatalog = (state: MixerState): Catalog => mediaStills(state.mediaStills)

const sceneActions = cachedCatalog((list: MixerState['scenes']) =>
	list.flatMap((scene) => {
		const sceneName = sceneFullName(scene.path, scene.name)
		return scene.actions.map((action): Item => ({
			name: `${sceneName}/${action.name}`,
			target: `/${scene.name}/actions/${action.uuid}`,
			label: `${sceneName}/${sceneActionLabel(action.name)}`,
		}))
	}),
)
export const sceneActionCatalog = (state: MixerState): Catalog => sceneActions(state.scenes)

const macros = cachedCatalog((list: MixerState['macros']) =>
	list.map((macro): Item => ({
		name: `${macro.path}${macro.name}`,
		target: macro.uuid,
		label: `${macro.path}${macro.name}`,
	})),
)
export const macroCatalog = (state: MixerState): Catalog => macros(state.macros)

const sceneMacros = cachedCatalog((list: MixerState['sceneMacros']) =>
	list.map((macro): Item => {
		const name = `${sceneFullName(macro.path, macro.sceneName)}/${macro.macroName}`
		return { name, target: `${macro.sceneName}/macros/${macro.uuid}`, label: name }
	}),
)
export const sceneMacroCatalog = (state: MixerState): Catalog => sceneMacros(state.sceneMacros)

const snapshots = cachedCatalog((list: MixerState['snapshots']) =>
	list.map((snapshot): Item => {
		const name = `${sceneFullName(snapshot.path, snapshot.sceneName)}/${snapshot.name}`
		return { name, target: `${snapshot.sceneName}/snapshots/${snapshot.uuid}`, label: name }
	}),
)
export const snapshotCatalog = (state: MixerState): Catalog => snapshots(state.snapshots)

/**
 * Multiviewers, stored by their fixed name (`MV1`), which stays the same when they are renamed. REST numbers them from
 * 0. They used to be stored by UUID, which is the target, and briefly by name.
 */
const multiviewers = cachedCatalog((list: MixerState['multiviewers']) =>
	list.map((multiviewer): Item => {
		const fixedName = `MV${multiviewer.index + 1}`
		return {
			name: fixedName,
			target: multiviewer.uuid,
			label: multiviewer.name === fixedName ? fixedName : `${multiviewer.name} (${fixedName})`,
			aliases: [multiviewer.name],
		}
	}),
)
export const multiviewerCatalog = (state: MixerState): Catalog => multiviewers(state.multiviewers)
