import { protocolEncodePath, refMacro, refMediaStill, refSceneSnapshot, refToPath } from 'kairos-connection'
import { isInputPath, layerPath, sceneFullName, sceneMacroPath, sceneRef, sourceId } from './refs.js'
import type { MixerState } from './state.js'
import { mediaStillLabel, sceneActionLabel } from './utils.js'

/** Tooltips for options whose value is typed exactly as the list stores it */
export const VALUE_TOOLTIPS = {
	source:
		'In an expression, give an input by its fixed name, e.g. `IP1`, `NDI1`, or any other source as the list saves it',
	layer: 'In an expression, give the layer as `Scene/Layer`, with any folder, e.g. `Templates/2Box/Background`',
	transition: 'In an expression, give the transition as `Scene/Transition`, with any folder, e.g. `Main/BgdMix`',
	mediaStill: 'In an expression, give the still as `Folder/name`, e.g. `Logos/Intro.rr`',
	sceneAction: 'In an expression, give the action as `Scene/action name`, e.g. `Main/show_logo`',
	macro: 'In an expression, give the macro as `Folder/name`, e.g. `Show/Intro`',
	sceneMacro: 'In an expression, give the macro as `Scene/macro name`, e.g. `Main/Wipe`',
	panelMacro: 'In an expression, give the macro as `Profiles/Profile/macro name`, e.g. `PANELPROFILES/Profile1/Rec-1`',
	snapshot: 'In an expression, give the snapshot as `Scene/snapshot name`, e.g. `Main/Snap 1`',
	multiviewer: 'In an expression, give the multiviewer by its fixed name, `MV1` to `MV4`',
	aux: 'In an expression, give the AUX by its fixed name, e.g. `IP-AUX1`, `NDI-AUX1`',
} as const

