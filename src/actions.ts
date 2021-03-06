import { CompanionActionEventInfo, CompanionActionEvent, SomeCompanionInputField } from '../../../instance_skel_types'
import { options } from './utils'
import KairosInstance from './index'

export interface KairosActions {
	// playerControl
	playerControl: KairosAction<PlayerControlCallback>
	macroControl: KairosAction<MacroControlCallback>
	// AUX
	setAUX: KairosAction<SetAUXCallback>
	// mv Recall
	mvRecall: KairosAction<MvRecallCallback>
	// Layer Source Assignment
	setSource: KairosAction<SetSourceCallback>
	setMediaStill: KairosAction<SetMediaStillCallback>
	// Transition
	programCut: KairosAction<ProgramCutCallback>
	programAuto: KairosAction<ProgramAutoCallback>
	//nextTransition: KairosAction<NextTransitionCallback>
	autoTransition: KairosAction<AutoTransitionCallback>
	cutTransition: KairosAction<CutTransitionCallback>
	// Scene Macros
	smacroControl: KairosAction<SmacroControlCallback>
	// Snapshots
	triggerSnapshot: KairosAction<TriggerSnapshotCallback>
	// Audio mixer control
	muteMaster: KairosAction<MuteMasterCallback>
	muteChannel: KairosAction<MuteChannelCallback>
	// Index signature
	[key: string]: KairosAction<any>
}

// Player Control
interface PlayerControlCallback {
	action: 'playerControl'
	options: Readonly<{
		functionID: ''
		player: string
		action: string
	}>
}
interface MacroControlCallback {
	action: 'macroControl'
	options: Readonly<{
		functionID: ''
		macro: string
		action: string
	}>
}
// AUX
interface SetAUXCallback {
	action: 'setAUX'
	options: Readonly<{
		functionID: ''
		aux: string
		source: string
	}>
}
// MV recall
interface MvRecallCallback {
	action: 'mvRecall'
	options: Readonly<{
		functionID: ''
		mv: string
		preset: string
	}>
}
// Layer Source Assignment
interface SetSourceCallback {
	action: 'setSource'
	options: Readonly<{
		layer: string
		sourceAB: string
		source: string
	}>
}
// Layer Source Assignment
interface SetMediaStillCallback {
	action: 'setMediaStill'
	options: Readonly<{
		layer: string
		sourceAB: string
		source: string
	}>
}
// Transition
interface ProgramCutCallback {
	action: 'programCut'
	options: Readonly<{
		scene: string
	}>
}
interface ProgramAutoCallback {
	action: 'programAuto'
	options: Readonly<{
		scene: string
	}>
}
//interface NextTransitionCallback {
//	action: 'nextTransition'
//	options: Readonly<{
//		transition: string
//	}>
//}
interface AutoTransitionCallback {
	action: 'autoTransition'
	options: Readonly<{
		layer: string
	}>
}
interface CutTransitionCallback {
	action: 'cutTransition'
	options: Readonly<{
		layer: string
	}>
}
// Scene Macros
interface SmacroControlCallback {
	action: 'smacroControl'
	options: Readonly<{
	functionID: ''
	smacro: string
	action: string
	}>
}
// Snapshots
interface TriggerSnapshotCallback {
	action: 'triggerSnapshot'
	options: Readonly<{
		snapshot: string
	}>
}
// Audio
interface MuteMasterCallback {
	action: 'muteMaster'
	options: Readonly<{
		mute: number
	}>
}
interface MuteChannelCallback {
	action: 'muteChannel'
	options: Readonly<{
		channel: string
		mute: number
	}>
}
export type ActionCallbacks =
	| MacroControlCallback
	| PlayerControlCallback
	| SetAUXCallback
	| MvRecallCallback
	| SetSourceCallback
	| SetMediaStillCallback
	| ProgramAutoCallback
	| ProgramCutCallback
	| SmacroControlCallback
	| TriggerSnapshotCallback
	| MuteMasterCallback
	| MuteChannelCallback
	//| NextTransitionCallback
	| AutoTransitionCallback
	| CutTransitionCallback

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionInputField, 'default'> & { default: string | number | boolean | null }

// Actions specific to Kairos
export interface KairosAction<T> {
	label: string
	description?: string
	options: InputFieldWithDefault[]
	callback: (
		action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>,
		info: Readonly<CompanionActionEventInfo | null>
	) => void
	subscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
	unsubscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
}

