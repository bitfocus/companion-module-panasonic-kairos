import { refToPath } from 'kairos-connection'
import type {
	AudioPlayerRef,
	ClipPlayerRef,
	MacroRef,
	RamRecorderRef,
	SceneLayerRef,
	SceneTransitionRef,
} from 'kairos-connection'
import { allPlayers } from './refs.js'
import { parseMacroStatus, type SourceAB } from './utils.js'

export type PlayerRef = RamRecorderRef | ClipPlayerRef | AudioPlayerRef

export type MixerState = {
	/** Current TCP readings by protocol path. REST source readings remain in the catalog below. */
	live: Map<string, { value: string; uuid?: string }>
	/** Each layer's source options as protocol paths (`IP1`, `MATTES.ColA`), by the layer's protocol path, from TCP */
	layerSourceOptions: ReadonlyMap<string, string[]>
	/** The name each input is shown with, by its fixed name (`NDI1`), from TCP */
	inputNames: ReadonlyMap<string, string>
	mediaStills: Array<string>
	/** Scenes, from TCP, with their folder path (`Templates/`) */
	scenes: { name: string; path: string }[]
	/** Scene actions, from REST, which TCP doesn't list */
	sceneActions: { sceneName: string; path: string; name: string; uuid: string }[]
	/** Every layer of every scene, from TCP. `restId` is what REST calls it, which older buttons stored. */
	layers: {
		path: string
		sceneName: string
		layerName: string
		ref: SceneLayerRef
		/** Whether the layer has a B (preset) bus */
		hasSourceB: boolean
		restId?: string
	}[]
	/** Macros on the control panel profiles, from TCP: `id` is how options store them, e.g. `PANELPROFILES/Profile1/Rec-1` */
	panelMacros: { id: string; path: string }[]
	/**
	 * Every AUX output in use, by its fixed name (`NDI-AUX1`), with its source options as protocol paths, from TCP.
	 * `restId` is REST's UUID, which older buttons could store.
	 */
	auxes: { slot: string; name: string; sourceOptions: string[]; restId?: string }[]
	/** Global macros, from TCP, with their folder path (`Show/`). `uuid` is REST's, which older buttons stored. */
	macros: { path: string; name: string; ref: MacroRef; uuid?: string }[]
	/** Scene macros, from TCP */
	sceneMacros: { sceneName: string; path: string; macroName: string; uuid?: string }[]
	/** Scene snapshots, from TCP */
	snapshots: { name: string; sceneName: string; path: string; uuid?: string }[]
	/**
	 * What REST calls each layer, macro and snapshot, by full name (`Templates/2Box/Background`), and each AUX, by its
	 * name, merged into the above
	 */
	restIds: Record<'layers' | 'macros' | 'sceneMacros' | 'snapshots' | 'auxes', ReadonlyMap<string, string>>
	multiviewers: {
		index: number
		name: string
		preset: string
		presets: { id: string; name: string; usr: string }[]
		uuid: string
		sdp: string
	}[]
	players: { name: string; ref: PlayerRef }[]
	transitions: { sceneName: string; path: string; name: string; ref: SceneTransitionRef }[]
	audioChannels: { name: string }[]
}

export const emptyMixerState = (): MixerState => ({
	live: new Map(),
	layerSourceOptions: new Map(),
	panelMacros: [],
	inputNames: new Map(),
	mediaStills: [],
	scenes: [],
	sceneActions: [],
	restIds: { layers: new Map(), macros: new Map(), sceneMacros: new Map(), snapshots: new Map(), auxes: new Map() },
	layers: [],
	auxes: [],
	macros: [],
	sceneMacros: [],
	snapshots: [],
	multiviewers: [],
	players: allPlayers(),
	transitions: [],
	audioChannels: Array.from({ length: 16 }, (_, i) => ({ name: `Channel ${i + 1}` })),
})

export function parseBoolean(value: string | undefined): boolean | undefined {
	if (value === '1') return true
	if (value === '0') return false
	return undefined
}

export function booleanValue(state: MixerState, path: string): boolean | undefined {
	return parseBoolean(state.live.get(path)?.value)
}

function liveValue(state: MixerState, path: string, uuid: string): string | undefined {
	const reading = state.live.get(path)
	return reading?.uuid === uuid ? reading.value : undefined
}

/** Gives each item of a list the id REST has for it, replacing the list only if one changed */
function withIds<T extends object, K extends keyof T>(list: T[], field: K, idOf: (item: T) => T[K]): T[] {
	if (list.every((item) => item[field] === idOf(item))) return list
	return list.map((item) => ({ ...item, [field]: idOf(item) }))
}

/** Merges what REST calls each layer, macro, snapshot and AUX into the lists TCP gives */
export function mergeRestIds(state: MixerState): void {
	const { restIds } = state
	const inScene = (item: { path: string; sceneName: string }, name: string) => `${item.path}${item.sceneName}/${name}`
	state.layers = withIds(state.layers, 'restId', (layer) => restIds.layers.get(inScene(layer, layer.layerName)))
	state.macros = withIds(state.macros, 'uuid', (macro) => restIds.macros.get(`${macro.path}${macro.name}`))
	state.sceneMacros = withIds(state.sceneMacros, 'uuid', (macro) =>
		restIds.sceneMacros.get(inScene(macro, macro.macroName)),
	)
	state.snapshots = withIds(state.snapshots, 'uuid', (snapshot) =>
		restIds.snapshots.get(inScene(snapshot, snapshot.name)),
	)
	state.auxes = withIds(state.auxes, 'restId', (aux) => restIds.auxes.get(aux.name))
}

const layersByPath = new WeakMap<MixerState['layers'], ReadonlyMap<string, MixerState['layers'][number]>>()

/** A layer by its protocol path, from a map built once per list of layers, as feedbacks look layers up often */
export function findLayer(state: MixerState, path: string): MixerState['layers'][number] | undefined {
	let byPath = layersByPath.get(state.layers)
	if (!byPath) {
		byPath = new Map(state.layers.map((layer) => [refToPath(layer.ref), layer]))
		layersByPath.set(state.layers, byPath)
	}
	return byPath.get(path)
}

/** A layer's source, as its protocol path, from TCP */
export function layerSource(state: MixerState, layer: MixerState['layers'][number], bus: SourceAB): string | undefined {
	const path = refToPath(layer.ref)
	return liveValue(state, `${path}.${bus}`, path)
}

/** An AUX's source, as its protocol path, from TCP */
export function auxSource(state: MixerState, aux: MixerState['auxes'][number]): string | undefined {
	return liveValue(state, `${aux.slot}.source`, aux.slot)
}

export function macroStatus(state: MixerState, path: string, uuid: string): ReturnType<typeof parseMacroStatus> {
	const value = liveValue(state, `${path}.status`, uuid)
	return value === undefined ? undefined : parseMacroStatus(value)
}
