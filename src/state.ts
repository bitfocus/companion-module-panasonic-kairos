import { refToPath } from 'kairos-connection'
import type {
	AudioPlayerRef,
	AuxRef,
	ClipPlayerRef,
	MacroRef,
	RamRecorderRef,
	SceneLayerRef,
	SceneTransitionRef,
} from 'kairos-connection'
import { allPlayers, sourceName } from './refs.js'
import { createInputWithName, parseMacroStatus, type SourceAB } from './utils.js'

export type PlayerRef = RamRecorderRef | ClipPlayerRef | AudioPlayerRef

export const INTERNAL_SOURCES = ['Black', 'White', 'ColorBar', 'ColorCircle'] as const

export type MixerState = {
	/** Current TCP readings by protocol path. REST source readings remain in the catalog below. */
	live: Map<string, { value: string; uuid?: string }>
	/** Every source the layers and AUXes list, by the name they show it with */
	inputs: { index: number; name: string; tally: number; uuid: string; shortcut: string }[]
	/** The inputs' fixed names (`IP1`, `NDI1`), which stay the same when they are renamed */
	inputPaths: string[]
	/** The name each input is shown with, by its fixed name, from TCP. Replaced, not changed, when one is renamed. */
	inputNames: ReadonlyMap<string, string>
	/** Every AUX output's fixed name (`IP-AUX1`, `NDI-AUX1`), from TCP, whether or not it is in use */
	auxSlots: string[]
	/** The name each AUX output is shown with, by its fixed name, from TCP. Replaced, not changed, when one is renamed. */
	auxNames: ReadonlyMap<string, string>
	mediaStills: Array<string>
	scenes: {
		layers: { name: string; sourceA?: string; sourceB?: string; sources: string[]; uuid: string }[]
		name: string
		tally: string
		uuid: string
		path: string
		macros: { color: string; name: string; state: string; uuid: string }[]
		snapshots: { name: string; state: string; uuid: string }[]
		actions: { name: string; state: string; uuid: string }[]
	}[]
	/** Every layer of every scene */
	layers: {
		path: string
		sceneName: string
		layerName: string
		sourceA?: string
		sourceB?: string
		uuid: string
		ref: SceneLayerRef
	}[]
	auxes: { index: string; name: string; source: string; sources: string[]; uuid: string; ref: AuxRef }[]
	macros: {
		color: string
		name: string
		path: string
		state: string
		uuid: string
		ref: MacroRef
	}[]
	sceneMacros: {
		sceneName: string
		/** The scene's folder path, e.g. `Templates/` */
		path: string
		/** The macro's own name, where `name` also has the scene's */
		macroName: string
		color: string
		name: string
		state: string
		uuid: string
	}[]
	snapshots: {
		name: string
		state: string
		uuid: string
		sceneName: string
		/** The scene's folder path, e.g. `Templates/` */
		path: string
	}[]
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
	inputs: INTERNAL_SOURCES.map(createInputWithName),
	inputPaths: [],
	inputNames: new Map(),
	auxSlots: [],
	auxNames: new Map(),
	mediaStills: [],
	scenes: [],
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

function liveSource(state: MixerState, path: string, uuid: string): string | undefined {
	const value = liveValue(state, path, uuid)
	return value === undefined
		? undefined
		: sourceName(
				value,
				state.inputs.map((input) => input.name),
			)
}

export function layerSource(state: MixerState, layer: MixerState['layers'][number], bus: SourceAB): string | undefined {
	return liveSource(state, `${refToPath(layer.ref)}.${bus}`, layer.uuid) ?? layer[bus]
}

export function auxSource(state: MixerState, aux: MixerState['auxes'][number]): string {
	return liveSource(state, `${refToPath(aux.ref)}.source`, aux.uuid) ?? aux.source
}

export function macroStatus(state: MixerState, path: string, uuid: string): ReturnType<typeof parseMacroStatus> {
	const value = liveValue(state, `${path}.status`, uuid)
	return value === undefined ? undefined : parseMacroStatus(value)
}
