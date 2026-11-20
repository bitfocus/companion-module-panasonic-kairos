import { protocolDecodeStr, refToPath, type KairosConnection } from 'kairos-connection'
import { macroRef, sceneRef } from './refs.js'
import type { MixerState } from './state.js'

export type Discovered = Pick<MixerState, 'scenes' | 'layers' | 'snapshots' | 'sceneMacros' | 'macros'>

/** A folder path as the module keeps it (`Templates/`), from its protocol path parts */
const folderOf = (parts: string[]): string => parts.map((part) => `${part}/`).join('')

/**
 * Lists the scenes, their layers, snapshots and macros, and the global macros, over TCP. Folders of scenes and of macros
 * are listed into; a scene is what has layers, a macro what has nothing in it.
 */
export async function discover(connection: KairosConnection): Promise<Discovered> {
	const list = async (path: string) => connection.getList(path).catch((): string[] => [])
	const nameOf = (path: string) => protocolDecodeStr(path.split('.').at(-1) ?? path)

	const scenes: Discovered['scenes'] = []
	const walkScenes = async (path: string, folder: string[]): Promise<void> => {
		const children = await list(path)
		if (children.includes(`${path}.Layers`)) {
			scenes.push({ name: nameOf(path), path: folderOf(folder) })
			return
		}
		for (const child of children) await walkScenes(child, [...folder, ...(path === 'SCENES' ? [] : [nameOf(path)])])
	}
	await walkScenes('SCENES', [])

	const layers: Discovered['layers'] = []
	const snapshots: Discovered['snapshots'] = []
	const sceneMacros: Discovered['sceneMacros'] = []
	for (const scene of scenes) {
		const ref = sceneRef(scene.path, scene.name)
		for (const layer of await connection.listSceneLayers(ref, true)) {
			const presetEnabled = await connection.getAttribute(`${refToPath(layer)}.preset_enabled`).catch(() => '0')
			layers.push({
				path: scene.path,
				sceneName: scene.name,
				layerName: layer.layerPath.join('/'),
				ref: layer,
				// A layer has a B bus where its preset bus is enabled; TCP reports BLACK for one that doesn't exist
				hasSourceB: presetEnabled === '1',
			})
		}
		for (const snapshot of await connection.listSceneSnapshots(ref).catch(() => []))
			snapshots.push({ name: snapshot.snapshotPath.join('/'), sceneName: scene.name, path: scene.path })
		for (const macro of await list(`${refToPath(ref)}.Macros`))
			sceneMacros.push({ sceneName: scene.name, path: scene.path, macroName: nameOf(macro) })
	}

	const macroRefs = await connection.listMacros(undefined, true).catch(() => [])
	const isFolder = (path: string[]) =>
		macroRefs.some(
			(other) => other.macroPath.length > path.length && path.every((part, i) => other.macroPath[i] === part),
		)
	const macros = macroRefs
		.filter((macro) => !isFolder(macro.macroPath))
		.map((macro) => {
			const path = folderOf(macro.macroPath.slice(0, -1))
			return { path, name: macro.name, ref: macroRef(path, macro.name) }
		})

	return { scenes, layers, snapshots, sceneMacros, macros }
}