export function getActions(instance: KairosInstance): KairosActions {
	/**
	 * @param action Action callback object
	 * @param _info Unused
	 * @description Sends functions/params from actions that don't require complex logic
	 */

	const sendBasicCommand = (action: Readonly<ActionCallbacks>, _info?: CompanionActionEventInfo | null): void => {
		let functionName: string = action.action

		if ('functionID' in action.options) {
			functionName = action.options.functionID
		}

		if (instance.tcp) instance.tcp.sendCommand(functionName)
	}

	return {
		// Layer Source Assignment
		setSource: {
			label: 'Set Source',
			options: [
				{
					type: 'dropdown',
					label: 'Layer',
					id: 'layer',
					default: instance.combinedLayerArray[0].name,
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
					default: instance.KairosObj.INPUTS[0].shortcut,
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
						? (instance.combinedLayerArray[index].sourceA = action.options.source)
						: (instance.combinedLayerArray[index].sourceB = action.options.source)
				}
				instance.checkFeedbacks('inputSource')

				sendBasicCommand(setSource)
			},
		},
		// Layer Source Assignment
		setMediaStill: {
			label: 'Set Media Still',
			options: [
				{
					type: 'dropdown',
					label: 'Layer',
					id: 'layer',
					default: instance.combinedLayerArray[0].name,
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
					default: instance.KairosObj.MEDIA_STILLS[0],
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
						? (instance.combinedLayerArray[index].sourceA = action.options.source)
						: (instance.combinedLayerArray[index].sourceB = action.options.source)
				}
				instance.checkFeedbacks('inputSource')

				sendBasicCommand(setMediaStill)
			},
		},
		// Transition
		programCut: {
			label: 'Master CUT Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Scene',
					id: 'scene',
					default: instance.KairosObj.SCENES[0].scene,
					choices: instance.KairosObj.SCENES.map((id) => ({ id: id.scene, label: id.scene.slice(7) })),
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
		programAuto: {
			label: 'Master AUTO Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Scene',
					id: 'scene',
					default: instance.KairosObj.SCENES[0].scene,
					choices: instance.KairosObj.SCENES.map((id) => ({ id: id.scene, label: id.scene.slice(7) })),
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
		//nextTransition: {
		//	label: 'Transition - NEXT for Layer',
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
		autoTransition: {
			label: 'AUTO Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: instance.combinedTransitionsArray[0],
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
		cutTransition: {
			label: 'CUT Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: instance.combinedTransitionsArray[0],
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
		setAUX: {
			label: 'Set AUX',
			options: [
				{
					type: 'dropdown',
					label: 'AUX',
					id: 'aux',
					default: instance.KairosObj.AUX[0].aux,
					choices: instance.KairosObj.AUX.map((id) => ({ id: id.aux, label: id.aux })),
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: instance.KairosObj.INPUTS[0].shortcut,
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
				instance.KairosObj.AUX[index].liveSource = action.options.source
				instance.checkFeedbacks('aux')
				instance.variables?.updateVariables()
				sendBasicCommand(setAUX)
			},
		},
		//Control
		playerControl: {
			label: 'RAM/Clip Player action',
			options: [
				{
					type: 'dropdown',
					label: 'Player Source',
					id: 'player',
					default: instance.KairosObj.PLAYERS[0].player,
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
		macroControl: {
			label: 'Macro action',
			options: [
				{
					type: 'dropdown',
					label: 'Macro',
					id: 'macro',
					default: instance.KairosObj.MACROS[0],
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
		mvRecall: {
			label: 'Recall Multiviewer preset',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'preset',
					default: instance.KairosObj.MV_PRESETS[0],
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
		smacroControl: {
			label: 'Scene Macro action',
			options: [
				{
					type: 'dropdown',
					label: 'Scene Macro',
					id: 'smacro',
					default: instance.combinedSmacrosArray[0],
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
		triggerSnapshot: {
			label: 'Trigger Snapshots',
			options: [
				{
					type: 'dropdown',
					label: 'Snapshot',
					id: 'snapshot',
					default: instance.combinedSnapshotsArray[0],
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
		muteMaster: {
			label: 'Audio Mixer Master Mute',
			options: [options.mute],
			callback: (action) => {
				const muteMaster: any = {
					id: 'muteMaster',
					options: {
						//functionID: `Mixer.AudioMixers.AudioMixer.mute=${action.options.mute}`,
						functionID: `AUDIOMIXER.mute=${action.options.mute}`,
					},
				}
				instance.KairosObj.audio_master_mute = action.options.mute
				instance.checkFeedbacks('audioMuteMaster')
				instance.variables?.updateVariables()
				sendBasicCommand(muteMaster)
			},
		},
		muteChannel: {
			label: 'Audio Mixer Channel Mute',
			options: [options.channel, options.mute],
			callback: (action) => {
				const muteChannel: any = {
					id: 'muteChannel',
					options: {
						//functionID: `Mixer.AudioMixers.AudioMixer.${action.options.channel}.mute=${action.options.mute}`,
						functionID: `AUDIOMIXER.${action.options.channel}.mute=${action.options.mute}`,
					},
				}
				let channelNumber = parseInt(action.options.channel.slice(7)) - 1
				instance.KairosObj.AUDIO_CHANNELS[channelNumber].mute = action.options.mute
				instance.checkFeedbacks('audioMuteChannel')
				instance.variables?.updateVariables()
				sendBasicCommand(muteChannel)
			},
		},
		// Custom
		custom: {
			label: 'Send custom command',
			options: [
				{
					label: 'command',
					type: 'textinput',
					id: 'functionID',
					default: '',
				},
			],
			callback: sendBasicCommand,
		},
	}
}
