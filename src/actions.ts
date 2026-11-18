import type { CompanionActionDefinitions } from '@companion-module/base'
import { refAudioMixerChannel, refToPath, type KairosConnection } from 'kairos-connection'
import {
	mediaStillLabel,
	multiviewerPresetChoices,
	options,
	resolveMute,
	type MuteValue,
	type SourceAB,
} from './utils.js'
import type KairosInstance from './index.js'
import { layerRef, sceneRef, sourcePath, transitionRef } from './refs.js'
import { updateBasicVariables } from './variables.js'
import { FeedbackId } from './feedback.js'

export enum ActionId {
	runAction = 'runAction',
	setSource = 'setSource',
	forceSource = 'forceSource',
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
type Layer = KairosInstance['combinedLayerArray'][number]

const PLAYER_PREFIX = { RR: 'ramRecorder', CP: 'clipPlayer', AP: 'audioPlayer' } as const
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
} as const
type PlayerTransportMethod =
	`${(typeof PLAYER_PREFIX)[keyof typeof PLAYER_PREFIX]}${(typeof PLAYER_TRANSPORT)[keyof typeof PLAYER_TRANSPORT]}`

/**
 * The command for a RAM recorder, clip player or audio player action (`play`, `repeat=1`, ...) on the player named
 * `RR1`, `CP1`, `AP1`...
 * @returns null when the player or action isn't one the library knows
 */
function playerCommand(player: string, action: string): ((kairos: KairosConnection) => Promise<void>) | null {
	const match = /^(RR|CP|AP)(\d+)$/.exec(player)
	if (!match) return null
	const kind = match[1] as keyof typeof PLAYER_PREFIX
	const index = Number(match[2])

	const repeat = /^repeat=([01])$/.exec(action)
	if (repeat) {
		const props = { repeat: repeat[1] === '1' }
		if (kind === 'RR') return async (kairos) => kairos.updateRamRecorder(index, props)
		if (kind === 'CP') return async (kairos) => kairos.updateClipPlayer(index, props)
		return async (kairos) => kairos.updateAudioPlayer(index, props)
	}
	if (!(action in PLAYER_TRANSPORT)) return null
	const method: PlayerTransportMethod = `${PLAYER_PREFIX[kind]}${PLAYER_TRANSPORT[action as keyof typeof PLAYER_TRANSPORT]}`
	return async (kairos) => kairos[method](index)
}

