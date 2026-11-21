import {
	isAnyInputRef,
	parseAnySourceRef,
	protocolDecodeStr,
	protocolEncodeStr,
	refAudioPlayer,
	refAudioMixerChannel,
	refClipPlayer,
	refMacro,
	refRamRecorder,
	refScene,
	refSceneLayer,
	refToPath,
	type MacroRef,
	type SceneLayerRef,
	type SceneRef,
} from 'kairos-connection'
import type { MixerState, PlayerRef } from './state.js'

type SceneMacro = MixerState['sceneMacros'][number]
type Layer = MixerState['layers'][number]

/** Splits a REST folder path (`Folder/Sub/`) into its parts */
const folderParts = (path: string | undefined): string[] => (path ?? '').split('/').filter((part) => part !== '')

/**
 * A scene's name with its folder, e.g. `Templates/2Box`, which tells apart scenes with the same name in different
 * folders
 */
export const sceneFullName = (path: string | undefined, sceneName: string): string => `${path ?? ''}${sceneName}`

/** A layer's full name, with its scene's folder, e.g. `Templates/2Box/Background` */
export const layerPath = (layer: Layer): string => `${sceneFullName(layer.path, layer.sceneName)}/${layer.layerName}`

export const sceneRef = (path: string | undefined, sceneName: string): SceneRef =>
	refScene([...folderParts(path), sceneName])

export const layerRef = (scenePath: string | undefined, sceneName: string, layerName: string): SceneLayerRef =>
	refSceneLayer(sceneRef(scenePath, sceneName), [layerName])

/** A global macro, from its REST folder path (`Folder/`) and name */
export const macroRef = (path: string | undefined, name: string): MacroRef => refMacro([...folderParts(path), name])

export const masterMutePath = 'AUDIOMIXER.mute'
export const audioMutePath = (name: string): string => `${refToPath(refAudioMixerChannel([name]))}.mute`
export const playerRepeatPath = (ref: PlayerRef): string => `${refToPath(ref)}.repeat`

const playerRange = <Ref extends PlayerRef>(count: number, ref: (index: number) => Ref): Ref[] =>
	Array.from({ length: count }, (_, i) => ref(i + 1))

/** Every RAM recorder, clip player and audio player, named as the protocol names them (`RR1`, `CP1`, `AP1`...) */
export const allPlayers = (): MixerState['players'] =>
	[...playerRange(8, refRamRecorder), ...playerRange(2, refClipPlayer), ...playerRange(16, refAudioPlayer)].map(
		(ref) => ({ name: refToPath(ref), ref }),
	)

export const sceneMacroPath = (macro: SceneMacro): string =>
	`${refToPath(sceneRef(macro.path, macro.sceneName))}.Macros.${protocolEncodeStr(macro.macroName)}`

/** Whether a source's protocol path is an input's (`IP1`, `NDI1`, `STREAM1`…) */
export function isInputPath(path: string): boolean {
	try {
		return isAnyInputRef(parseAnySourceRef(path))
	} catch {
		return false
	}
}

/** Sources stored by the name REST gave them, which differs from their protocol path */
const NAMED_SOURCES: Record<string, string> = {
	BLACK: 'Black',
	WHITE: 'White',
	AUDIOMIXER: 'AudioMixer',
	AUDIOMONITOR: 'MonitorOut',
}

/**
 * What the Source options store for a source TCP lists by its protocol path. Inputs keep their fixed name (`NDI1`);
 * other sources the name they were stored by before (`BLACK` is `Black`, `RR1` is `RAM1`, `MATTES.ColA` is `ColA`),
 * except scenes, which get their full name (`SCENES.Templates.2Box` is `Templates/2Box`).
 */
export function sourceId(path: string): string {
	if (isInputPath(path) || path.startsWith('MEDIA.')) return path
	const named = NAMED_SOURCES[path]
	if (named) return named
	const ramRecorder = /^RR(\d+)$/.exec(path)
	if (ramRecorder) return `RAM${ramRecorder[1]}`
	const parts = path.split('.').map(protocolDecodeStr)
	if (parts[0] === 'SCENES') return parts.slice(1).join('/')
	return parts.at(-1) ?? path
}
