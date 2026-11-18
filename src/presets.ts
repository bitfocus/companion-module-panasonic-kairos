import type KairosInstance from './index.js'
import type { KairosTypes } from './index.js'
import { ActionId } from './actions.js'
import { FeedbackId } from './feedback.js'
import { auxVariableId, inputVariableId } from './variables.js'
import {
	combineRgb,
	type CompanionPresetDefinitions,
	type CompanionPresetGroup,
	type CompanionPresetSection,
	type CompanionSimplePresetDefinition,
} from '@companion-module/base'

/** Scene, layer and source names as used in preset ids */
const presetIdPart = (name: string): string => name.replace(/[/ ()]/g, '_')

/** Where a preset is listed in the presets panel */
interface PresetLocation {
	section: string
	group?: string
}

export function getPresets(instance: KairosInstance): {
	structure: CompanionPresetSection<KairosTypes>[]
	presets: CompanionPresetDefinitions<KairosTypes>
} {
	const presets: CompanionPresetDefinitions<KairosTypes> = {}
	// section -> group -> preset ids, in the order they were added
	const layout = new Map<string, Map<string | undefined, string[]>>()

	const addPreset = (
		location: PresetLocation,
		id: string,
		preset: CompanionSimplePresetDefinition<KairosTypes>,
	): void => {
		presets[id] = preset

		let groups = layout.get(location.section)
		if (!groups) {
			groups = new Map()
			layout.set(location.section, groups)
		}
		let presetIds = groups.get(location.group)
		if (!presetIds) {
			presetIds = []
			groups.set(location.group, presetIds)
		}
		if (!presetIds.includes(id)) presetIds.push(id)
	}

	// Switch INPUT per Layer
	for (const scene of instance.KairosObj.SCENES) {
		// Loop through all Scenes
		scene.layers.forEach((layer) => {
			if (!layer.sources) return
			layer.sources.forEach((source) => {
				addPreset(
					{ section: `Scene: ${scene.name}`, group: `${layer.name} | sourceA` },
					`${presetIdPart(scene.name)}.${presetIdPart(layer.name)}.${presetIdPart(source)}.PGM`,
					{
						type: 'simple',
						name: source,
						style: {
							text: `$(kairos:${inputVariableId(source)})`,
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
									layer: `/${scene.name}/${layer.name}`,
								},
								style: {
									color: combineRgb(255, 255, 255),
									bgcolor: combineRgb(255, 0, 0),
								},
							},
						],
					},
				)
				if (layer.sourceB) {
					addPreset(
						{ section: `Scene: ${scene.name}`, group: `${layer.name} | sourceB` },
						`${presetIdPart(scene.name)}.${presetIdPart(layer.name)}.${presetIdPart(source)}.PVW`,
						{
							type: 'simple',
							name: source,
							style: {
								text: `$(kairos:${inputVariableId(source)})`,
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
										layer: `/${scene.name}/${layer.name}`,
									},
									style: {
										color: combineRgb(0, 0, 0),
										bgcolor: combineRgb(0, 255, 0),
									},
								},
							],
						},
					)
				}
			})
		})
	}
	// Transition of layers
	instance.combinedLayerArray.forEach((layer) => {
		let layerName = `${layer.sceneName}.${layer.layerName}`
		addPreset({ section: 'LAYER TRANSITION' }, `${layerName}.cut`, {
			type: 'simple',
			name: 'transition Cut',
			style: {
				text: `${layerName}\\nCUT`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.cutTransition, options: { layer: layerName } }], up: [] }],
			feedbacks: [],
		})
		addPreset({ section: 'LAYER TRANSITION' }, `${layerName}.auto`, {
			type: 'simple',
			name: 'transition Auto',
			style: {
				text: `${layerName}\\nAUTO`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.autoTransition, options: { layer: layerName } }], up: [] }],
			feedbacks: [],
		})
	})
	// Actions
	instance.KairosObj.SCENES.forEach((SCENE) => {
		SCENE.actions.forEach((ACTION) => {
			addPreset({ section: 'ACTIONS' }, `${ACTION.uuid}`, {
				type: 'simple',
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
			})
		})
	})
	// Media Stills
	instance.KairosObj.MEDIA_STILLS.forEach((STILL) => {
		addPreset({ section: 'MEDIA STILLS' }, `${STILL}.select`, {
			type: 'simple',
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
						layer: instance.combinedLayerArray[0]
							? `/${instance.combinedLayerArray[0].sceneName}/${instance.combinedLayerArray[0].layerName}`
							: '',
					},
					style: {
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(0, 0, 0),
					},
				},
			],
		})
	})
	// Player
	instance.KairosObj.PLAYERS.forEach((element) => {
		addPreset({ section: 'PLAYERS', group: element.player }, `${element.player}.play`, {
			type: 'simple',
			name: element.player + 'play',
			style: {
				text: element.player + '\\nplay',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.playerControl, options: { player: element.player, action: 'play' } }],
					up: [],
				},
			],
			feedbacks: [],
		})
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
		addPreset({ section: 'PLAYERS', group: element.player }, `${element.player}.pause`, {
			type: 'simple',
			name: element.player + 'pause',
			style: {
				text: element.player + '\\npause',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.playerControl, options: { player: element.player, action: 'pause' } }],
					up: [],
				},
			],
			feedbacks: [],
		})
		addPreset({ section: 'PLAYERS', group: element.player }, `${element.player}.begin`, {
			type: 'simple',
			name: element.player + 'begin',
			style: {
				text: element.player + '\\nbegin',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.playerControl, options: { player: element.player, action: 'begin' } }],
					up: [],
				},
			],
			feedbacks: [],
		})
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
		addPreset({ section: 'PLAYERS', group: element.player }, `${element.player}.step_back`, {
			type: 'simple',
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
							options: { player: element.player, action: 'step_back' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		})
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
		addPreset({ section: 'PLAYERS', group: element.player }, `${element.player}.step_forward`, {
			type: 'simple',
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
							options: { player: element.player, action: 'step_forward' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		})
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
		addPreset({ section: 'PLAYERS', group: element.player }, `${element.player}.end`, {
			type: 'simple',
			name: element.player + 'end',
			style: {
				text: element.player + '\\nend',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [{ actionId: ActionId.playerControl, options: { player: element.player, action: 'end' } }],
					up: [],
				},
			],
			feedbacks: [],
		})
		addPreset({ section: 'PLAYERS', group: element.player }, `${element.player}.repeat_off`, {
			type: 'simple',
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
							options: { player: element.player, action: 'repeat=0' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		})
		addPreset({ section: 'PLAYERS', group: element.player }, `${element.player}.repeat_on`, {
			type: 'simple',
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
							options: { player: element.player, action: 'repeat=1' },
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		})
	})
	// Snapshots & scene transitions
	instance.KairosObj.SCENES.forEach((SCENE) => {
		addPreset({ section: 'SCENE TRANSITION' }, `${SCENE.name}.cut`, {
			type: 'simple',
			name: `${SCENE.name}CUT`,
			style: {
				text: `${SCENE.name}\\nCUT`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.programCut, options: { scene: SCENE.name } }], up: [] }],
			feedbacks: [],
		})
		addPreset({ section: 'SCENE TRANSITION' }, `${SCENE.name}.auto`, {
			type: 'simple',
			name: `${SCENE.name}AUTO`,
			style: {
				text: `${SCENE.name}\\nAUTO`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.programAuto, options: { scene: SCENE.name } }], up: [] }],
			feedbacks: [],
		})

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
		addPreset({ section: 'SNAPSHOTS' }, `${snapshot.uuid}.recall`, {
			type: 'simple',
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
		})
	})
	// AUX
	instance.KairosObj.AUX.forEach((aux) => {
		if (!aux.sources) return
		aux.sources.forEach((source) => {
			addPreset({ section: 'AUX', group: aux.name }, `${aux.name}.${source}.setAux`, {
				type: 'simple',
				name: aux.name,
				style: {
					text: `$(kairos:${auxVariableId(aux.name)}):\\n$(kairos:${inputVariableId(source)})`,
					size: 'auto',
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [{ actionId: ActionId.setAUX, options: { aux: aux.name, source: source } }],
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
			})
		})
	})
	// MACRO
	instance.KairosObj.MACROS.forEach((MACRO) => {
		addPreset({ section: 'MACROS', group: 'Global' }, `${MACRO.uuid}.play`, {
			type: 'simple',
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
		})
		addPreset({ section: 'MACROS', group: 'Global' }, `${MACRO.uuid}.stop`, {
			type: 'simple',
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
		})
	})
	// MACRO FOR SCENES
	instance.KairosObj.SCENES_MACROS.forEach((MACRO) => {
		addPreset({ section: 'MACROS', group: 'Scene' }, `${MACRO.uuid}.play`, {
			type: 'simple',
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
		})
		addPreset({ section: 'MACROS', group: 'Scene' }, `${MACRO.uuid}.stop`, {
			type: 'simple',
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
		})
	})
	// MULTIVIEWER
	instance.KairosObj.MULTIVIEWERS.forEach((multiviewer) => {
		multiviewer.presets.forEach((preset) => {
			if (!preset) return
			addPreset({ section: 'MULTIVIEWER PRESETS', group: multiviewer.name }, `${multiviewer.uuid}${preset.id}`, {
				type: 'simple',
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
			})
		})
	})
	// AUDIO
	addPreset({ section: 'AUDIO MUTE' }, `Audio_mute`, {
		type: 'simple',
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
				options: {},
				style: {
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 255, 255),
				},
			},
		],
	})
	instance.KairosObj.AUDIO_CHANNELS.forEach((CHANNEL) => {
		addPreset({ section: 'AUDIO MUTE' }, `${CHANNEL.channel}.Audio_mute`, {
			type: 'simple',
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
					},
					style: {
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 255, 255),
					},
				},
			],
		})
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

	const structure = Array.from(layout, ([section, groups]): CompanionPresetSection<KairosTypes> => {
		const ungrouped = groups.get(undefined)
		if (ungrouped && groups.size === 1) return { id: section, name: section, definitions: ungrouped }

		return {
			id: section,
			name: section,
			definitions: Array.from(groups, ([group, presetIds]): CompanionPresetGroup<KairosTypes> => ({
				id: `${section}/${group ?? ''}`,
				type: 'simple',
				name: group ?? '',
				presets: presetIds,
			})),
		}
	})

	return { structure, presets }
}
