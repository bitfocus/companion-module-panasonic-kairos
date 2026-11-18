import type KairosInstance from './index.js'
import type { KairosTypes } from './index.js'
import { ActionId } from './actions.js'
import { FeedbackId } from './feedback.js'
import { auxVariableId, inputVariableId } from './variables.js'
import { mediaStillLabel } from './utils.js'
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
					{ section: `Sources - ${scene.name}`, group: `${layer.name} - Source A` },
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
						{ section: `Sources - ${scene.name}`, group: `${layer.name} - Source B` },
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
	instance.KairosObj.TRANSITIONS.forEach((transition) => {
		const layerName = `${transition.sceneName}.${transition.name}`
		addPreset({ section: 'Transitions' }, `${layerName}.cut`, {
			type: 'simple',
			name: `${transition.sceneName}/${transition.name} Cut`,
			style: {
				text: `${transition.sceneName}/${transition.name}\\nCUT`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.cutTransition, options: { layer: layerName } }], up: [] }],
			feedbacks: [],
		})
		addPreset({ section: 'Transitions' }, `${layerName}.auto`, {
			type: 'simple',
			name: `${transition.sceneName}/${transition.name} Auto`,
			style: {
				text: `${transition.sceneName}/${transition.name}\\nAUTO`,
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
			addPreset({ section: 'Scene Actions' }, `${ACTION.uuid}`, {
				type: 'simple',
				name: `${SCENE.name}/${ACTION.name}`,
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
		addPreset({ section: 'Media Stills' }, `${STILL}.select`, {
			type: 'simple',
			name: mediaStillLabel(STILL),
			style: {
				text: mediaStillLabel(STILL),
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
		addPreset({ section: 'Players', group: element.player }, `${element.player}.play`, {
			type: 'simple',
			name: `${element.player} Play`,
			style: {
				text: `${element.player}\\nPLAY`,
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
		addPreset({ section: 'Players', group: element.player }, `${element.player}.pause`, {
			type: 'simple',
			name: `${element.player} Pause`,
			style: {
				text: `${element.player}\\nPAUSE`,
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
		addPreset({ section: 'Players', group: element.player }, `${element.player}.begin`, {
			type: 'simple',
			name: `${element.player} Go to Start`,
			style: {
				text: `${element.player}\\nSTART`,
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
		addPreset({ section: 'Players', group: element.player }, `${element.player}.step_back`, {
			type: 'simple',
			name: `${element.player} Step Back`,
			style: {
				text: `${element.player}\\nSTEP BACK`,
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
		addPreset({ section: 'Players', group: element.player }, `${element.player}.step_forward`, {
			type: 'simple',
			name: `${element.player} Step Forward`,
			style: {
				text: `${element.player}\\nSTEP FWD`,
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
		addPreset({ section: 'Players', group: element.player }, `${element.player}.end`, {
			type: 'simple',
			name: `${element.player} Go to End`,
			style: {
				text: `${element.player}\\nEND`,
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
		addPreset({ section: 'Players', group: element.player }, `${element.player}.repeat_off`, {
			type: 'simple',
			name: `${element.player} Repeat Off`,
			style: {
				text: `${element.player}\\nREPEAT OFF`,
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
		addPreset({ section: 'Players', group: element.player }, `${element.player}.repeat_on`, {
			type: 'simple',
			name: `${element.player} Repeat On`,
			style: {
				text: `${element.player}\\nREPEAT ON`,
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
		addPreset({ section: 'Scenes' }, `${SCENE.name}.cut`, {
			type: 'simple',
			name: `${SCENE.name} Cut`,
			style: {
				text: `${SCENE.name}\\nCUT`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.programCut, options: { scene: SCENE.name } }], up: [] }],
			feedbacks: [],
		})
		addPreset({ section: 'Scenes' }, `${SCENE.name}.auto`, {
			type: 'simple',
			name: `${SCENE.name} Auto`,
			style: {
				text: `${SCENE.name}\\nAUTO`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			steps: [{ down: [{ actionId: ActionId.programAuto, options: { scene: SCENE.name } }], up: [] }],
			feedbacks: [],
		})
	})
	// SNAPSHOT
	instance.KairosObj.SNAPSHOTS.forEach((snapshot) => {
		addPreset({ section: 'Snapshots' }, `${snapshot.uuid}.recall`, {
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
				name: `${aux.name} - ${source}`,
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
		addPreset({ section: 'Macros', group: 'Global' }, `${MACRO.uuid}.play`, {
			type: 'simple',
			name: `${MACRO.path}${MACRO.name} Play`,
			style: {
				text: `${MACRO.path}${MACRO.name}\\nPLAY`,
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
		addPreset({ section: 'Macros', group: 'Global' }, `${MACRO.uuid}.stop`, {
			type: 'simple',
			name: `${MACRO.path}${MACRO.name} Stop`,
			style: {
				text: `${MACRO.path}${MACRO.name}\\nSTOP`,
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
		addPreset({ section: 'Macros', group: 'Scene' }, `${MACRO.uuid}.play`, {
			type: 'simple',
			name: `${MACRO.name} Play`,
			style: {
				text: `${MACRO.name}\\nPLAY`,
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
		addPreset({ section: 'Macros', group: 'Scene' }, `${MACRO.uuid}.stop`, {
			type: 'simple',
			name: `${MACRO.name} Stop`,
			style: {
				text: `${MACRO.name}\\nSTOP`,
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
			addPreset({ section: 'Multiviewers', group: multiviewer.name }, `${multiviewer.uuid}${preset.id}`, {
				type: 'simple',
				name: `${multiviewer.name} - ${preset.name}`,
				style: {
					text: `${multiviewer.name}\\n${preset.name}`,
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
	addPreset({ section: 'Audio' }, `Audio_mute`, {
		type: 'simple',
		name: 'Master Mute',
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
		addPreset({ section: 'Audio' }, `${CHANNEL.channel}.Audio_mute`, {
			type: 'simple',
			name: `${CHANNEL.channel} Mute`,
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
