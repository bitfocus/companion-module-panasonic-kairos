import type { CompanionActionDefinitions } from '@companion-module/base'
import { refToPath, type KairosConnection } from 'kairos-connection'
import { mediaStillLabel, multiviewerPresetChoices, options, type MuteValue, type SourceAB } from './utils.js'
import {
	dropdownChoices,
	findAudioChannel,
	findPlayer,
	macroChoices,
	multiviewerChoices,
	layerChoices,
	resolveChoice,
	sceneActionChoices,
	sceneChoices,
	sceneMacroChoices,
	snapshotChoices,
	transitionChoices,
	type NamedChoice,
} from './choices.js'
import type KairosInstance from './index.js'
import type { MixerState, PlayerRef } from './state.js'
import { audioMutePath, masterMutePath, playerRepeatPath, sceneFullName, sceneRef, sourcePath } from './refs.js'

const LAYER_TOOLTIP = 'In an expression, a layer can also be given as `Scene/Layer`, e.g. `Main/Background`'
const SCENE_MACRO_TOOLTIP = 'In an expression, a scene macro can also be given as `Scene/macro name`'

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

	/** The id a stored or typed value resolves to, or undefined (logged) if it names more than one */
	const resolve = (choices: NamedChoice[], value: string, what: string): string | undefined => {
		const match = resolveChoice(choices, value)
		if ('id' in match) return match.id
		instance.log(
			'error',
			`Cannot ${what}: "${value}" could be ${match.ambiguous.join(' or ')}, so give its full name or id`,
		)
		return undefined
	}

	// Scenes are chosen by their full name (`Templates/2Box`), or by the bare name stored before scenes in folders were
	// told apart
	const scenes = sceneChoices(instance.state)
	const findScene = (id: string) => instance.state.scenes.find((scene) => sceneFullName(scene.path, scene.name) === id)
	const transitions = transitionChoices(instance.state)
	const findTransition = (id: string) =>
		instance.state.transitions.find(
			(transition) => `${sceneFullName(transition.path, transition.sceneName)}.${transition.name}` === id,
		)

	const mvPresetChoices = multiviewerPresetChoices(instance.state.multiviewers)
	const layers = layerChoices(instance.state)
	const actionChoices = sceneActionChoices(instance.state)
	const globalMacroChoices = macroChoices(instance.state)
	const sceneMacros = sceneMacroChoices(instance.state)
	const snapshots = snapshotChoices(instance.state)
	const multiviewers = multiviewerChoices(instance.state)

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
					default: layers[0]?.id ?? '',
					choices: dropdownChoices(layers),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: LAYER_TOOLTIP,
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
					default: instance.state.inputs[0]?.name ?? '',
					choices: instance.state.inputs.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			callback: async ({ options: { layer: value, sourceAB, source } }) => {
				const layer = resolve(layerChoices(instance.state), value, 'set KAIROS layer source')
				if (layer !== undefined) return sendPatch('/scenes', layer, { [sourceAB]: source })
				return
			},
		},
		[ActionId.runAction]: {
			name: 'Scenes - Run Action',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'action',
					default: actionChoices[0]?.id ?? '',
					choices: dropdownChoices(actionChoices),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: 'In an expression, an action can also be given as `Scene/action name`',
				},
			],
			callback: async ({ options: { action } }) => {
				const id = resolve(sceneActionChoices(instance.state), action, 'run KAIROS scene action')
				if (id !== undefined) return sendPatch('/scenes', id, { state: 'play' })
				return
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
					default: layers[0]?.id ?? '',
					choices: dropdownChoices(layers),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: LAYER_TOOLTIP,
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
					default: instance.state.mediaStills[0] ? instance.state.mediaStills[0] : '1',
					choices: instance.state.mediaStills.map((id) => ({ id, label: mediaStillLabel(id) })),
					allowInvalidValues: true,
				},
			],
			callback: async ({ options: { layer: value, sourceAB, source } }) => {
				const id = resolve(layerChoices(instance.state), value, 'set KAIROS media still')
				if (id === undefined) return
				const layer = instance.state.layers.find((entry) => entry.uuid === id)
				if (layer) return setLayerSource(layer, sourceAB, source)
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
					default: scenes[0]?.id ?? '1',
					choices: dropdownChoices(scenes),
					allowInvalidValues: true,
				},
			],
			callback: async (action) => {
				const id = resolve(sceneChoices(instance.state), action.options.scene, 'cut KAIROS scene')
				if (id === undefined) return
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
					default: scenes[0]?.id ?? '1',
					choices: dropdownChoices(scenes),
					allowInvalidValues: true,
				},
			],
			callback: async (action) => {
				const id = resolve(sceneChoices(instance.state), action.options.scene, 'auto KAIROS scene')
				if (id === undefined) return
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
					default: transitions[0]?.id ?? '',
					choices: dropdownChoices(transitions),
					allowInvalidValues: true,
				},
			],
			callback: async (action) => {
				const id = resolve(transitionChoices(instance.state), action.options.layer, 'auto KAIROS transition')
				if (id === undefined) return
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
					default: transitions[0]?.id ?? '',
					choices: dropdownChoices(transitions),
					allowInvalidValues: true,
				},
			],
			callback: async (action) => {
				const id = resolve(transitionChoices(instance.state), action.options.layer, 'cut KAIROS transition')
				if (id === undefined) return
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
					default: instance.state.auxes[0]?.name ?? '',
					choices: instance.state.auxes.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
					tooltip: "An AUX's UUID also works here, and keeps working if the AUX is renamed",
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: instance.state.inputs[0]?.name ?? '',
					choices: instance.state.inputs.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			callback: async ({ options: { aux, source } }) => sendPatch('/aux/', encodeURIComponent(aux), { source }),
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
					default: globalMacroChoices[0]?.id ?? '',
					choices: dropdownChoices(globalMacroChoices),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: 'In an expression, a macro can also be given by its name',
				},
				options.macroStateControl,
			],
			callback: async ({ options: { macro, action } }) => {
				const id = resolve(macroChoices(instance.state), macro, `${action} KAIROS macro`)
				if (id !== undefined) return sendPatch('/macros/', id, { state: action })
				return
			},
		},
		[ActionId.macroSceneControl]: {
			name: 'Macros - Control Scene Macro',
			options: [
				{
					type: 'dropdown',
					label: 'Scene Macro',
					id: 'macro',
					default: sceneMacros[0]?.id ?? '',
					choices: dropdownChoices(sceneMacros),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: SCENE_MACRO_TOOLTIP,
				},
				options.macroStateControl,
			],
			callback: async ({ options: { macro, action } }) => {
				const id = resolve(sceneMacroChoices(instance.state), macro, `${action} KAIROS scene macro`)
				if (id !== undefined) return sendPatch('/scenes/', id, { state: action })
				return
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
					default: multiviewers[0]?.id ?? '',
					choices: dropdownChoices(multiviewers),
					allowInvalidValues: true,
					tooltip: 'In an expression, a multiviewer can also be given by its name',
				},
			],
			callback: async ({ options: { mv, preset } }) => {
				const id = resolve(multiviewerChoices(instance.state), mv, 'recall KAIROS multiviewer preset')
				if (id !== undefined) return sendPatch('/multiviewers/', id, { preset })
				return
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
					default: snapshots[0]?.id ?? '',
					choices: dropdownChoices(snapshots),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: 'In an expression, a snapshot can also be given as `Scene/snapshot name`',
				},
			],
			callback: async ({ options: { snapshot } }) => {
				const id = resolve(snapshotChoices(instance.state), snapshot, 'recall KAIROS snapshot')
				if (id !== undefined) return sendPatch('/scenes/', id, { state: 'recall' })
				return
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
