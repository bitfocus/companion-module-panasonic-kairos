import type { CompanionActionDefinitions } from '@companion-module/base'
import { refToPath, type KairosConnection } from 'kairos-connection'
import { multiviewerPresetChoices, options, type MuteValue, type SourceAB } from './utils.js'
import {
	auxCatalog,
	findAudioChannel,
	findPlayer,
	macroCatalog,
	mediaStillCatalog,
	multiviewerCatalog,
	VALUE_TOOLTIPS,
	layerCatalog,
	sceneActionCatalog,
	sceneCatalog,
	sceneMacroCatalog,
	snapshotCatalog,
	sourceCatalog,
	transitionCatalog,
} from './choices.js'
import type KairosInstance from './index.js'
import type { MixerState, PlayerRef } from './state.js'
import { audioMutePath, masterMutePath, playerRepeatPath, sceneFullName, sceneRef, sourcePath } from './refs.js'

export enum ActionId {
	runAction = 'runAction',
	setSource = 'setSource',
	setMediaStill = 'setMediaStill',
	programCut = 'programCut',
	programAuto = 'programAuto',
	autoTransition = 'autoTransition',
	cutTransition = 'cutTransition',
	setAUX = 'setAUX',
	playerControl = 'playerControl',
	macroControl = 'macroControl',
	macroSceneControl = 'macroSceneControl',
	mvRecall = 'mvRecall',
	triggerSnapshot = 'triggerSnapshot',
	muteMaster = 'muteMaster',
	muteChannel = 'muteChannel',
	custom = 'custom',
}

type LayerSourceOptions = { layer: string; sourceAB: SourceAB; source: string }
type Layer = MixerState['layers'][number]

// The library's method names for each kind of player, e.g. ramRecorderPlay
const PLAYER_METHOD_PREFIX = {
	ramRecorder: 'ramRecorder',
	clipPlayer: 'clipPlayer',
	'audio-player': 'audioPlayer',
} as const satisfies Record<PlayerRef['realm'], string>
const PLAYER_TRANSPORT = {
	begin: 'Begin',
	rewind: 'Rewind',
	step_back: 'StepBack',
	reverse: 'Reverse',
	play: 'Play',
	pause: 'Pause',
	step_forward: 'StepForward',
	fast_forward: 'FastForward',
	end: 'End',
	playlist_begin: 'PlaylistBegin',
	playlist_back: 'PlaylistBack',
	playlist_next: 'PlaylistNext',
	playlist_end: 'PlaylistEnd',
} as const
type PlayerTransportMethod =
	`${(typeof PLAYER_METHOD_PREFIX)[PlayerRef['realm']]}${(typeof PLAYER_TRANSPORT)[keyof typeof PLAYER_TRANSPORT]}`

/**
 * The command for a player action (`play`, `rewind`, ...)
 * @returns null when the action isn't one the library knows
 */
function playerCommand(ref: PlayerRef, action: string): ((kairos: KairosConnection) => Promise<void>) | null {
	if (!(action in PLAYER_TRANSPORT)) return null
	const method: PlayerTransportMethod = `${PLAYER_METHOD_PREFIX[ref.realm]}${PLAYER_TRANSPORT[action as keyof typeof PLAYER_TRANSPORT]}`
	return async (kairos) => kairos[method](ref.playerIndex)
}

export type ActionsSchema = {
	[ActionId.runAction]: { options: { action: string } }
	[ActionId.setSource]: { options: LayerSourceOptions }
	[ActionId.setMediaStill]: { options: LayerSourceOptions }
	[ActionId.programCut]: { options: { scene: string } }
	[ActionId.programAuto]: { options: { scene: string } }
	[ActionId.autoTransition]: { options: { layer: string } }
	[ActionId.cutTransition]: { options: { layer: string } }
	[ActionId.setAUX]: { options: { aux: string; source: string } }
	[ActionId.playerControl]: { options: { player: string; action: string } }
	[ActionId.macroControl]: { options: { macro: string; action: string } }
	[ActionId.macroSceneControl]: { options: { macro: string; action: string } }
	[ActionId.mvRecall]: { options: { preset: string; mv: string } }
	[ActionId.triggerSnapshot]: { options: { snapshot: string } }
	[ActionId.muteMaster]: { options: { mute: MuteValue } }
	[ActionId.muteChannel]: { options: { channel: string; mute: MuteValue } }
	[ActionId.custom]: { options: { functionID: string } }
}

