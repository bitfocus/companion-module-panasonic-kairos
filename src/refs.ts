import {
	parseAnySourceRef,
	refMatte,
	refRamRecorder,
	refScene,
	refSceneLayer,
	refSceneTransition,
	refSourceBase,
	refSourceInt,
	refToPath,
	type SceneLayerRef,
	type SceneRef,
	type SceneTransitionRef,
} from 'kairos-connection'
import type KairosInstance from './index.js'

type Layer = KairosInstance['combinedLayerArray'][number]
type Transition = KairosInstance['KairosObj']['TRANSITIONS'][number]

export const sceneRef = (path: string | undefined, sceneName: string): SceneRef =>
	refScene([...(path ?? '').split('/').filter((part) => part !== ''), sceneName])

export const layerRef = (layer: Layer): SceneLayerRef =>
	refSceneLayer(sceneRef(layer.path, layer.sceneName), [layer.layerName])

export const transitionRef = (transition: Transition): SceneTransitionRef =>
	refSceneTransition(sceneRef(transition.path, transition.sceneName), [transition.name])

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
