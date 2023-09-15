import { CompanionActionDefinition, CompanionActionDefinitions } from '@companion-module/base'
import { options } from './utils'
import KairosInstance from './index'
import { updateBasicVariables } from './variables';

export enum ActionId {
	setSource = 'setSource',
	setMediaStill = 'setMediaStill',
	programCut = 'programCut',
	programAuto = 'programAuto',
	//nextTransition = 'nextTransition',
	autoTransition = 'autoTransition',
	cutTransition = 'cutTransition',
	setAUX = 'setAUX',
	playerControl = 'playerControl',
	macroControl = 'macroControl',
	mvRecall = 'mvRecall',
	smacroControl = 'smacroControl',
	triggerSnapshot = 'triggerSnapshot',
	muteMaster = 'muteMaster',
	muteChannel = 'muteChannel',
	custom = 'custom',
}

export function getActions(instance: KairosInstance): CompanionActionDefinitions {
	/**
	 * @param action Action callback object
	 * @param _info Unused
	 * @description Sends functions/params from actions that don't require complex logic
	 */

	const sendBasicCommand = (action: { id: string, options: { functionID: any;} }, _info?: CompanionActionDefinition | null): void => {
		let functionName: string = action.id

		if ('functionID' in action.options) {
			functionName = action.options.functionID
		}

		if (instance.rest) instance.rest.sendCommand(functionName)
	}

	const actions: { [id in ActionId]: CompanionActionDefinition | undefined } = {
		// Layer Source Assignment
		[ActionId.setSource]: {
			name: 'Set Source',
			options: [
				{
					type: 'dropdown',
					label: 'Layer',
					id: 'layer',
					default: instance.combinedLayerArray[0] ? instance.combinedLayerArray[0].name : '1',
					choices: instance.combinedLayerArray.map((id) => ({ id: id.name, label: id.name })),
					minChoicesForSearch: 8,
				},
				{
					type: 'dropdown',
					label: 'SourceA/B',
					id: 'sourceAB',
					default: 'sourceA',
					choices: [
						{ id: 'sourceA', label: 'sourceA' },
						{ id: 'sourceB', label: 'sourceB' },
					],
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: instance.KairosObj.INPUTS[0] ? instance.KairosObj.INPUTS[0].shortcut : '1',
					choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.shortcut, label: id.name })),
				},
			],
			callback: (action) => {
				const setSource: any = {
					id: 'setSource',
					options: {
						// functionID: `${action.options.scene}.Layers.${action.options.layer}.${action.options.sourceAB}=${action.options.source}`,
						functionID: `${action.options.layer}.${action.options.sourceAB}=${action.options.source}`,
					},
				}
				// Don't wait for the value to return from the mixer, set it directly
				let index = instance.combinedLayerArray.findIndex((x) => x.name === action.options.layer)
				if (index != -1) {
					action.options.sourceAB == 'sourceA'
						? (instance.combinedLayerArray[index].sourceA = action.options.source as string)
						: (instance.combinedLayerArray[index].sourceB = action.options.source as string)
				}
				instance.checkFeedbacks('inputSource')

				sendBasicCommand(setSource)
			},
		},
		// Layer Source Assignment
		[ActionId.setMediaStill]: {
			name: 'Set Media Still',
			options: [
				{
					type: 'dropdown',
					label: 'Layer',
					id: 'layer',
					default: instance.combinedLayerArray[0] ? instance.combinedLayerArray[0].name : '1',
					choices: instance.combinedLayerArray.map((id) => ({ id: id.name, label: id.name })),
					minChoicesForSearch: 8,
				},
				{
					type: 'dropdown',
					label: 'SourceA/B',
					id: 'sourceAB',
					default: 'sourceA',
					choices: [
						{ id: 'sourceA', label: 'sourceA' },
						{ id: 'sourceB', label: 'sourceB' },
					],
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: instance.KairosObj.MEDIA_STILLS[0] ? instance.KairosObj.MEDIA_STILLS[0] : '1',
					choices: instance.KairosObj.MEDIA_STILLS.map((id) => ({ id, label: id })),
				},
			],
			callback: (action) => {
				const setMediaStill: any = {
					id: 'setMediaStill',
					options: {
						functionID: `${action.options.layer}.${action.options.sourceAB}=${action.options.source}`,
					},
				}
				// Don't wait for the value to return from the mixer, set it directly
				let index = instance.combinedLayerArray.findIndex((x) => x.name === action.options.layer)
				if (index != -1) {
					action.options.sourceAB == 'sourceA'
						? (instance.combinedLayerArray[index].sourceA = action.options.source as string)
						: (instance.combinedLayerArray[index].sourceB = action.options.source as string)
				}
				instance.checkFeedbacks('inputSource')

				sendBasicCommand(setMediaStill)
			},
		},
		// Transition
		[ActionId.programCut]: {
			name: 'Master CUT Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Scene',
					id: 'scene',
					default: instance.KairosObj.SCENES[0] ? instance.KairosObj.SCENES[0].name : '1',
					choices: instance.KairosObj.SCENES.map((id) => ({ id: id.name, label: id.name.slice(7) })),
				},
			],
			callback: (action) => {
				const programCut: any = {
					id: 'programCut',
					options: {
						functionID: `${action.options.scene}.cut`,
					},
				}

				sendBasicCommand(programCut)
			},
		},
		[ActionId.programAuto]: {
			name: 'Master AUTO Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Scene',
					id: 'scene',
					default: instance.KairosObj.SCENES[0] ? instance.KairosObj.SCENES[0].name : '1',
					choices: instance.KairosObj.SCENES.map((id) => ({ id: id.name, label: id.name.slice(7) })),
				},
			],
			callback: (action) => {
				const programAuto: any = {
					id: 'programAuto',
					options: {
						functionID: `${action.options.scene}.auto`,
						scene: action.options.scene,
					},
				}

				sendBasicCommand(programAuto)
			},
		},
		//[ActionId.nextTransition]: {
		//	name: 'Transition - NEXT for Layer',
		//	options: [
		//		{
		//			type: 'dropdown',
		//			label: 'Set next transition',
		//			id: 'transition',
		//			default: instance.combinedTransitionsArray[0],
		//			choices: instance.combinedTransitionsArray.map((id) => ({ id, label: id.slice(7) })),
		//		},
		//	],
		//	callback: (action) => {
		//		const nextTransition: any = {
		//			id: 'nextTransition',
		//			options: {
		//				functionID: `${action.options.transition.slice(0, 11)}.next_transition=${action.options.transition.slice(
		//					24
		//				)}`,
		//			},
		//		}
		//		sendBasicCommand(nextTransition)
		//	},
		//},
		[ActionId.autoTransition]: {
			name: 'AUTO Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: instance.combinedTransitionsArray[0] ? instance.combinedTransitionsArray[0] : '1',
					choices: instance.combinedTransitionsArray.map((id) => ({ id, label: id.slice(7) })),
				},
			],
			callback: (action) => {
				const autoTransition: any = {
					id: 'autoTransition',
					options: {
						functionID: `${action.options.layer}.transition_auto`,
					},
				}
				sendBasicCommand(autoTransition)
			},
		},
		[ActionId.cutTransition]: {
			name: 'CUT Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: instance.combinedTransitionsArray[0] ? instance.combinedTransitionsArray[0] : '1',
					choices: instance.combinedTransitionsArray.map((id) => ({ id, label: id.slice(7) })),
				},
			],
			callback: (action) => {
				const cutTransition: any = {
					id: 'cutTransition',
					options: {
						functionID: `${action.options.layer}.transition_cut`,
					},
				}
				sendBasicCommand(cutTransition)
			},
		},
		//AUX
		[ActionId.setAUX]: {
			name: 'Set AUX',
			options: [
				{
					type: 'dropdown',
					label: 'AUX',
					id: 'aux',
					default: instance.KairosObj.AUX[0] ? instance.KairosObj.AUX[0].aux : '1',
					choices: instance.KairosObj.AUX.map((id) => ({ id: id.aux, label: id.name })),
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: instance.KairosObj.INPUTS[0] ? instance.KairosObj.INPUTS[0].shortcut : '1',
					choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.shortcut, label: id.name })),
				},
			],
			callback: (action) => {
				const setAUX: any = {
					id: 'setAUX',
					options: {
						functionID: `${action.options.aux}.source=${action.options.source}`,
					},
				}
				// Don't wait for the value to return from the mixer, set it directly
				let index = instance.KairosObj.AUX.findIndex((x) => x.aux === action.options.aux)
				instance.KairosObj.AUX[index].liveSource = action.options.source as string
				instance.checkFeedbacks('aux')
				updateBasicVariables(instance)
				sendBasicCommand(setAUX)
			},
		},
		//Control
		[ActionId.playerControl]: {
			name: 'RAM/Clip Player action',
			options: [
				{
					type: 'dropdown',
					label: 'Player Source',
					id: 'player',
					default: instance.KairosObj.PLAYERS[0] ? instance.KairosObj.PLAYERS[0].player : '1',
					choices: instance.KairosObj.PLAYERS.map((element) => ({ id: element.player, label: element.player })),
				},
				options.playerControl,
			],
			callback: (action) => {
				const playerControl: any = {
					id: 'playerControl',
					options: {
						functionID: `${action.options.player}.${action.options.action}`,
					},
				}
				sendBasicCommand(playerControl)
			},
		},
		[ActionId.macroControl]: {
			name: 'Macro action',
			options: [
				{
					type: 'dropdown',
					label: 'Macro',
					id: 'macro',
					default: instance.KairosObj.MACROS[0] ? instance.KairosObj.MACROS[0] : '1',
					choices: instance.KairosObj.MACROS.map((id) => ({ id, label: id.slice(7) })),
					minChoicesForSearch: 8,
				},
				options.macroControl,
			],
			callback: (action) => {
				const macroControl: any = {
					id: 'macroControl',
					options: {
						functionID: `${action.options.macro}.${action.options.action}`,
					},
				}
				sendBasicCommand(macroControl)
			},
		},
		// Recall MV presets
		[ActionId.mvRecall]: {
			name: 'Recall Multiviewer preset',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'preset',
					default: instance.KairosObj.MV_PRESETS[0] ? instance.KairosObj.MV_PRESETS[0] : '1',
					choices: instance.KairosObj.MV_PRESETS.map((id) => ({ id, label: id.slice(10) })),
				},
				options.mvRecall,
			],
			callback: (action) => {
				const mvRecall: any = {
					id: 'mvRecall',
					options: {
						functionID: `${action.options.preset}.${action.options.mv}`,
					},
				}
				sendBasicCommand(mvRecall)
			},
		},
		// Scene Macros
		[ActionId.smacroControl]: {
			name: 'Scene Macro action',
			options: [
				{
					type: 'dropdown',
					label: 'Scene Macro',
					id: 'smacro',
					default: instance.combinedSmacrosArray[0] ? instance.combinedSmacrosArray[0] : '1',
					choices: instance.combinedSmacrosArray.map((id) => ({ id, label: id })),
					minChoicesForSearch: 8,
				},
				options.macroControl,
			],
			callback: (action) => {
				const smacroControl: any = {
					id: 'smacroControl',
					options: {
						functionID: `${action.options.smacro}.${action.options.action}`,
					},
				}
				sendBasicCommand(smacroControl)
			},
		},
		// Snapshots
		[ActionId.triggerSnapshot]: {
			name: 'Trigger Snapshots',
			options: [
				{
					type: 'dropdown',
					label: 'Snapshot',
					id: 'snapshot',
					default: instance.combinedSnapshotsArray[0] ? instance.combinedSnapshotsArray[0] : '1',
					choices: instance.combinedSnapshotsArray.map((id) => ({ id, label: id })),
					minChoicesForSearch: 8,
				},
			],
			callback: (action) => {
				const triggerSnapshot: any = {
					id: 'triggerSnapshot',
					options: {
						functionID: `${action.options.snapshot}.recall`,
					},
				}

				sendBasicCommand(triggerSnapshot)
			},
		},
		//Audio
		[ActionId.muteMaster]: {
			name: 'Audio Mixer Master Mute',
			options: [options.mute],
			callback: (action) => {
				const muteMaster: any = {
					id: 'muteMaster',
					options: {
						//functionID: `Mixer.AudioMixers.AudioMixer.mute=${action.options.mute}`,
						functionID: `AUDIOMIXER.mute=${action.options.mute}`,
					},
				}
				instance.KairosObj.audio_master_mute = action.options.mute as number
				instance.checkFeedbacks('audioMuteMaster')
				updateBasicVariables(instance)
				sendBasicCommand(muteMaster)
			},
		},
		[ActionId.muteChannel]: {
			name: 'Audio Mixer Channel Mute',
			options: [options.channel, options.mute],
			callback: (action) => {
				const muteChannel: any = {
					id: 'muteChannel',
					options: {
						//functionID: `Mixer.AudioMixers.AudioMixer.${action.options.channel}.mute=${action.options.mute}`,
						functionID: `AUDIOMIXER.${action.options.channel}.mute=${action.options.mute}`,
					},
				}
				if (action.options.channel) {
					let channelNumberString = action.options.channel as string
					let channelNumber = parseInt(channelNumberString.slice(7)) - 1
					instance.KairosObj.AUDIO_CHANNELS[channelNumber].mute = action.options.mute as number
					instance.checkFeedbacks('audioMuteChannel')
					updateBasicVariables(instance)
					sendBasicCommand(muteChannel)
				}
			},
		},
		// Custom
		[ActionId.custom]: {
			name: 'Send custom command',
			options: [
				{
					label: 'command',
					type: 'textinput',
					id: 'functionID',
					default: '',
				},
			],
			callback: () => {
				const custom: any = {
					id: 'custom',
					options: {},
				}
				sendBasicCommand(custom)
			},
		},
	}

	return actions
}
