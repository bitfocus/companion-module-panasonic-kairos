import {
	ResponseError,
	protocolDecodeStr,
	refSceneTransition,
	refToPath,
	type KairosConnection,
} from 'kairos-connection'
import { macroRef, sceneRef } from './refs.js'
import type { MixerState } from './state.js'

type Lists = Pick<
	MixerState,
	'scenes' | 'layers' | 'snapshots' | 'sceneMacros' | 'transitions' | 'macros' | 'mediaStills' | 'panelMacros'
>
/** What discovery lists: the mixer's lists, and every AUX output's fixed name */
export type Discovered = Lists & { auxSlots: string[] }

/** Where KAIROS keeps the profiles of each kind of control panel, whose macros can be played */
const PANEL_PROFILES = ['PANELPROFILES', 'CPANELPROFILES', 'SPANELPROFILES']

/** A folder path as the module keeps it (`Templates/`), from its protocol path parts */
const folderOf = (parts: string[]): string => parts.map((part) => `${part}/`).join('')

/** KAIROS answers `Error` for a path it doesn't have, which is listed as `value`. Anything else, such as a timeout, fails. */
const ifMissing =
	<T>(value: T) =>
	(error: unknown): T => {
		if (error instanceof ResponseError) return value
		throw error
	}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error))

/**
 * Lists the scenes, with their layers, snapshots, macros and transitions, the global and panel macros, the media stills
 * and the AUX outputs, over TCP. Folders of scenes and of macros are listed into; a scene is what has layers, a macro
 * what has nothing in it.
 *
 * A list that can't be read, e.g. because the mixer didn't answer in time, keeps what `previous` had for it, as does a
 * scene whose contents can't be read, so that a slow answer doesn't remove anything.
 */
export async function discover(
	connection: KairosConnection,
	previous: Discovered,
): Promise<{ found: Discovered; errors: string[] }> {
	const list = async (path: string) => connection.getList(path).catch(ifMissing<string[]>([]))
	const nameOf = (path: string) => protocolDecodeStr(path.split('.').at(-1) ?? path)
	const errors: string[] = []
	const orPrevious = async <T>(what: string, read: () => Promise<T>, fallback: T): Promise<T> => {
		try {
			return await read()
		} catch (error) {
			errors.push(`Unable to list ${what}: ${errorMessage(error)}`)
			return fallback
		}
	}

	const scenes = await orPrevious(
		'scenes',
		async () => {
			const found: Discovered['scenes'] = []
			const walk = async (path: string, folder: string[]): Promise<void> => {
				const children = await list(path)
				if (children.includes(`${path}.Layers`)) {
					found.push({ name: nameOf(path), path: folderOf(folder) })
					return
				}
				for (const child of children) await walk(child, [...folder, ...(path === 'SCENES' ? [] : [nameOf(path)])])
			}
			await walk('SCENES', [])
			return found
		},
		previous.scenes,
	)

	const layers: Discovered['layers'] = []
	const snapshots: Discovered['snapshots'] = []
	const sceneMacros: Discovered['sceneMacros'] = []
	const transitions: Discovered['transitions'] = []
	for (const scene of scenes) {
		const ref = sceneRef(scene.path, scene.name)
		const inScene = (item: { path: string; sceneName: string }) =>
			item.path === scene.path && item.sceneName === scene.name
		const contents = await orPrevious(
			`the contents of scene ${scene.path}${scene.name}`,
			async () => {
				const sceneLayers: Discovered['layers'] = []
				for (const layer of await connection.listSceneLayers(ref, true).catch(ifMissing([]))) {
					const presetEnabled = await connection
						.getAttribute(`${refToPath(layer)}.preset_enabled`)
						.catch(ifMissing('0'))
					sceneLayers.push({
						path: scene.path,
						sceneName: scene.name,
						layerName: layer.layerPath.join('/'),
						ref: layer,
						// A layer has a B bus where its preset bus is enabled; TCP reports BLACK for one that doesn't exist
						hasSourceB: presetEnabled === '1',
					})
				}
				const sceneSnapshots = (await connection.listSceneSnapshots(ref).catch(ifMissing([]))).map((snapshot) => ({
					name: snapshot.snapshotPath.join('/'),
					sceneName: scene.name,
					path: scene.path,
				}))
				const macros = (await list(`${refToPath(ref)}.Macros`)).map((macro) => ({
					sceneName: scene.name,
					path: scene.path,
					macroName: nameOf(macro),
				}))
				const sceneTransitions = (await list(`${refToPath(ref)}.Transitions`)).map((transition) => ({
					sceneName: scene.name,
					path: scene.path,
					name: nameOf(transition),
					ref: refSceneTransition(ref, [nameOf(transition)]),
				}))
				return { layers: sceneLayers, snapshots: sceneSnapshots, macros, transitions: sceneTransitions }
			},
			{
				layers: previous.layers.filter(inScene),
				snapshots: previous.snapshots.filter(inScene),
				macros: previous.sceneMacros.filter(inScene),
				transitions: previous.transitions.filter(inScene),
			},
		)
		layers.push(...contents.layers)
		snapshots.push(...contents.snapshots)
		sceneMacros.push(...contents.macros)
		transitions.push(...contents.transitions)
	}

	const macros = await orPrevious(
		'global macros',
		async () => {
			const macroRefs = await connection.listMacros(undefined, true).catch(ifMissing([]))
			const isFolder = (path: string[]) =>
				macroRefs.some(
					(other) => other.macroPath.length > path.length && path.every((part, i) => other.macroPath[i] === part),
				)
			return macroRefs
				.filter((macro) => !isFolder(macro.macroPath))
				.map((macro) => {
					const path = folderOf(macro.macroPath.slice(0, -1))
					return { path, name: macro.name, ref: macroRef(path, macro.name) }
				})
		},
		previous.macros,
	)

	const mediaStills = await orPrevious(
		'media stills',
		async () =>
			(await connection.listMediaStills(undefined, true).catch(ifMissing([]))).map((still) => refToPath(still)),
		previous.mediaStills,
	)

	// Every macro on the panel, compact panel and S panel profiles (`PANELPROFILES.Profile1.PanelMacros.Rec-1`). Folders
	// of macros are listed into; an item with nothing in it is a macro.
	const panelMacros = await orPrevious(
		'panel macros',
		async () => {
			const found: Discovered['panelMacros'] = []
			const walk = async (path: string): Promise<void> => {
				const items = await list(path)
				if (items.length === 0) {
					const [root, profile, , ...name] = path.split('.').map(protocolDecodeStr)
					found.push({ id: [root, profile, ...name].join('/'), path })
				}
				for (const item of items) await walk(item)
			}
			for (const root of PANEL_PROFILES)
				for (const profile of await list(root))
					for (const item of await list(`${profile}.PanelMacros`)) await walk(item)
			return found
		},
		previous.panelMacros,
	)

	const auxSlots = await orPrevious(
		'AUXes',
		async () => (await connection.listAuxes().catch(ifMissing([]))).map((aux) => refToPath(aux)),
		previous.auxSlots,
	)

	return {
		found: { scenes, layers, snapshots, sceneMacros, transitions, macros, mediaStills, panelMacros, auxSlots },
		errors,
	}
}