// Most dropdowns list scenes, layers, sources etc. that are only known once the mixer has been polled. Their stored
// values are still meaningful before that (or if the mixer is unreachable), so `allowInvalidValues` stops Companion
// from skipping actions whose value is not in the current choices.
export function getActions(instance: KairosInstance): CompanionActionDefinitions<ActionsSchema> {
	const sendPatch = async (prefix: string, target: string, body: object): Promise<void> => {
		if (!target) throw new Error(`Cannot send KAIROS REST PATCH to ${prefix}: no target selected`)
		if (!instance.rest) throw new Error('Cannot send KAIROS REST PATCH: the REST connection is unavailable')
		await instance.rest.patch(`${prefix}${target}`, body)
	}

	const runTcp = async (description: string, command: (kairos: KairosConnection) => Promise<unknown>) =>
		instance.tcp?.run(description, command)

	// Preserve stored paths that aren't currently in the discovery catalog.
	const sendLegacyCommand = async (command: string) => instance.tcp?.sendCommand(command)

	const setLayerSource = async (layer: Layer, sourceAB: SourceAB, source: string) => {
		return runTcp(`set ${layer.sceneName}/${layer.layerName} ${sourceAB} to ${source}`, async (kairos) => {
			const path = sourcePath(source, instance.state.scenes)
			return sourceAB === 'sourceA'
				? kairos.updateSceneLayer(layer.ref, { sourceA: path })
				: kairos.setAttribute(`${refToPath(layer.ref)}.sourceB`, path)
		})
	}

	const scenes = sceneCatalog(instance.state)
	const findScene = (id: string) => instance.state.scenes.find((scene) => sceneFullName(scene.path, scene.name) === id)
	const transitions = transitionCatalog(instance.state)
	const findTransition = (id: string) =>
		instance.state.transitions.find(
			(transition) => `${sceneFullName(transition.path, transition.sceneName)}.${transition.name}` === id,
		)

	const mvPresetChoices = multiviewerPresetChoices(instance.state.multiviewers)
	const sources = sourceCatalog(instance.state)
	const auxes = auxCatalog(instance.state)
	const stills = mediaStillCatalog(instance.state)
	const layers = layerCatalog(instance.state)
	const sceneActions = sceneActionCatalog(instance.state)
	const globalMacros = macroCatalog(instance.state)
	const sceneMacros = sceneMacroCatalog(instance.state)
	const snapshots = snapshotCatalog(instance.state)
	const multiviewers = multiviewerCatalog(instance.state)

	const actions: CompanionActionDefinitions<ActionsSchema> = {
		// Layer Source Assignment
		[ActionId.setSource]: {
			name: 'Layers - Set Source',
			description: 'Sets a layer source through the REST API',
			options: [
				{
					type: 'dropdown',
					label: 'Scene/Layer',
					id: 'layer',
					default: layers.choices[0]?.id ?? '',
					choices: layers.choices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: VALUE_TOOLTIPS.layer,
				},
				{
					type: 'dropdown',
					label: 'Bus',
					id: 'sourceAB',
					default: 'sourceA',
					choices: [
						{ id: 'sourceA', label: 'Source A' },
						{ id: 'sourceB', label: 'Source B' },
					],
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: sources.choices[0]?.id ?? '',
					choices: sources.choices,
					tooltip: VALUE_TOOLTIPS.source,
					allowInvalidValues: true,
				},
			],
			callback: async ({ options: { layer: value, sourceAB, source } }) => {
				const layer = layerCatalog(instance.state).resolve(value)
				return sendPatch('/scenes', layer, { [sourceAB]: sourceCatalog(instance.state).resolve(source) })
			},
		},
		[ActionId.runAction]: {
			name: 'Scenes - Run Action',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'action',
					default: sceneActions.choices[0]?.id ?? '',
					choices: sceneActions.choices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: VALUE_TOOLTIPS.sceneAction,
				},
			],
			callback: async ({ options: { action } }) => {
				const id = sceneActionCatalog(instance.state).resolve(action)
				return sendPatch('/scenes', id, { state: 'play' })
			},
		},
		// Layer Source Assignment
		[ActionId.setMediaStill]: {
			name: 'Layers - Set Media Still',
			options: [
				{
					type: 'dropdown',
					label: 'Scene/Layer',
					id: 'layer',
					default: layers.choices[0]?.id ?? '',
					choices: layers.choices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: VALUE_TOOLTIPS.layer,
				},
				{
					type: 'dropdown',
					label: 'Bus',
					id: 'sourceAB',
					default: 'sourceA',
					choices: [
						{ id: 'sourceA', label: 'Source A' },
						{ id: 'sourceB', label: 'Source B' },
					],
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: stills.choices[0]?.id ?? '',
					choices: stills.choices,
					allowInvalidValues: true,
					tooltip: VALUE_TOOLTIPS.mediaStill,
				},
			],
			callback: async ({ options: { layer: value, sourceAB, source } }) => {
				const id = layerCatalog(instance.state).resolve(value)
				const layer = instance.state.layers.find((entry) => entry.uuid === id)
				if (layer) return setLayerSource(layer, sourceAB, mediaStillCatalog(instance.state).resolve(source))
				instance.log('error', `Cannot set KAIROS media still: layer ${value || '(none selected)'} was not found`)
				return
			},
		},
		// Transition
		[ActionId.programCut]: {
			name: 'Scenes - Cut',
			options: [
				{
					type: 'dropdown',
					label: 'Scene',
					id: 'scene',
					default: scenes.choices[0]?.id ?? '1',
					choices: scenes.choices,
					allowInvalidValues: true,
				},
			],
			callback: async (action) => {
				const id = sceneCatalog(instance.state).resolve(action.options.scene)
				const scene = findScene(id)
				if (scene)
					return runTcp(`cut ${scene.name}`, async (kairos) => kairos.sceneCut(sceneRef(scene.path, scene.name)))
				return sendLegacyCommand(`SCENES.${id}.cut`)
			},
		},
		[ActionId.programAuto]: {
			name: 'Scenes - Auto Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Scene',
					id: 'scene',
					default: scenes.choices[0]?.id ?? '1',
					choices: scenes.choices,
					allowInvalidValues: true,
				},
			],
			callback: async (action) => {
				const id = sceneCatalog(instance.state).resolve(action.options.scene)
				const scene = findScene(id)
				if (scene)
					return runTcp(`auto ${scene.name}`, async (kairos) => kairos.sceneAuto(sceneRef(scene.path, scene.name)))
				return sendLegacyCommand(`SCENES.${id}.auto`)
			},
		},
		[ActionId.autoTransition]: {
			name: 'Transitions - Auto',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: transitions.choices[0]?.id ?? '',
					choices: transitions.choices,
					tooltip: VALUE_TOOLTIPS.transition,
					allowInvalidValues: true,
				},
			],
			callback: async (action) => {
				const id = transitionCatalog(instance.state).resolve(action.options.layer)
				const transition = findTransition(id)
				if (transition)
					return runTcp(`auto transition ${transition.sceneName}/${transition.name}`, async (kairos) =>
						kairos.sceneTransitionTransitionAuto(transition.ref),
					)
				return sendLegacyCommand(`SCENES.${id}.transition_auto`)
			},
		},
		[ActionId.cutTransition]: {
			name: 'Transitions - Cut',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: transitions.choices[0]?.id ?? '',
					choices: transitions.choices,
					tooltip: VALUE_TOOLTIPS.transition,
					allowInvalidValues: true,
				},
			],
			callback: async (action) => {
				const id = transitionCatalog(instance.state).resolve(action.options.layer)
				const transition = findTransition(id)
				if (transition)
					return runTcp(`cut transition ${transition.sceneName}/${transition.name}`, async (kairos) =>
						kairos.sceneTransitionTransitionCut(transition.ref),
					)
				return sendLegacyCommand(`SCENES.${id}.transition_cut`)
			},
		},
		//AUX
		[ActionId.setAUX]: {
			name: 'AUX - Set Source',
			options: [
				{
					type: 'dropdown',
					label: 'AUX',
					id: 'aux',
					default: auxes.choices[0]?.id ?? '',
					choices: auxes.choices,
					allowInvalidValues: true,
					tooltip: VALUE_TOOLTIPS.aux,
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: sources.choices[0]?.id ?? '',
					choices: sources.choices,
					tooltip: VALUE_TOOLTIPS.source,
					allowInvalidValues: true,
				},
			],
			callback: async ({ options: { aux, source } }) =>
				sendPatch('/aux/', encodeURIComponent(auxCatalog(instance.state).resolve(aux)), {
					source: sourceCatalog(instance.state).resolve(source),
				}),
		},
		//Control
		[ActionId.playerControl]: {
			name: 'Players - Control',
			description: 'Controls a RAM recorder, clip player or audio player',
			options: [
				{
					type: 'dropdown',
					label: 'Player',
					id: 'player',
					default: instance.state.players[0]?.name ?? '1',
					choices: instance.state.players.map(({ name }) => ({ id: name, label: name })),
					allowInvalidValues: true,
				},
				options.playerControl,
			],
			callback: async ({ options: { player, action } }) => {
				const entry = findPlayer(instance.state.players, player)
				if (action === 'repeat=toggle' || action === 'repeat=0' || action === 'repeat=1') {
					if (!entry) {
						instance.log('error', `Cannot set KAIROS player repeat: player ${player} was not found`)
						return
					}
					const repeat = action === 'repeat=toggle' ? 'toggle' : action === 'repeat=1'
					return instance.tcp?.setBoolean(playerRepeatPath(entry.ref), repeat, `set repeat on ${player} to ${repeat}`)
				}
				const command = entry ? playerCommand(entry.ref, action) : null
				return command ? runTcp(`${action} on ${player}`, command) : sendLegacyCommand(`${player}.${action}`)
			},
		},
		[ActionId.macroControl]: {
			name: 'Macros - Control Global Macro',
			options: [
				{
					type: 'dropdown',
					label: 'Macro',
					id: 'macro',
					default: globalMacros.choices[0]?.id ?? '',
					choices: globalMacros.choices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: VALUE_TOOLTIPS.macro,
				},
				options.macroStateControl,
			],
			callback: async ({ options: { macro, action } }) => {
				const id = macroCatalog(instance.state).resolve(macro)
				return sendPatch('/macros/', id, { state: action })
			},
		},
		[ActionId.macroSceneControl]: {
			name: 'Macros - Control Scene Macro',
			options: [
				{
					type: 'dropdown',
					label: 'Scene Macro',
					id: 'macro',
					default: sceneMacros.choices[0]?.id ?? '',
					choices: sceneMacros.choices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: VALUE_TOOLTIPS.sceneMacro,
				},
				options.macroStateControl,
			],
			callback: async ({ options: { macro, action } }) => {
				const id = sceneMacroCatalog(instance.state).resolve(macro)
				return sendPatch('/scenes/', id, { state: action })
			},
		},
		// Recall MV presets
		[ActionId.mvRecall]: {
			name: 'Multiviewers - Recall Preset',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'preset',
					default: mvPresetChoices[0]?.id ?? '',
					choices: mvPresetChoices,
					allowInvalidValues: true,
				},
				{
					type: 'dropdown',
					label: 'Multiviewer',
					id: 'mv',
					default: multiviewers.choices[0]?.id ?? '',
					choices: multiviewers.choices,
					allowInvalidValues: true,
					tooltip: VALUE_TOOLTIPS.multiviewer,
				},
			],
			callback: async ({ options: { mv, preset } }) => {
				const id = multiviewerCatalog(instance.state).resolve(mv)
				return sendPatch('/multiviewers/', id, { preset })
			},
		},
		// Snapshots
		[ActionId.triggerSnapshot]: {
			name: 'Snapshots - Recall',
			options: [
				{
					type: 'dropdown',
					label: 'Snapshot',
					id: 'snapshot',
					default: snapshots.choices[0]?.id ?? '',
					choices: snapshots.choices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: VALUE_TOOLTIPS.snapshot,
				},
			],
			callback: async ({ options: { snapshot } }) => {
				const id = snapshotCatalog(instance.state).resolve(snapshot)
				return sendPatch('/scenes/', id, { state: 'recall' })
			},
		},
		//Audio
		[ActionId.muteMaster]: {
			name: 'Audio - Mute Master',
			options: [options.mute],
			callback: async ({ options: { mute } }) =>
				instance.tcp?.setBoolean(masterMutePath, mute === 'toggle' ? mute : mute === 1, 'set master mute'),
		},
		[ActionId.muteChannel]: {
			name: 'Audio - Mute Channel',
			options: [options.channel, options.mute],
			callback: async ({ options: { channel: value, mute } }) => {
				const channel = findAudioChannel(instance.state.audioChannels, value)
				if (!channel) {
					instance.log('error', `Cannot set KAIROS channel mute: channel ${value} was not found`)
					return
				}
				return instance.tcp?.setBoolean(
					audioMutePath(channel),
					mute === 'toggle' ? mute : mute === 1,
					`set mute on ${channel}`,
				)
			},
		},
		// Custom
		[ActionId.custom]: {
			name: 'Advanced - Send Custom Command',
			description: 'Sends a raw protocol command, e.g. SCENES.Main.cut',
			options: [
				{
					label: 'Command',
					type: 'textinput',
					id: 'functionID',
					default: '',
					useVariables: true,
				},
			],
			callback: async (action) => {
				if (!action.options.functionID) return
				return sendLegacyCommand(action.options.functionID)
			},
		},
	}

	return actions
}
