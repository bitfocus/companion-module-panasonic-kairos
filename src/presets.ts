import KairosInstance from './index'
import { ActionId } from './actions'
import { FeedbackId } from './feedback'
import { combineRgb, CompanionButtonPresetDefinition, CompanionPresetDefinitions } from '@companion-module/base'

interface CompanionPresetExt extends CompanionButtonPresetDefinition {
	feedbacks: Array<
		{
			feedbackId: FeedbackId
		} & CompanionButtonPresetDefinition['feedbacks'][0]
	>
	steps: Array<{
		down: Array<
			{
				actionId: ActionId
			} & CompanionButtonPresetDefinition['steps'][0]['down'][0]
		>
		up: Array<
			{
				actionId: ActionId
			} & CompanionButtonPresetDefinition['steps'][0]['up'][0]
		>
	}>
}
interface CompanionPresetDefinitionsExt {
	[id: string]: CompanionPresetExt | undefined
}

export function getPresets(instance: KairosInstance): CompanionPresetDefinitions {
	const presets: CompanionPresetDefinitionsExt = {}
	// Switch INPUT per Layer
	for (const LAYER of instance.combinedLayerArray) {
		instance.KairosObj.INPUTS.forEach((INPUT) => {
			presets[`${LAYER.name}.${INPUT.name}.PGM`] = {
				type: 'button',
				category: `${LAYER.name.slice(7, LAYER.name.search('.Layers.'))} | ${LAYER.name.slice(
					LAYER.name.search('.Layers.') + 8
				)} | PGM`,
				name: INPUT.shortcut,
				style: {
					text: `$(kairos:${INPUT.shortcut.replace(/ /g, '_')})`,
					//text: INPUT.name,
					size: '18',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{
								actionId: ActionId.setSource,
								options: { functionID: '', layer: LAYER.name, sourceAB: 'sourceA', source: INPUT.shortcut },
							},
						],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: FeedbackId.inputSource,
						options: {
							source: INPUT.shortcut,
							sourceAB: 'sourceA',
							layer: LAYER.name,
						},
						style: {
							color: combineRgb(255, 255, 255),
							bgcolor: combineRgb(255, 0, 0),
						},
					},
				],
			}
		})
		instance.KairosObj.INPUTS.forEach((INPUT) => {
			if (LAYER.preset_enabled != 1) return
			presets[`${LAYER.name}.${INPUT.name}.PVW`] = {
				type: 'button',
				category: `${LAYER.name.slice(7, LAYER.name.search('.Layers.'))} | ${LAYER.name.slice(
					LAYER.name.search('.Layers.') + 8
				)} | PVW`,
				name: INPUT.shortcut,
				style: {
					text: `$(kairos:${INPUT.shortcut.replace(/ /g, '_')})`,
					//text: INPUT.name,
					size: '18',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{
								actionId: ActionId.setSource,
								options: { functionID: '', layer: LAYER.name, sourceAB: 'sourceB', source: INPUT.shortcut },
							},
						],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: FeedbackId.inputSource,
						options: {
							source: INPUT.shortcut,
							sourceAB: 'sourceB',
							layer: LAYER.name,
						},
						style: {
							color: combineRgb(255, 255, 255),
							bgcolor: combineRgb(0, 255, 0),
						},
					},
				],
			}
		})
	}
	// Media Stills
	instance.KairosObj.MEDIA_STILLS.forEach((STILL) => {
		presets[`${STILL}.select`] = {
			type: 'button',
			category: `MEDIA STILLS`,
			name: STILL,
			style: {
				text: STILL.slice(13, STILL.search('&#46;rr')) + '.rr',
				size: '7',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.setMediaStill,
							options: {
								functionID: '',
								layer: instance.combinedLayerArray[0] ? instance.combinedLayerArray[0].name : '',
								sourceAB: 'sourceA',
								source: STILL,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: FeedbackId.inputSource,
					options: {
						source: STILL,
						sourceAB: 'sourceA',
						layer: instance.combinedLayerArray[0] ? instance.combinedLayerArray[0].name : '',
					},
					style: {
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(0, 0, 0),
					},
				},
			],
		}
	})
	// Player
	instance.KairosObj.PLAYERS.forEach((element) => {
		presets[`${element.player}.play`] = {
			type: 'button',
			category: 'PLAYERS',
			name: element.player + 'play',
			style: {
				text: element.player + '\\nplay',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{ actionId: ActionId.playerControl, options: { functionID: '', player: element.player, action: 'play' } },
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		//presets[`${element.player}.stop`] = {
		//	category: 'PLAYERS',
		//	label: element.player + 'stop',
		//	style: {
		//
		//		text: element.player + '\\nstop',
		//		size: '14',
		//		color: combineRgb(255, 255, 255),
		//		bgcolor: combineRgb(0, 0, 0),
		//	},
		//	steps: [ { down [{ actionId 'playerControl', options: { functionID: '', player: element.player, action: 'stop' } },],up:[],},],
		//	feedbacks: [],
		//}
		presets[`${element.player}.pause`] = {
			category: 'PLAYERS',
			type: 'button',
			name: element.player + 'pause',
			style: {
				text: element.player + '\\npause',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{ actionId: ActionId.playerControl, options: { functionID: '', player: element.player, action: 'pause' } },
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		presets[`${element.player}.begin`] = {
			type: 'button',
			category: 'PLAYERS',
			name: element.player + 'begin',
			style: {
				text: element.player + '\\nbegin',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{ actionId: ActionId.playerControl, options: { functionID: '', player: element.player, action: 'begin' } },
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		//presets[`${element.player}.rewind`]={
		//	category: 'PLAYERS',
		//	label: element.player + 'rewind',
		//	style: {
		//
		//		text: element.player + '\\nrewind',
		//		size: '14',
		//		color: combineRgb(255, 255, 255),
		//		bgcolor: combineRgb(0, 0, 0),
		//	},
		//	steps: [ { down [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'rewind' } },],up:[],},],
		//	feedbacks: [],
		//}
		presets[`${element.player}.step_back`] = {
			type: 'button',
			category: 'PLAYERS',
			name: element.player + 'step_back',
			style: {
				text: element.player + '\\nstep_back',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.playerControl,
							options: { functionID: '', player: element.player, action: 'step_back' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		//presets[`${element.player}.reverse_play`]={
		//	category: 'PLAYERS',
		//	label: element.player + 'reverse_play',
		//	style: {
		//
		//		text: element.player + '\\nreverse',
		//		size: '14',
		//		color: combineRgb(255, 255, 255),
		//		bgcolor: combineRgb(0, 0, 0),
		//	},
		//	steps: [ { down [
		//		{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'reverse' } },
		//	],
		//	feedbacks: [],
		//}
		presets[`${element.player}.step_forward`] = {
			type: 'button',
			category: 'PLAYERS',
			name: element.player + 'step_forward',
			style: {
				text: element.player + '\\nstep_fwd',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.playerControl,
							options: { functionID: '', player: element.player, action: 'step_forward' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		//presets[`${element.player}.fast_forward`] = {
		//	category: 'PLAYERS',
		//	label: element.player + 'fast_forward',
		//	style: {
		//
		//		text: element.player + '\\nfast_fwd',
		//		size: '14',
		//		color: combineRgb(255, 255, 255),
		//		bgcolor: combineRgb(0, 0, 0),
		//	},
		//	steps: [ { down [
		//		{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'fast_forward' } },
		//	],
		//	feedbacks: [],
		//})
		presets[`${element.player}.end`] = {
			type: 'button',
			category: 'PLAYERS',
			name: element.player + 'end',
			style: {
				text: element.player + '\\nend',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{ actionId: ActionId.playerControl, options: { functionID: '', player: element.player, action: 'end' } },
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		presets[`${element.player}.repeat_off`] = {
			type: 'button',
			category: 'PLAYERS',
			name: element.player + 'repeat',
			style: {
				text: element.player + '\\nrepeat:off',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.playerControl,
							options: { functionID: '', player: element.player, action: 'repeat=0' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		presets[`${element.player}.repeat_on`] = {
			type: 'button',
			category: 'PLAYERS',
			name: element.player + 'repeat',
			style: {
				text: element.player + '\\nrepeat:on',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.playerControl,
							options: { functionID: '', player: element.player, action: 'repeat=1' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	})
	// Snapshots & scene transitions
	instance.KairosObj.SCENES.forEach((SCENE) => {
		presets[`${SCENE.scene}.cut`] = {
			type: 'button',
			category: 'TRANSITIONS',
			name: 'Master Cut',
			style: {
				text: `${SCENE.scene.slice(7)}\\nCUT`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.programCut, options: { scene: SCENE.scene } }], up: [] }],
			feedbacks: [],
		}
		presets[`${SCENE.scene}.auto`] = {
			type: 'button',
			category: 'TRANSITIONS',
			name: 'Master Auto',
			style: {
				text: `${SCENE.scene.slice(7)}\\nAUTO`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.programAuto, options: { scene: SCENE.scene } }], up: [] }],
			feedbacks: [],
		}
		SCENE.transitions.forEach((TRANSITION) => {
			presets[`${TRANSITION}.cut`] = {
				type: 'button',
				category: 'TRANSITIONS',
				name: 'transition Cut',
				style: {
					text: `${SCENE.scene.slice(7)}\\n${TRANSITION.slice(TRANSITION.search('.Transitions.') + 13)}\\nCUT`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [{ down: [{ actionId: ActionId.cutTransition, options: { layer: TRANSITION } }], up: [] }],
				feedbacks: [],
			}
			presets[`${TRANSITION}.auto`] = {
				type: 'button',
				category: 'TRANSITIONS',
				name: 'transition Auto',
				style: {
					text: `${SCENE.scene.slice(7)}\\n${TRANSITION.slice(TRANSITION.search('.Transitions.') + 13)}\\nAUTO`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [{ down: [{ actionId: ActionId.autoTransition, options: { layer: TRANSITION } }], up: [] }],
				feedbacks: [],
			}
		})
		SCENE.smacros.forEach((SMACRO) => {
			presets[`${SMACRO}.play`] = {
				type: 'button',
				category: 'SCENE MACROS',
				name: SMACRO,
				style: {
					text: `${SCENE.scene.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\nplay`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [{ actionId: ActionId.smacroControl, options: { functionID: '', smacro: SMACRO, action: 'play' } }],
						up: [],
					},
				],
				feedbacks: [],
			}
			//presets[`${SMACRO}.pause`]={
			//	type: 'button',
			//	category: 'SCENE MACROS',
			//	name: SMACRO,
			//	style: {
			//
			//		text: `${SCENE.scene.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\npause`,
			//		size: 'auto',
			//		color: combineRgb(255, 255, 255),
			//		bgcolor: combineRgb(0, 0, 0),
			//	},
			//	steps: [ { down: [{ action: 'smacroControl', options: { functionID: '', smacro: SMACRO, action: 'pause' } }],up:[]}],
			//	feedbacks: [],
			//}
			presets[`${SMACRO}.stop`] = {
				type: 'button',
				category: 'SCENE MACROS',
				name: SMACRO,
				style: {
					text: `${SCENE.scene.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\nstop`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [{ actionId: ActionId.smacroControl, options: { functionID: '', smacro: SMACRO, action: 'stop' } }],
						up: [],
					},
				],
				feedbacks: [],
			}
			//presets[`${SMACRO}.record`]={
			//	type: 'button',
			//	category: 'SCENE MACROS',
			//	name: SMACRO,
			//	style: {
			//
			//		text: `${SCENE.scene.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\nrecord`,
			//		size: 'auto',
			//		color: combineRgb(255, 255, 255),
			//		bgcolor: combineRgb(0, 0, 0),
			//	},
			//	steps: [ { down: [{ actionId: 'smacroControl', options: { functionID: '', smacro: SMACRO, action: 'record' } }],up:[]}],
			//	feedbacks: [],
			//}
			//presets[`${SMACRO}.stop_rec`]={
			//	type: 'button',
			//	category: 'SCENE MACROS',
			//	name: SMACRO,
			//	style: {
			//
			//		text: `${SCENE.scene.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\nstop_rec`,
			//		size: 'auto',
			//		color: combineRgb(255, 255, 255),
			//		bgcolor: combineRgb(0, 0, 0),
			//	},
			//	steps: [ { down: [{ actionId: 'smacroControl', options: { functionID: '', smacro: SMACRO, action: 'stop_record' } }],up:[]}],
			//	feedbacks: [],
			//}
		})
		SCENE.snapshots.forEach((SNAPSHOT) => {
			presets[`${SNAPSHOT}.trigger`] = {
				type: 'button',
				category: 'SNAPSHOTS',
				name: SNAPSHOT,
				style: {
					//text: SNAPSHOT.slice(SNAPSHOT.search('.Snapshots.') + 11),
					text: `${SCENE.scene.slice(7)}\\n${SNAPSHOT.slice(SNAPSHOT.search('.Snapshots.') + 11)}`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [{ down: [{ actionId: ActionId.triggerSnapshot, options: { snapshot: SNAPSHOT } }], up: [] }],
				feedbacks: [],
			}
		})
	})
	// AUX
	instance.KairosObj.AUX.forEach((element) => {
		instance.KairosObj.INPUTS.forEach((INPUT) => {
			presets[`${element.aux}.${INPUT.name}.setAux`] = {
				type: 'button',
				category: element.name,
				name: element.aux,
				style: {
					text: `$(kairos:${element.aux.replace(/ /g, '_')})\\n$(kairos:${INPUT.shortcut.replace(/ /g, '_')})`,
					//text: `${element.name}\\n${INPUT.name}`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{ actionId: ActionId.setAUX, options: { functionID: '', aux: element.aux, source: INPUT.shortcut } },
						],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: FeedbackId.aux,
						options: {
							aux: element.aux,
							source: INPUT.shortcut,
						},
						style: {
							color: combineRgb(255, 255, 255),
							bgcolor: combineRgb(0, 255, 0),
						},
					},
				],
			}
		})
	})
	// MACRO
	instance.KairosObj.MACROS.forEach((MACRO) => {
		presets[`${MACRO}.play`] = {
			type: 'button',
			category: 'MACROS',
			name: 'Macros',
			style: {
				text: `${MACRO.slice(7)}\\nplay`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.macroControl, options: { functionID: '', macro: MACRO, action: 'play' } }],
					up: [],
				},
			],
			feedbacks: [],
		}
		//presets[`${MACRO}.pause`] = {
		//	type: 'button',
		//	category: 'MACROS',
		//	name: 'Macros',
		//	style: {
		//
		//		text: `${MACRO.slice(7)}\\npause`,
		//		size: 'auto',
		//		color: combineRgb(255, 255, 255),
		//		bgcolor: combineRgb(0, 0, 0),
		//	},
		//	steps: [ { down: [{ actionId: 'macroControl', options: { functionID: '', macro: MACRO, action: 'pause' } }],up:[]}],
		//	feedbacks: [],
		//}
		presets[`${MACRO}.stop`] = {
			type: 'button',
			category: 'MACROS',
			name: 'Macros',
			style: {
				text: `${MACRO.slice(7)}\\nstop`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.macroControl, options: { functionID: '', macro: MACRO, action: 'stop' } }],
					up: [],
				},
			],
			feedbacks: [],
		}
		//presets[`${MACRO}.record`] = {
		//	type: 'button',
		//	category: 'MACROS',
		//	name: 'Macros',
		//	style: {
		//
		//		text: `${MACRO.slice(7)}\\nrecord`,
		//		size: 'auto',
		//		color: combineRgb(255, 255, 255),
		//		bgcolor: combineRgb(0, 0, 0),
		//	},
		//	steps: [ { down: [{ actionId: 'macroControl', options: { functionID: '', macro: MACRO, action: 'record' } }],up:[]}],
		//	feedbacks: [],
		//}
		//presets[`${MACRO}.stop_rec`] = {
		//	type: 'button',
		//	category: 'MACROS',
		//	name: 'Macros',
		//	style: {
		//
		//		text: `${MACRO.slice(7)}\\nstop_rec`,
		//		size: 'auto',
		//		},
		// style: {
		// 	color: combineRgb(255, 255, 255),
		//		bgcolor: combineRgb(0, 0, 0),
		//	},
		//	steps: [ { down: [{ actionId: 'macroControl', options: { functionID: '', macro: MACRO, action: 'stop_record' } }],up:[]}],
		//	feedbacks: [],
		//}
	})
	// MULTIVIEWER
	instance.KairosObj.MV_PRESETS.forEach((PRESET) => {
		presets[`MV_PRESETS.${PRESET}.recallmv1`] = {
			type: 'button',
			category: 'Multiviewer1 Presets',
			name: 'Multiviewer1 presets',
			style: {
				text: `MV1 Preset\\n${PRESET.slice(10)}`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.mvRecall, options: { functionID: '', preset: PRESET, mv: 'recall_mv1' } }],
					up: [],
				},
			],
			feedbacks: [],
		}
		presets[`MV_PRESETS.${PRESET}.recallmv2`] = {
			type: 'button',
			category: 'Multiviewer2 Presets',
			name: 'Multiviewer2 presets',
			style: {
				text: `MV2 Preset\\n${PRESET.slice(10)}`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.mvRecall, options: { functionID: '', preset: PRESET, mv: 'recall_mv2' } }],
					up: [],
				},
			],
			feedbacks: [],
		}
	})
	// AUDIO
	presets[`Audio_mute`] = {
		type: 'button',
		category: 'AUDIO MUTE',
		name: 'MUTE',
		style: {
			text: 'MASTER\\nMUTE',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [
			{
				down: [{ actionId: ActionId.muteMaster, options: { mute: 1 } }],
				up: [],
			},
			{
				down: [{ actionId: ActionId.muteMaster, options: { mute: 0 } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: FeedbackId.audioMuteMaster,
				options: {
					mute: 1,
				},
				style: {
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 255, 255),
				},
			},
		],
	}
	instance.KairosObj.AUDIO_CHANNELS.forEach((CHANNEL) => {
		presets[`${CHANNEL.channel}.Audio_mute`] = {
			type: 'button',
			category: 'AUDIO MUTE',
			name: 'MUTE',
			style: {
				text: `${CHANNEL.channel}\\nMUTE`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.muteChannel, options: { channel: CHANNEL.channel, mute: 1 } }],
					up: [],
				},
				{
					down: [{ actionId: ActionId.muteChannel, options: { channel: CHANNEL.channel, mute: 0 } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: FeedbackId.audioMuteChannel,
					options: {
						channel: CHANNEL.channel,
						mute: 1,
					},
					style: {
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 255, 255),
					},
				},
			],
		}
	})
	// TRANSITIONS
	//	instance.combinedTransitionsArray.forEach((TRANSITION) => {
	//	 presets[`${TRANSITION}.Next`]={
	//	 	type: 'button',
	//	 	category: 'TRANSITIONS',
	//	 	name: 'Next transition',
	//	 	style: {
	//
	//	 		text: `${TRANSITION.slice(7)}\\nNext transition`,
	//	 		size: '14',
	//	 		color: combineRgb(255, 255, 255),
	//	 		bgcolor: combineRgb(0, 0, 0),
	//	 	},
	//	 	steps: [ { down: [{ actionId 'nextTransition', options: { transition: TRANSITION } }],
	//	 	feedbacks: [],
	//	 }
	//		presets[`${TRANSITION}.Cut`]={
	//			type: 'button',
	//			category: 'TRANSITIONS',
	//			name: 'Cut transition',
	//			style: {
	//
	//				//text: `${TRANSITION.slice(7)}\\nCUT`,
	//				text: `${TRANSITION.slice(7, TRANSITION.search('.Transitions.'))}\\n${TRANSITION.slice(
	//					TRANSITION.search('.Transitions.') + 13)}\\nCUT`,
	//				size: 'auto',
	//				color: combineRgb(255, 255, 255),
	//				bgcolor: combineRgb(255, 0, 0),
	//			},
	//			steps: [ { down [{ actionId 'cutTransition', options: { layer: TRANSITION } }],
	//			feedbacks: [],
	//		})
	//		presets[`${TRANSITION}.Auto`]={
	//			type: 'button',
	//			category: 'TRANSITIONS',
	//			name: 'Auto transition',
	//			style: {
	//
	//				//text: `${TRANSITION.slice(7)}\\nAUTO`,
	//				text: `${TRANSITION.slice(7, TRANSITION.search('.Transitions.'))}\\n${TRANSITION.slice(
	//					TRANSITION.search('.Transitions.') + 13)}\\nAUTO`,
	//				size: 'auto',
	//				color: combineRgb(255, 255, 255),
	//				bgcolor: combineRgb(0, 0, 0),
	//			},
	//			steps: [ { down [{ actionId 'autoTransition', options: { layer: TRANSITION } }],
	//			feedbacks: [],
	//		})
	//	})
	return presets
}
