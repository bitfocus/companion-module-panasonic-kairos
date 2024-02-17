import { CompanionActionDefinition, CompanionActionDefinitions } from '@companion-module/base'
import { options } from './utils'
import KairosInstance from './index'
import { updateBasicVariables } from './variables'

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
	macroSceneControl = 'macroSceneControl',
	mvRecall = 'mvRecall',
	// smacroControl = 'smacroControl',
	triggerSnapshot = 'triggerSnapshot',
	muteMaster = 'muteMaster',
	muteChannel = 'muteChannel',
	custom = 'custom',
}

export function getActions(instance: KairosInstance): CompanionActionDefinitions {
	/**
	 * Send PATCH Request
	 * @param action
	 * @param _info
	 */
	const sendPatchCommand = (
		action: { patchCommand: string; options: string; body: {} },
		_info?: CompanionActionDefinition | null
	): void => {
		const base64Credentials = Buffer.from(`${instance.config?.username}:${instance.config?.password}`).toString(
			'base64'
		)
		try {
			instance.log(
				'debug',
				`Sending PATCH command: http://${instance.config?.host}:${instance.config?.restPort}${action.patchCommand}${
					action.options
				} + ${JSON.stringify(action.body)}`
			)
			fetch(`http://${instance.config?.host}:${instance.config?.restPort}${action.patchCommand}${action.options}`, {
				method: 'PATCH',
				headers: {
					Authorization: `Basic ${base64Credentials}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(action.body),
			})
		} catch (error) {
			instance.log('error', `Error sending PATCH command: ${error}`)
		}
	}

	const sendSimpleProtocolCommand = (
		action: { id: string; options: { functionID: any } },
		_info?: CompanionActionDefinition | null
	): void => {
		let functionName: string = action.id

		if ('functionID' in action.options) {
			functionName = action.options.functionID
		}
		if (instance.tcp) instance.tcp.sendCommand(functionName)
	}

	let multiviewerPresetChoices: { id: string; label: string }[] = []
	instance.KairosObj.MULTIVIEWERS.forEach((multiviewer) => {
		if (!multiviewer.presets) return
		multiviewer.presets.forEach((preset) => {
			if (!preset) return
			multiviewerPresetChoices.push({ id: preset.id, label: `${multiviewer.name} - ${preset.name}` })
		})
	})

	const actions: { [id in ActionId]: CompanionActionDefinition | undefined } = {
		// Layer Source Assignment
		[ActionId.setSource]: {
			name: 'Set Source',
			options: [
				{
					type: 'dropdown',
					label: 'Scene/Layer',
					id: 'layer',
					default: '',
					choices: instance.combinedLayerArray.map((item) => ({ id: item.uuid, label: item.name })),
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
					default: '',
					choices: instance.KairosObj.INPUTS.map((item) => ({ id: item.name, label: item.name })),
				},
			],
			callback: (action) => {
				const setSource: any = {
					patchCommand: '/scenes',
					options: action.options.layer,
					body: { [`${action.options.sourceAB}`]: action.options.source },
				}
				// Don't wait for the value to return from the mixer, set it directly
				let index = instance.combinedLayerArray.findIndex((x) => x.uuid === action.options.layer)
				if (index != -1) {
					action.options.sourceAB == 'sourceA'
						? (instance.combinedLayerArray[index].sourceA = action.options.source as string)
						: (instance.combinedLayerArray[index].sourceB = action.options.source as string)
				}
				instance.checkFeedbacks('inputSource')

				sendPatchCommand(setSource)
			},
		},
		// Layer Source Assignment
		[ActionId.setMediaStill]: {
			name: 'Set Media Still',
			options: [
				{
					type: 'dropdown',
					label: 'Scene/Layer',
					id: 'layer',
					default: instance.combinedLayerArray[0] ? instance.combinedLayerArray[0].uuid : '',
					choices: instance.combinedLayerArray.map((id) => ({ id: id.uuid, label: id.name })),
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
					choices: instance.KairosObj.MEDIA_STILLS.map((id) => ({ id, label: id.search('&#46;rr')+".rr" ? id.slice(0,-7) : id })),
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
				let index = instance.combinedLayerArray.findIndex((x) => x.uuid === action.options.layer)
				if (index != -1) {
					action.options.sourceAB == 'sourceA'
						? (instance.combinedLayerArray[index].sourceA = action.options.source as string)
						: (instance.combinedLayerArray[index].sourceB = action.options.source as string)
				}
				instance.checkFeedbacks('inputSource')

				sendSimpleProtocolCommand(setMediaStill)
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
					choices: instance.KairosObj.SCENES.map((item) => ({ id: item.name, label: item.name })),
				},
			],
			callback: (action) => {
				const programCut: any = {
					id: 'programCut',
					options: {
						functionID: `SCENES.${action.options.scene}.cut`,
					},
				}

				sendSimpleProtocolCommand(programCut)
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
					choices: instance.KairosObj.SCENES.map((item) => ({ id: item.name, label: item.name })),
				},
			],
			callback: (action) => {
				const programAuto: any = {
					id: 'programAuto',
					options: {
						functionID: `SCENES.${action.options.scene}.auto`,
						scene: action.options.scene,
					},
				}

				sendSimpleProtocolCommand(programAuto)
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
		//		sendSimpleProtocolCommand(nextTransition)
		//	},
		//},
		[ActionId.autoTransition]: {
			name: 'Layer AUTO Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: instance.combinedLayerArray[0] ? instance.combinedLayerArray.map((item) => ({ id: item.name.replace(/\//g,'.').substring(1), label: item.name.replace(/\//g,'.').substring(1) }))[0].id : '',
					choices: instance.combinedLayerArray.map((item) => ({ id: item.name.replace(/\//g,'.').substring(1), label: item.name.replace(/\//g,'.').substring(1) })),
				},
			],
			callback: (action) => {
				const autoTransition: any = {
					id: 'autoTransition',
					options: {
						functionID: `SCENES.${action.options.layer}.transition_auto`,
					},
				}
				sendSimpleProtocolCommand(autoTransition)
			},
		},
		[ActionId.cutTransition]: {
			name: 'Layer CUT Transition',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'layer',
					default: instance.combinedLayerArray[0] ? instance.combinedLayerArray.map((item) => ({ id: item.name.replace(/\//g,'.').substring(1), label: item.name.replace(/\//g,'.').substring(1) }))[0].id : '',
					choices: instance.combinedLayerArray.map((item) => ({ id: item.name.replace(/\//g,'.').substring(1), label: item.name.replace(/\//g,'.').substring(1) })),
				},
			],
			callback: (action) => {
				const cutTransition: any = {
					id: 'cutTransition',
					options: {
						functionID: `SCENES.${action.options.layer}.transition_cut`,
					},
				}
				sendSimpleProtocolCommand(cutTransition)
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
					default: '',
					choices: instance.KairosObj.AUX.map((item) => ({ id: item.name, label: item.name })),
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '',
					choices: instance.KairosObj.INPUTS.map((item) => ({ id: item.name, label: item.name })),
				},
			],
			callback: (action) => {
				const setAUX: any = {
					patchCommand: '/aux/',
					options: action.options.aux,
					body: { source: action.options.source },
				}
				// Don't wait for the value to return from the mixer, set it directly
				let index = instance.KairosObj.AUX.findIndex((x) => x.name === action.options.aux)
				instance.KairosObj.AUX[index].source = action.options.source as string
				instance.checkFeedbacks('aux')
				updateBasicVariables(instance)
				sendPatchCommand(setAUX)
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
				sendSimpleProtocolCommand(playerControl)
			},
		},
		[ActionId.macroControl]: {
			name: 'Macro (global) action',
			options: [
				{
					type: 'dropdown',
					label: 'Macro',
					id: 'macro',
					default: instance.KairosObj.MACROS[0] ? instance.KairosObj.MACROS[0].uuid : 'none exist',
					choices: instance.KairosObj.MACROS.map((item) => ({ id: item.uuid, label: `${item.path}${item.name}` })),
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
			name: 'Macro (scene) action',
			options: [
				{
					type: 'dropdown',
					label: 'Scene macro',
					id: 'macro',
					default: instance.KairosObj.SCENES_MACROS[0] ? instance.KairosObj.SCENES_MACROS[0].uuid : 'none exist',
					choices: instance.KairosObj.SCENES_MACROS.map((item) => ({
						id: `${item.scene}/macros/${item.uuid}`,
						label: item.name,
					})),
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
			name: 'Recall Multiviewer preset',
			options: [
				{
					type: 'dropdown',
					label: 'Preset',
					id: 'preset',
					default: multiviewerPresetChoices[0] ? multiviewerPresetChoices[0].id : '',
					choices: multiviewerPresetChoices,
				},
				{
					type: 'dropdown',
					label: 'Multiviewer',
					id: 'mv',
					default: '',
					choices: instance.KairosObj.MULTIVIEWERS.map((item) => ({ id: item.uuid, label: item.name })),
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
			name: 'Trigger Snapshots',
			options: [
				{
					type: 'dropdown',
					label: 'Snapshot',
					id: 'snapshot',
					default: instance.KairosObj.SNAPSHOTS[0] ? instance.KairosObj.SNAPSHOTS[0].uuid : '',
					choices: instance.KairosObj.SNAPSHOTS.map((item) => ({ id: `${item.scene}/snapshots/${item.uuid}`, label: `${item.scene}/${item.name}` })),
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
				sendSimpleProtocolCommand(muteMaster)
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
					sendSimpleProtocolCommand(muteChannel)
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
				sendSimpleProtocolCommand(custom)
			},
		},
	}

	return actions
}
