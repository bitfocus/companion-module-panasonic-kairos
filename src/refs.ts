import {
	parseAnySourceRef,
	protocolEncodeStr,
	refAudioPlayer,
	refAudioMixerChannel,
	refClipPlayer,
	refMacro,
	refMatte,
	refRamRecorder,
	refScene,
	refSceneLayer,
	refSourceBase,
	refSourceInt,
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

/** The id the layer feedbacks use for a layer, e.g. `/Templates/2Box/Background` */
export const layerFeedbackId = (layer: Layer): string =>
	`/${sceneFullName(layer.path, layer.sceneName)}/${layer.layerName}`

/**
 * Finds a layer by its feedback id, or by the id stored before scenes in folders were told apart (`/2Box/Background`)
 */
export const findLayerByFeedbackId = (layers: Layer[], id: string): Layer | undefined =>
	layers.find((layer) => layerFeedbackId(layer) === id) ??
	layers.find((layer) => `/${layer.sceneName}/${layer.layerName}` === id)

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

const protocolDecode = (value: string): string =>
	value.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))

// REST names the RAM recorders RAM1..8, TCP RR1..8
const REST_RAM_RECORDER = /^RAM(\d+)$/
const TCP_RAM_RECORDER = /^RR(\d+)$/

/**
 * TCP reports a source by its protocol path (`BLACK`, `MATTES.ColA`, `SCENES.Templates.2Box`) where REST, and so the
 * feedbacks and action options, use its name (`Black`, `ColA`, `2Box`)
 */
export function sourceName(value: string, knownNames: string[]): string {
	if (value.startsWith('MEDIA.')) return value
	const ramRecorder = TCP_RAM_RECORDER.exec(value)
	if (ramRecorder) return `RAM${ramRecorder[1]}`
	const last = protocolDecode(value.split('.').at(-1) ?? value)
	return knownNames.find((name) => name.toLowerCase() === last.toLowerCase()) ?? last
}

/**
 * The protocol path for a source REST names, which is what the mixer accepts over TCP
 * @param scenes the scenes from REST, as a scene can be the source of a layer
 */
export function sourcePath(name: string, scenes: { path: string; name: string }[]): string {
	try {
		return refToPath(parseAnySourceRef(name))
	} catch {
		// Not already a protocol path
	}
	const ramRecorder = REST_RAM_RECORDER.exec(name)
	if (ramRecorder) return refToPath(refRamRecorder(Number(ramRecorder[1])))
	const lower = name.toLowerCase()
	if (lower === 'black') return refToPath(refSourceBase(['BLACK']))
	if (lower === 'white') return refToPath(refSourceBase(['WHITE']))
	if (lower === 'colorbar') return refToPath(refSourceInt(['ColorBar']))
	if (lower === 'colorcircle') return refToPath(refSourceInt(['ColorCircle']))
	const scene = scenes.find((s) => s.name === name)
	if (scene) return refToPath(sceneRef(scene.path, scene.name))
	// Every other named source is a colour matte
	return refToPath(refMatte([name]))
}