/** Something on the mixer an option can choose */
type Item = {
	/** What the option stores, unless another item has it too */
	name: string
	/** What the mixer is sent, and what this option stored before it stored names */
	target: string
	label: string
	/** The name it is shown with in variables, where that differs from `name` (a renamed input's) */
	shown?: string
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
 * nothing may be something the mixer has that is not listed yet, so it is sent as the target its name gives, or as it
 * is.
 */
export type Catalog = {
	choices: { id: string; label: string }[]
	/** What to send the mixer for a value */
	resolve: (value: string) => string
	/** What a value is stored as now, so that two values can be compared */
	idOf: (value: string) => string
	/** The name a value's item is shown with in variables */
	shownName: (value: string) => string
}

/** The UUID ending a target (`Main/macros/<uuid>`), shortened, to tell apart items with the same name */
const shortId = (target: string): string => (target.split('/').at(-1) ?? target).slice(0, 8)

const countOf = (values: string[]): ((value: string) => number) => {
	const counts = new Map<string, number>()
	for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
	return (value) => counts.get(value) ?? 0
}

/**
 * The protocol path a name gives (`Show/Intro` is `MACROS.Show.Intro`), for an item that is not listed yet. A value that
 * is already a protocol path, which starts with one of `prefixes`, or that has too few parts, is sent as it is.
 */
const pathFromName =
	(prefixes: string[], minParts: number, toPath: (parts: string[]) => string) =>
	(value: string): string => {
		const parts = value.split('/')
		if (prefixes.some((prefix) => value.startsWith(prefix)) || parts.length < minParts) return value
		return toPath(parts)
	}

/** @param fallback the target for a value matching nothing, if not the value itself */
const buildCatalog = (items: Item[], fallback: ((value: string) => string) | null): Catalog => {
	const nameCount = countOf(items.map((item) => item.name))
	const labelCount = countOf(items.map((item) => item.label))
	const entries = items.map((item) => ({ ...item, id: nameCount(item.name) === 1 ? item.name : item.target }))
	type Entry = (typeof entries)[number]

	const byValue = new Map<string, Entry>()
	// An item's aliases can repeat each other (a scene with no folder), which mustn't count as another item having them
	const aliasesOf = (entry: Entry) => [...new Set(entry.aliases)]
	const aliasCount = countOf(entries.flatMap(aliasesOf))
	for (const entry of entries) {
		for (const alias of aliasesOf(entry)) if (aliasCount(alias) === 1) byValue.set(alias, entry)
	}
	for (const entry of entries) byValue.set(entry.target, entry)
	// What the list stores wins over anything else
	for (const entry of entries) byValue.set(entry.id, entry)

	return {
		choices: entries.map(({ id, target, label }) => ({
			id,
			label: labelCount(label) > 1 ? `${label} (${shortId(target)})` : label,
		})),
		resolve: (value) => byValue.get(value)?.target ?? (fallback ? fallback(value) : value),
		idOf: (value) => byValue.get(value)?.id ?? value,
		shownName: (value) => {
			const entry = byValue.get(value)
			return entry ? (entry.shown ?? entry.id) : value
		},
	}
}

/**
 * Builds a catalog once per state array. The mixer's lists are replaced, not changed, when they are polled, so a
 * catalog is rebuilt only after a poll; feedbacks check against it far more often than that.
 */
const cachedCatalog = <T extends object>(
	toItems: (source: T) => Item[],
	fallback: ((value: string) => string) | null,
): ((source: T) => Catalog) => {
	const cache = new WeakMap<T, Catalog>()
	return (source) => {
		let catalog = cache.get(source)
		if (!catalog) {
			catalog = buildCatalog(toItems(source), fallback)
			cache.set(source, catalog)
		}
		return catalog
	}
}

const sourceCache = new WeakMap<
	MixerState['layerSourceOptions'],
	{ auxes: MixerState['auxes']; inputNames: MixerState['inputNames']; catalog: Catalog }
>()

/** Every source the layers and AUXes offer, by protocol path (`IP1`, `MATTES.ColA`) */
export const sourcePaths = (state: MixerState): string[] => [
	...new Set([...state.layerSourceOptions.values(), ...state.auxes.map((aux) => aux.sourceOptions)].flat()),
]

/**
 * Sources, from the options TCP lists for each layer and AUX. They are sent to the mixer by protocol path, and stored as
 * `sourceId` gives: inputs by their fixed name (`NDI1`), which stays the same when they are renamed. The name an input
 * is shown with, and a scene's name without its folder, were stored before and are accepted too.
 */
export const sourceCatalog = (state: MixerState): Catalog => {
	const cached = sourceCache.get(state.layerSourceOptions)
	if (cached?.auxes === state.auxes && cached.inputNames === state.inputNames) return cached.catalog

	const catalog = buildCatalog(
		sourcePaths(state).map((path): Item => {
			const id = sourceId(path)
			if (isInputPath(path)) {
				const name = state.inputNames.get(path)
				return {
					name: id,
					target: path,
					label: name && name !== id ? `${name} (${id})` : id,
					shown: name,
					aliases: name ? [name] : [],
				}
			}
			const sceneName = path.startsWith('SCENES.') ? id.split('/').at(-1) : undefined
			return { name: id, target: path, label: id, aliases: sceneName ? [sceneName] : [] }
		}),
		null,
	)
	sourceCache.set(state.layerSourceOptions, { auxes: state.auxes, inputNames: state.inputNames, catalog })
	return catalog
}

/**
 * AUXes, from TCP, stored and sent to the mixer by their fixed name (`NDI-AUX1`), which stays the same when they are
 * renamed. The name and the REST UUID they were stored by before are accepted too.
 */
const auxes = cachedCatalog(
	(list: MixerState['auxes']) =>
		list.map((aux): Item => ({
			name: aux.slot,
			target: aux.slot,
			label: aux.name !== aux.slot ? `${aux.name} (${aux.slot})` : aux.slot,
			shown: aux.name,
			aliases: [aux.name, ...(aux.restId ? [aux.restId] : [])],
		})),
	null,
)
export const auxCatalog = (state: MixerState): Catalog => auxes(state.auxes)

/** A RAM recorder, clip player or audio player by its fixed name (`RR1`) */
export const findPlayer = (players: MixerState['players'], value: string): MixerState['players'][number] | undefined =>
	players.find((player) => player.name === value)

/** An audio channel by its name (`Channel 3`) */
export const findAudioChannel = (channels: MixerState['audioChannels'], value: string): string | undefined =>
	channels.find((channel) => channel.name === value)?.name

/** Scenes, stored as `Templates/2Box`. An action finds a scene that is not listed yet from its name. */
const scenes = cachedCatalog(
	(list: MixerState['scenes']) =>
		list.map((scene): Item => {
			const fullName = sceneFullName(scene.path, scene.name)
			// Scenes in folders used to be stored without the folder
			return { name: fullName, target: fullName, label: fullName, aliases: [scene.name] }
		}),
	null,
)
export const sceneCatalog = (state: MixerState): Catalog => scenes(state.scenes)

/**
 * Layers, stored as `Templates/2Box/Background`. The actions used to store the layer's REST id, which is the target, and
 * the feedbacks its path with a leading `/`. Before 5.0 they left out the scene's folder (`2Box/Background`), which is
 * accepted where no other layer has that name.
 */
const layers = cachedCatalog(
	(list: MixerState['layers']) =>
		list.map((layer): Item => {
			const path = layerPath(layer)
			const withoutFolder = `${layer.sceneName}/${layer.layerName}`
			return {
				name: path,
				target: refToPath(layer.ref),
				label: path,
				aliases: [`/${path}`, `/${withoutFolder}`, withoutFolder, ...(layer.restId ? [layer.restId] : [])],
			}
		}),
	null,
)
export const layerCatalog = (state: MixerState): Catalog => layers(state.layers)

/**
 * Transitions, stored as `Templates/2Box/BgdMix`. They used to be stored as `Scene.Transition`, and before 5.0 without
 * the scene's folder, which is accepted where no other transition has that name. An action finds a transition that is
 * not listed yet from its name.
 */
const transitions = cachedCatalog(
	(list: MixerState['transitions']) =>
		list.map((transition): Item => {
			const sceneName = sceneFullName(transition.path, transition.sceneName)
			return {
				name: `${sceneName}/${transition.name}`,
				target: `${sceneName}.${transition.name}`,
				label: `${sceneName}/${transition.name}`,
				aliases: [`${transition.sceneName}.${transition.name}`, `${transition.sceneName}/${transition.name}`],
			}
		}),
	null,
)
export const transitionCatalog = (state: MixerState): Catalog => transitions(state.transitions)

/** Still images, stored as `Logos/Intro.rr`, and sent to the mixer, and stored before 5.0, by their TCP path */
const mediaStills = cachedCatalog(
	(list: MixerState['mediaStills']) =>
		list.map((path): Item => ({ name: mediaStillLabel(path), target: path, label: mediaStillLabel(path) })),
	pathFromName(['MEDIA.'], 1, (parts) => refToPath(refMediaStill(parts))),
)
export const mediaStillCatalog = (state: MixerState): Catalog => mediaStills(state.mediaStills)

/** Scene actions, from REST, which runs them */
const sceneActions = cachedCatalog(
	(list: MixerState['sceneActions']) =>
		list.map((action): Item => {
			const sceneName = sceneFullName(action.path, action.sceneName)
			return {
				name: `${sceneName}/${action.name}`,
				target: `/${action.sceneName}/actions/${action.uuid}`,
				label: `${sceneName}/${sceneActionLabel(action.name)}`,
			}
		}),
	null,
)
export const sceneActionCatalog = (state: MixerState): Catalog => sceneActions(state.sceneActions)

/**
 * Items controlled over TCP by their protocol path. KAIROS allows two macros or snapshots with the same name in the same
 * folder, which TCP can't tell apart, so those are listed once. The id REST gave them (`restId`), which they were stored
 * by before, is accepted too.
 */
const byPath = <T>(
	list: T[],
	pathOf: (item: T) => string,
	restId: (item: T) => string | undefined,
	item: (entry: T) => Omit<Item, 'target' | 'aliases'>,
) =>
	list
		.filter((entry, i) => list.findIndex((other) => pathOf(other) === pathOf(entry)) === i)
		.map((entry): Item => {
			const id = restId(entry)
			return { ...item(entry), target: pathOf(entry), aliases: id ? [id] : [] }
		})

export const macroPath = (macro: MixerState['macros'][number]): string => refToPath(macro.ref)
export const snapshotPath = (snapshot: MixerState['snapshots'][number]): string =>
	refToPath(refSceneSnapshot(sceneRef(snapshot.path, snapshot.sceneName), [snapshot.name]))

const macros = cachedCatalog(
	(list: MixerState['macros']) =>
		byPath(
			list,
			macroPath,
			(macro) => macro.uuid,
			(macro) => ({
				name: `${macro.path}${macro.name}`,
				label: `${macro.path}${macro.name}`,
			}),
		),
	pathFromName(['MACROS.'], 1, (parts) => refToPath(refMacro(parts))),
)
export const macroCatalog = (state: MixerState): Catalog => macros(state.macros)

/** The last part of a name (`Main/Wipe`) is the item, and the rest its scene, with any folder */
const inSceneFromName = (parts: string[]) => {
	const [sceneName = '', ...folder] = parts.slice(0, -1).reverse()
	return {
		path: folder
			.reverse()
			.map((part) => `${part}/`)
			.join(''),
		sceneName,
		name: parts.at(-1) ?? '',
	}
}

const sceneMacros = cachedCatalog(
	(list: MixerState['sceneMacros']) =>
		byPath(
			list,
			sceneMacroPath,
			(macro) => macro.uuid && `${macro.sceneName}/macros/${macro.uuid}`,
			(macro) => {
				const name = `${sceneFullName(macro.path, macro.sceneName)}/${macro.macroName}`
				return { name, label: name }
			},
		),
	pathFromName(['SCENES.'], 2, (parts) => {
		const { path, sceneName, name } = inSceneFromName(parts)
		return sceneMacroPath({ path, sceneName, macroName: name })
	}),
)
export const sceneMacroCatalog = (state: MixerState): Catalog => sceneMacros(state.sceneMacros)

const snapshots = cachedCatalog(
	(list: MixerState['snapshots']) =>
		byPath(
			list,
			snapshotPath,
			(snapshot) => snapshot.uuid && `${snapshot.sceneName}/snapshots/${snapshot.uuid}`,
			(snapshot) => {
				const name = `${sceneFullName(snapshot.path, snapshot.sceneName)}/${snapshot.name}`
				return { name, label: name }
			},
		),
	pathFromName(['SCENES.'], 2, (parts) => snapshotPath(inSceneFromName(parts))),
)
export const snapshotCatalog = (state: MixerState): Catalog => snapshots(state.snapshots)

const panelMacros = cachedCatalog(
	(list: MixerState['panelMacros']) =>
		list.map((macro): Item => ({ name: macro.id, target: macro.path, label: macro.id })),
	// `PANELPROFILES/Profile1/Rec-1` is `PANELPROFILES.Profile1.PanelMacros.Rec-1`
	pathFromName(['PANELPROFILES.', 'CPANELPROFILES.', 'SPANELPROFILES.'], 3, ([root, profile, ...name]) =>
		protocolEncodePath([root, profile, 'PanelMacros', ...name]),
	),
)
export const panelMacroCatalog = (state: MixerState): Catalog => panelMacros(state.panelMacros)

/**
 * Multiviewers, stored by their fixed name (`MV1`), which stays the same when they are renamed. REST numbers them from
 * 0. They used to be stored by UUID, which is the target, and briefly by name.
 */
const multiviewers = cachedCatalog(
	(list: MixerState['multiviewers']) =>
		list.map((multiviewer): Item => {
			const fixedName = `MV${multiviewer.index + 1}`
			return {
				name: fixedName,
				target: multiviewer.uuid,
				label: multiviewer.name === fixedName ? fixedName : `${multiviewer.name} (${fixedName})`,
				aliases: [multiviewer.name],
			}
		}),
	null,
)
export const multiviewerCatalog = (state: MixerState): Catalog => multiviewers(state.multiviewers)
