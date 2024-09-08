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
	for (const scene of instance.KairosObj.SCENES) {
		// Loop through all Scenes
		scene.layers.forEach((layer) => {
			if (!layer.sources) return
			layer.sources.forEach((source) => {
				presets[
					`${scene.name.replace(/[\/ ()]/g, '_')}.${layer.name.replace(/[\/ ()]/g, '_')}.${source.replace(
						/[\/ ()]/g,
						'_'
					)}.PGM`
				] = {
					type: 'button',
					category: `Scene:\n${scene.name.replace(/[\/ ()]/g, '_')} | ${layer.name} | sourceA`,
					name: source,
					style: {
						text: `$(kairos:INPUT.${source.replace(/ /g, '_')})`,
						size: 'auto',
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
					},
					steps: [
						{
							down: [
								{
									actionId: ActionId.setSource,
									options: {
										functionID: '',
										layer: `/${scene.uuid}/${layer.uuid}`,
										sourceAB: 'sourceA',
										source: source,
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
								source: source,
								sourceAB: 'sourceA',
								layer: `/${scene.name.replace(/[\/ ()]/g, '_')}/${layer.name.replace(/[\/ ()]/g, '_')}`,
							},
							style: {
								color: combineRgb(255, 255, 255),
								bgcolor: combineRgb(255, 0, 0),
							},
						},
					],
				}
				if (layer.sourceB) {
					presets[
						`${scene.name.replace(/[\/ ()]/g, '_')}.${layer.name.replace(/[\/ ()]/g, '_')}.${source.replace(
							/[\/ ()]/g,
							'_'
						)}.PVW`
					] = {
						type: 'button',
						category: `Scene:\n${scene.name.replace(/[\/ ()]/g, '_')} | ${layer.name} | sourceB`,
						name: source,
						style: {
							text: `$(kairos:INPUT.${source.replace(/ /g, '_')})`,
							size: 'auto',
							color: combineRgb(255, 255, 255),
							bgcolor: combineRgb(0, 0, 0),
						},
						steps: [
							{
								down: [
									{
										actionId: ActionId.setSource,
										options: {
											functionID: '',
											layer: `/${scene.uuid}/${layer.uuid}`,
											sourceAB: 'sourceB',
											source: source,
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
									source: source,
									sourceAB: 'sourceB',
									layer: `/${scene.name.replace(/[\/ ()]/g, '_')}/${layer.name.replace(/[\/ ()]/g, '_')}`,
								},
								style: {
									color: combineRgb(0, 0, 0),
									bgcolor: combineRgb(0, 255, 0),
								},
							},
						],
					}
				}
			})
		})
	}
	// Transition of layers
	instance.combinedLayerArray.forEach((layer) => {
		let layerName = `${layer.sceneName}.${layer.layerName}`
		presets[`${layerName}.cut`] = {
			type: 'button',
			category: 'LAYER TRANSITION',
			name: 'transition Cut',
			style: {
				text: `${layerName}\\nCUT`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.cutTransition, options: { layer: layerName } }], up: [] }],
			feedbacks: [],
		}
		presets[`${layerName}.auto`] = {
			type: 'button',
			category: 'LAYER TRANSITION',
			name: 'transition Auto',
			style: {
				text: `${layerName}\\nAUTO`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.autoTransition, options: { layer: layerName } }], up: [] }],
			feedbacks: [],
		}
	})
	// Actions
	instance.KairosObj.SCENES.forEach((SCENE) => {
		SCENE.actions.forEach((ACTION) => {
			presets[`${ACTION.uuid}`] = {
				type: 'button',
				category: 'ACTIONS',
				name: ACTION.uuid,
				style: {
					text: `${SCENE.name}\\n${ACTION.name}`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [{ actionId: ActionId.runAction, options: { action: `/${SCENE.name}/actions/${ACTION.uuid}` } }],
						up: [],
					},
				],
				feedbacks: [],
			}
		})
	})
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
								layer: instance.combinedLayerArray[0] ? instance.combinedLayerArray[0].uuid : '',
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
						layer: instance.combinedLayerArray[0] ? `/${instance.combinedLayerArray[0].sceneName}/${instance.combinedLayerArray[0].layerName}` : '',
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
		presets[`${SCENE.name}.cut`] = {
			type: 'button',
			category: 'SCENE TRANSITION',
			name: `${SCENE.name}CUT`,
			style: {
				text: `${SCENE.name}\\nCUT`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.programCut, options: { scene: SCENE.name } }], up: [] }],
			feedbacks: [],
		}
		presets[`${SCENE.name}.auto`] = {
			type: 'button',
			category: 'SCENE TRANSITION',
			name: `${SCENE.name}AUTO`,
			style: {
				text: `${SCENE.name}\\nAUTO`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.programAuto, options: { scene: SCENE.name } }], up: [] }],
			feedbacks: [],
		}

		// SCENE.smacros.forEach((SMACRO) => {
		// 	presets[`${SMACRO}.play`] = {
		// 		type: 'button',
		// 		category: 'SCENE MACROS',
		// 		name: SMACRO,
		// 		style: {
		// 			text: `${SCENE.name.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\nplay`,
		// 			size: 'auto',
		// 			color: combineRgb(255, 255, 255),
		// 			bgcolor: combineRgb(0, 0, 0),
		// 		},
		// 		steps: [
		// 			{
		// 				down: [{ actionId: ActionId.smacroControl, options: { functionID: '', smacro: SMACRO, action: 'play' } }],
		// 				up: [],
		// 			},
		// 		],
		// 		feedbacks: [],
		// 	}
		// 	//presets[`${SMACRO}.pause`]={
		// 	//	type: 'button',
		// 	//	category: 'SCENE MACROS',
		// 	//	name: SMACRO,
		// 	//	style: {
		// 	//
		// 	//		text: `${SCENE.name.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\npause`,
		// 	//		size: 'auto',
		// 	//		color: combineRgb(255, 255, 255),
		// 	//		bgcolor: combineRgb(0, 0, 0),
		// 	//	},
		// 	//	steps: [ { down: [{ action: 'smacroControl', options: { functionID: '', smacro: SMACRO, action: 'pause' } }],up:[]}],
		// 	//	feedbacks: [],
		// 	//}
		// 	presets[`${SMACRO}.stop`] = {
		// 		type: 'button',
		// 		category: 'SCENE MACROS',
		// 		name: SMACRO,
		// 		style: {
		// 			text: `${SCENE.name.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\nstop`,
		// 			size: 'auto',
		// 			color: combineRgb(255, 255, 255),
		// 			bgcolor: combineRgb(0, 0, 0),
		// 		},
		// 		steps: [
		// 			{
		// 				down: [{ actionId: ActionId.smacroControl, options: { functionID: '', smacro: SMACRO, action: 'stop' } }],
		// 				up: [],
		// 			},
		// 		],
		// 		feedbacks: [],
		// 	}
		// 	//presets[`${SMACRO}.record`]={
		// 	//	type: 'button',
		// 	//	category: 'SCENE MACROS',
		// 	//	name: SMACRO,
		// 	//	style: {
		// 	//
		// 	//		text: `${SCENE.name.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\nrecord`,
		// 	//		size: 'auto',
		// 	//		color: combineRgb(255, 255, 255),
		// 	//		bgcolor: combineRgb(0, 0, 0),
		// 	//	},
		// 	//	steps: [ { down: [{ actionId: 'smacroControl', options: { functionID: '', smacro: SMACRO, action: 'record' } }],up:[]}],
		// 	//	feedbacks: [],
		// 	//}
		// 	//presets[`${SMACRO}.stop_rec`]={
		// 	//	type: 'button',
		// 	//	category: 'SCENE MACROS',
		// 	//	name: SMACRO,
		// 	//	style: {
		// 	//
		// 	//		text: `${SCENE.name.slice(7)}\\n${SMACRO.slice(SMACRO.search('.Macros.') + 8)}\\nstop_rec`,
		// 	//		size: 'auto',
		// 	//		color: combineRgb(255, 255, 255),
		// 	//		bgcolor: combineRgb(0, 0, 0),
		// 	//	},
		// 	//	steps: [ { down: [{ actionId: 'smacroControl', options: { functionID: '', smacro: SMACRO, action: 'stop_record' } }],up:[]}],
		// 	//	feedbacks: [],
		// 	//}
		// })
	})
	// SNAPSHOT
	instance.KairosObj.SNAPSHOTS.forEach((snapshot) => {
		presets[`${snapshot.uuid}.recall`] = {
			type: 'button',
			category: 'SNAPSHOTS',
			name: `${snapshot.scene}/${snapshot.name}`,
			style: {
				text: `${snapshot.scene}/${snapshot.name}`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.triggerSnapshot,
							options: { snapshot: `${snapshot.scene}/snapshots/${snapshot.uuid}` },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	})
	// AUX
	instance.KairosObj.AUX.forEach((aux) => {
		if (!aux.sources) return
		aux.sources.forEach((source) => {
			presets[`${aux.name}.${source}.setAux`] = {
				type: 'button',
				category: `AUX: ${aux.name}`,
				name: aux.name,
				style: {
					text: `$(kairos:AUX.${aux.name.replace(/ /g, '_')}):\\n$(kairos:INPUT.${source.replace(/ /g, '_')})`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [{ actionId: ActionId.setAUX, options: { functionID: '', aux: aux.name, source: source } }],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: FeedbackId.aux,
						options: {
							aux: aux.name,
							source: source,
						},
						style: {
							color: combineRgb(0, 0, 0),
							bgcolor: combineRgb(0, 255, 0),
						},
					},
				],
			}
		})
	})
	// MACRO
	instance.KairosObj.MACROS.forEach((MACRO) => {
		presets[`${MACRO.uuid}.play`] = {
			type: 'button',
			category: 'MACROS',
			name: 'Macros',
			style: {
				text: `GLOBAL:\n${MACRO.path}${MACRO.name}\\nplay`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.macroControl, options: { macro: MACRO.uuid, action: 'play' } }],
					up: [],
				},
			],
			feedbacks: [],
		}
		presets[`${MACRO.uuid}.stop`] = {
			type: 'button',
			category: 'MACROS',
			name: 'Macros',
			style: {
				text: `GLOBAL:\n${MACRO.path}${MACRO.name}\\nstop`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.macroControl, options: { macro: MACRO.uuid, action: 'stop' } }],
					up: [],
				},
			],
			feedbacks: [],
		}
	})
	// MACRO FOR SCENES
	instance.KairosObj.SCENES_MACROS.forEach((MACRO) => {
		presets[`${MACRO.uuid}.play`] = {
			type: 'button',
			category: 'MACROS',
			name: 'Macros',
			style: {
				text: `SCENE:\n${MACRO.name}\\nplay`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.macroSceneControl,
							options: { macro: `${MACRO.scene}/macros/${MACRO.uuid}`, action: 'play' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
		presets[`${MACRO.uuid}.stop`] = {
			type: 'button',
			category: 'MACROS',
			name: 'Macros',
			style: {
				text: `SCENE:\n${MACRO.name}\\nstop`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: ActionId.macroSceneControl,
							options: { macro: `${MACRO.scene}/macros/${MACRO.uuid}`, action: 'stop' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	})
	// MULTIVIEWER
	instance.KairosObj.MULTIVIEWERS.forEach((multiviewer) => {
		multiviewer.presets.forEach((preset) => {
			if (!preset) return
			presets[`${multiviewer.uuid}${preset.id}`] = {
				type: 'button',
				category: `${multiviewer.name} Presets`,
				name: `${multiviewer.name}Presets`,
				style: {
					text: `${multiviewer.name} Preset ${preset.name}`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [{ actionId: ActionId.mvRecall, options: { mv: multiviewer.uuid, preset: preset.id } }],
						up: [],
					},
				],
				feedbacks: [],
			}
		})
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