export type ActionsSchema = {
	[ActionId.runAction]: { options: { action: string } }
	[ActionId.setSource]: { options: LayerSourceOptions }
	[ActionId.forceSource]: { options: LayerSourceOptions }
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
	/**
	 * Send PATCH Request
	 * @param action
	 * @param _info
	 */
	const sendPatchCommand = (action: { patchCommand: string; options: string; body: object }): void => {
		const base64Credentials = Buffer.from(`${instance.config?.username}:${instance.secrets?.password}`).toString(
			'base64',
		)
		try {
			instance.log(
				'debug',
				`Sending PATCH command: http://${instance.config?.host}:${instance.config?.restPort}${action.patchCommand}${
					action.options
				} + ${JSON.stringify(action.body)}`,
			)
			void fetch(
				`http://${instance.config?.host}:${instance.config?.restPort}${action.patchCommand}${action.options}`,
				{
					method: 'PATCH',
					headers: {
						Authorization: `Basic ${base64Credentials}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(action.body),
				},
			).catch((error: unknown) => {
				instance.log('error', `Error sending PATCH command: ${error}`)
			})
		} catch (error) {
			instance.log('error', `Error sending PATCH command: ${error}`)
		}
	}

	const runTcp = (description: string, command: (kairos: KairosConnection) => Promise<unknown>): void => {
		instance.tcp?.run(description, command)
	}

	// Options whose value doesn't match anything the mixer reported (yet) are sent as the command they always were
	const sendLegacyCommand = (command: string): void => {
		instance.tcp?.sendCommand(command)
	}

	const setLayerSource = (layer: Layer, sourceAB: SourceAB, source: string): void => {
		const ref = layerRef(layer)
		const path = sourcePath(source, instance.KairosObj.SCENES)
		runTcp(`set ${layer.sceneName}/${layer.layerName} ${sourceAB} to ${source}`, async (kairos) =>
			// The library has sourceB as read only, which it is on current firmware, so this reports that error
			sourceAB === 'sourceA'
				? kairos.updateSceneLayer(ref, { sourceA: path })
				: kairos.setAttribute(`${refToPath(ref)}.sourceB`, path),
		)
		// Don't wait for the value to return from the mixer, set it directly
		layer[sourceAB] = source
		instance.checkFeedbacks(FeedbackId.inputSource, FeedbackId.inputMediaStill)
	}

	const findScene = (name: string) => instance.KairosObj.SCENES.find((scene) => scene.name === name)
	const findTransition = (id: string) =>
		instance.KairosObj.TRANSITIONS.find((transition) => `${transition.sceneName}.${transition.name}` === id)
	const transitionChoices = instance.KairosObj.TRANSITIONS.map((transition) => ({
		id: `${transition.sceneName}.${transition.name}`,
		label: `${transition.sceneName}/${transition.name}`,
	}))

	const mvPresetChoices = multiviewerPresetChoices(instance.KairosObj.MULTIVIEWERS)
	const actionChoices: { id: string; label: string }[] = []
	instance.KairosObj.SCENES.forEach((scene) => {
		scene.actions.forEach((action) => {
			actionChoices.push({ id: `/${scene.name}/actions/${action.uuid}`, label: `${scene.name}/${action.name}` })
		})
	})

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
					default: '',
					choices: instance.combinedLayerArray.map((item) => ({
						id: item.uuid,
						label: `${item.sceneName}/${item.layerName}`,
					})),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
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
					default: '',
					choices: instance.KairosObj.INPUTS.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			callback: (action) => {
				const setSource: any = {
					patchCommand: '/scenes',
					options: action.options.layer,
					body: { [`${action.options.sourceAB}`]: action.options.source },
				}
				// Don't wait for the value to return from the mixer, set it directly
				const index = instance.combinedLayerArray.findIndex((x) => x.uuid === action.options.layer)
				if (index != -1) {
					if (action.options.sourceAB == 'sourceA') {
						instance.combinedLayerArray[index].sourceA = action.options.source
					} else {
						instance.combinedLayerArray[index].sourceB = action.options.source
					}
				}
				instance.checkFeedbacks(FeedbackId.inputSource)

				sendPatchCommand(setSource)
			},
		},
		[ActionId.forceSource]: {
			name: 'Layers - Set Source (TCP)',
			description: 'Sets a layer source through the TCP protocol',
			options: [
				{
					type: 'dropdown',
					label: 'Scene/Layer',
					id: 'layer',
					default: '',
					choices: instance.combinedLayerArray.map((item) => ({
						id: `${item.sceneName}.Layers.${item.layerName}`,
						label: `${item.sceneName}/${item.layerName}`,
					})),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
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
					default: '',
					choices: instance.KairosObj.INPUTS.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			callback: (action) => {
				const { layer: layerId, sourceAB, source } = action.options
				const layer = instance.combinedLayerArray.find((x) => `${x.sceneName}.Layers.${x.layerName}` === layerId)
				if (layer) setLayerSource(layer, sourceAB, source)
				else sendLegacyCommand(`SCENES.${layerId}.${sourceAB}=${source}`)
			},
		},
		[ActionId.runAction]: {
			name: 'Scenes - Run Action',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'action',
					default: '',
					choices: actionChoices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
				},
			],
			callback: (action) => {
				const runAction: any = {
					patchCommand: '/scenes',
					options: action.options.action,
					body: { state: 'play' },
				}
				sendPatchCommand(runAction)
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
					default: instance.combinedLayerArray[0] ? instance.combinedLayerArray[0].uuid : '',
					choices: instance.combinedLayerArray.map((id) => ({ id: id.uuid, label: `${id.sceneName}/${id.layerName}` })),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
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
					default: instance.KairosObj.MEDIA_STILLS[0] ? instance.KairosObj.MEDIA_STILLS[0] : '1',
					choices: instance.KairosObj.MEDIA_STILLS.map((id) => ({ id, label: mediaStillLabel(id) })),
					allowInvalidValues: true,
				},
			],
			callback: (action) => {
				const layer = instance.combinedLayerArray.find((x) => x.uuid === action.options.layer)
				if (layer) setLayerSource(layer, action.options.sourceAB, action.options.source)
				else instance.log('warn', `Cannot set media still: unknown layer ${action.options.layer}`)
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
					default: instance.KairosObj.SCENES[0] ? instance.KairosObj.SCENES[0].name : '1',
					choices: instance.KairosObj.SCENES.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			callback: (action) => {
				const scene = findScene(action.options.scene)
				if (scene) runTcp(`cut ${scene.name}`, async (kairos) => kairos.sceneCut(sceneRef(scene.path, scene.name)))
				else sendLegacyCommand(`SCENES.${action.options.scene}.cut`)
			},
		},
		[ActionId.programAuto]: {
			name: 'Scenes - Auto Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Scene',
					id: 'scene',
					default: instance.KairosObj.SCENES[0] ? instance.KairosObj.SCENES[0].name : '1',
					choices: instance.KairosObj.SCENES.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			callback: (action) => {
				const scene = findScene(action.options.scene)
				if (scene) runTcp(`auto ${scene.name}`, async (kairos) => kairos.sceneAuto(sceneRef(scene.path, scene.name)))
				else sendLegacyCommand(`SCENES.${action.options.scene}.auto`)
			},
		},
		[ActionId.autoTransition]: {
			name: 'Transitions - Auto',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: transitionChoices[0]?.id ?? '',
					choices: transitionChoices,
					allowInvalidValues: true,
				},
			],
			callback: (action) => {
				const transition = findTransition(action.options.layer)
				if (transition)
					runTcp(`auto transition ${transition.sceneName}/${transition.name}`, async (kairos) =>
						kairos.sceneTransitionTransitionAuto(transitionRef(transition)),
					)
				else sendLegacyCommand(`SCENES.${action.options.layer}.transition_auto`)
			},
		},
		[ActionId.cutTransition]: {
			name: 'Transitions - Cut',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: transitionChoices[0]?.id ?? '',
					choices: transitionChoices,
					allowInvalidValues: true,
				},
			],
			callback: (action) => {
				const transition = findTransition(action.options.layer)
				if (transition)
					runTcp(`cut transition ${transition.sceneName}/${transition.name}`, async (kairos) =>
						kairos.sceneTransitionTransitionCut(transitionRef(transition)),
					)
				else sendLegacyCommand(`SCENES.${action.options.layer}.transition_cut`)
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
					default: '',
					choices: instance.KairosObj.AUX.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '',
					choices: instance.KairosObj.INPUTS.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			callback: (action) => {
				const setAUX: any = {
					patchCommand: '/aux/',
					options: action.options.aux,
					body: { source: action.options.source },
				}
				// Don't wait for the value to return from the mixer, set it directly
				const index = instance.KairosObj.AUX.findIndex((x) => x.name === action.options.aux)
				if (index != -1) {
					instance.KairosObj.AUX[index].source = action.options.source
					instance.checkFeedbacks(FeedbackId.aux)
					updateBasicVariables(instance)
				}
				sendPatchCommand(setAUX)
			},
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
					default: instance.KairosObj.PLAYERS[0] ? instance.KairosObj.PLAYERS[0].player : '1',
					choices: instance.KairosObj.PLAYERS.map((element) => ({ id: element.player, label: element.player })),
				},
				options.playerControl,
			],
			callback: (action) => {
				const { player } = action.options
				const entry = instance.KairosObj.PLAYERS.find((x) => x.player === player)
				const playerAction =
					action.options.action === 'repeat=toggle' ? `repeat=${entry?.repeat === 1 ? 0 : 1}` : action.options.action
				const command = playerCommand(player, playerAction)
				if (command) runTcp(`${player} ${playerAction}`, command)
				else sendLegacyCommand(`${player}.${playerAction}`)

				// Don't wait for the value to return from the mixer, set it directly
				const repeat = /^repeat=([01])$/.exec(playerAction)
				if (repeat && entry) {
					entry.repeat = Number(repeat[1])
					instance.checkFeedbacks(FeedbackId.playerRepeat)
					updateBasicVariables(instance)
				}
			},
		},
		[ActionId.macroControl]: {
			name: 'Macros - Control Global Macro',
			options: [
				{
					type: 'dropdown',
					label: 'Macro',
					id: 'macro',
					default: instance.KairosObj.MACROS[0] ? instance.KairosObj.MACROS[0].uuid : 'none exist',
					choices: instance.KairosObj.MACROS.map((item) => ({ id: item.uuid, label: `${item.path}${item.name}` })),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
				},
				options.macroStateControl,
			],
			callback: (action) => {
				const macroControl: any = {
					patchCommand: '/macros/',
					options: action.options.macro,
					body: { state: action.options.action },
				}
				sendPatchCommand(macroControl)
			},
		},
		[ActionId.macroSceneControl]: {
			name: 'Macros - Control Scene Macro',
			options: [
				{
					type: 'dropdown',
					label: 'Scene Macro',
					id: 'macro',
					default: instance.KairosObj.SCENES_MACROS[0] ? instance.KairosObj.SCENES_MACROS[0].uuid : 'none exist',
					choices: instance.KairosObj.SCENES_MACROS.map((item) => ({
						id: `${item.scene}/macros/${item.uuid}`,
						label: item.name,
					})),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
				},
				options.macroStateControl,
			],
			callback: (action) => {
				const macroControl: any = {
					patchCommand: '/scenes/',
					options: action.options.macro,
					body: { state: action.options.action },
				}
				sendPatchCommand(macroControl)
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
					default: '',
					choices: instance.KairosObj.MULTIVIEWERS.map((item) => ({ id: item.uuid, label: item.name })),
					allowInvalidValues: true,
				},
			],
			callback: (action) => {
				const mvRecall: any = {
					patchCommand: '/multiviewers/',
					options: action.options.mv,
					body: { preset: action.options.preset },
				}

				sendPatchCommand(mvRecall)
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
					default: instance.KairosObj.SNAPSHOTS[0] ? instance.KairosObj.SNAPSHOTS[0].uuid : '',
					choices: instance.KairosObj.SNAPSHOTS.map((item) => ({
						id: `${item.scene}/snapshots/${item.uuid}`,
						label: `${item.scene}/${item.name}`,
					})),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
				},
			],
			callback: (action) => {
				const triggerSnapshot: any = {
					patchCommand: '/scenes/',
					options: action.options.snapshot,
					body: { state: 'recall' },
				}

				sendPatchCommand(triggerSnapshot)
			},
		},
		//Audio
		[ActionId.muteMaster]: {
			name: 'Audio - Mute Master',
			options: [options.mute],
			callback: (action) => {
				const mute = resolveMute(action.options.mute, instance.KairosObj.audio_master_mute === 1)
				runTcp(`${mute ? 'mute' : 'unmute'} master`, async (kairos) => kairos.updateAudioMixerMainBus({ mute }))
				instance.KairosObj.audio_master_mute = mute ? 1 : 0
				instance.checkFeedbacks(FeedbackId.audioMuteMaster)
				updateBasicVariables(instance)
			},
		},
		[ActionId.muteChannel]: {
			name: 'Audio - Mute Channel',
			options: [options.channel, options.mute],
			callback: (action) => {
				const channel = instance.KairosObj.AUDIO_CHANNELS.find((x) => x.channel === action.options.channel)
				if (!channel) return
				const mute = resolveMute(action.options.mute, channel.mute === 1)
				runTcp(`${mute ? 'mute' : 'unmute'} ${channel.channel}`, async (kairos) =>
					kairos.updateAudioMixerChannel(refAudioMixerChannel([channel.channel]), { mute }),
				)
				channel.mute = mute ? 1 : 0
				instance.checkFeedbacks(FeedbackId.audioMuteChannel)
				updateBasicVariables(instance)
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
			callback: (action) => {
				if (!action.options.functionID) return
				instance.tcp?.sendCommand(action.options.functionID)
			},
		},
	}

	return actions
}
