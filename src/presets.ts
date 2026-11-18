import type KairosInstance from './index.js'
import type { KairosTypes, PlayerRef } from './index.js'
import { ActionId } from './actions.js'
import { layerFeedbackId, sceneFullName } from './refs.js'
import { FeedbackId } from './feedback.js'
import { auxVariableId, inputVariableId } from './variables.js'
import { BLACK, BLUE, GREEN, PURPLE, RED, WHITE, YELLOW, mediaStillLabel } from './utils.js'
import type {
	CompanionButtonStyleProps,
	CompanionPresetDefinitions,
	CompanionPresetGroup,
	CompanionPresetSection,
	CompanionSimplePresetDefinition,
} from '@companion-module/base'

/** The sections of the presets panel, most used first */
const SECTIONS = [
	{ name: 'Scenes', description: 'Cut or auto transition a scene, or one of its layer transitions' },
	{ name: 'Sources', description: "Set a layer's source A or B, active while it is on that bus" },
	{ name: 'AUX', description: 'Route a source to an AUX, active while it is routed' },
	{ name: 'Snapshots', description: 'Recall a scene snapshot' },
	{ name: 'Macros', description: 'Play or stop a global or scene macro, active while it plays' },
	{ name: 'Multiviewers', description: 'Recall a multiviewer preset' },
	{ name: 'Scene Actions', description: "Run one of a scene's actions" },
	{ name: 'RAM Recorders', description: 'Control the RAM recorders' },
	{ name: 'Clip Players', description: 'Control the clip players' },
	{ name: 'Audio Players', description: 'Control the audio players' },
	{ name: 'Media Stills', description: 'Put a media still on a layer: choose the layer after placing the button' },
	{ name: 'Audio', description: 'Mute or unmute the master or a channel, active while muted' },
] as const

type SectionName = (typeof SECTIONS)[number]['name']
type Preset = CompanionSimplePresetDefinition<KairosTypes>
type Steps = Preset['steps']
type Feedbacks = Preset['feedbacks']

const PLAYER_SECTIONS: Record<PlayerRef['realm'], SectionName> = {
	ramRecorder: 'RAM Recorders',
	clipPlayer: 'Clip Players',
	'audio-player': 'Audio Players',
}

const PLAYER_CONTROLS = [
	{ action: 'begin', id: 'begin', name: 'Go to Start', text: 'START', bgcolor: BLACK },
	{ action: 'rewind', id: 'rewind', name: 'Rewind', text: 'REWIND', bgcolor: BLACK },
	{ action: 'step_back', id: 'step_back', name: 'Step Back', text: 'STEP BACK', bgcolor: BLACK },
	{ action: 'play', id: 'play', name: 'Play', text: 'PLAY', bgcolor: GREEN },
	{ action: 'pause', id: 'pause', name: 'Pause', text: 'PAUSE', bgcolor: YELLOW },
	{ action: 'step_forward', id: 'step_forward', name: 'Step Forward', text: 'STEP FWD', bgcolor: BLACK },
	{ action: 'fast_forward', id: 'fast_forward', name: 'Fast Forward', text: 'FAST FWD', bgcolor: BLACK },
	{ action: 'end', id: 'end', name: 'Go to End', text: 'END', bgcolor: BLACK },
] as const

/** Scene, layer and source names as used in preset ids */
const presetIdPart = (name: string): string => name.replace(/[/ ()]/g, '_')

// Text is always white, so buttons stay readable whatever their background
const style = (text: string, size: CompanionButtonStyleProps['size'], bgcolor: number): Preset['style'] => ({
	text,
	size,
	color: WHITE,
	bgcolor,
})

/** A single step that runs the actions when pressed */
const onPress = (...down: Steps[number]['down']): Steps => [{ down, up: [] }]

export function getPresets(instance: KairosInstance): {
	structure: CompanionPresetSection<KairosTypes>[]
	presets: CompanionPresetDefinitions<KairosTypes>
} {
	const presets: CompanionPresetDefinitions<KairosTypes> = {}
	// section -> group -> preset ids, in the order they were added
	const layout = new Map<SectionName, Map<string | undefined, string[]>>(
		SECTIONS.map((section) => [section.name, new Map()]),
	)

	const addPreset = (
		section: SectionName,
		group: string | undefined,
		id: string,
		preset: Omit<Preset, 'type' | 'feedbacks'> & { feedbacks?: Feedbacks },
	): void => {
		presets[id] = { type: 'simple', feedbacks: [], ...preset }

		const groups = layout.get(section)!
		let presetIds = groups.get(group)
		if (!presetIds) {
			presetIds = []
			groups.set(group, presetIds)
		}
		if (!presetIds.includes(id)) presetIds.push(id)
	}

	// Scenes
	for (const scene of instance.state.scenes) {
		const sceneId = sceneFullName(scene.path, scene.name)
		addPreset('Scenes', 'Scenes', `${sceneId}.cut`, {
			name: `${sceneId} Cut`,
			style: style(`${scene.name}\\nCUT`, 'auto', BLACK),
			steps: onPress({ actionId: ActionId.programCut, options: { scene: sceneId } }),
		})
		addPreset('Scenes', 'Scenes', `${sceneId}.auto`, {
			name: `${sceneId} Auto`,
			style: style(`${scene.name}\\nAUTO`, 'auto', BLACK),
			steps: onPress({ actionId: ActionId.programAuto, options: { scene: sceneId } }),
		})
	}
	for (const transition of instance.state.transitions) {
		const sceneId = sceneFullName(transition.path, transition.sceneName)
		const id = `${sceneId}.${transition.name}`
		const group = `${sceneId} Transitions`
		addPreset('Scenes', group, `${id}.cut`, {
			name: `${sceneId}/${transition.name} Cut`,
			style: style(`${transition.name}\\nCUT`, 'auto', BLACK),
			steps: onPress({ actionId: ActionId.cutTransition, options: { layer: id } }),
		})
		addPreset('Scenes', group, `${id}.auto`, {
			name: `${sceneId}/${transition.name} Auto`,
			style: style(`${transition.name}\\nAUTO`, 'auto', BLACK),
			steps: onPress({ actionId: ActionId.autoTransition, options: { layer: id } }),
		})
	}

	// Sources, with source A as program (red) and source B as preview (green)
	for (const scene of instance.state.scenes) {
		const sceneId = sceneFullName(scene.path, scene.name)
		for (const layer of scene.layers) {
			if (!layer.sources) continue
			const buses = layer.sourceB
				? ([
						['sourceA', 'Source A', 'PGM', RED],
						['sourceB', 'Source B', 'PVW', GREEN],
					] as const)
				: ([['sourceA', 'Source A', 'PGM', RED]] as const)
			for (const [sourceAB, busName, idSuffix, tally] of buses) {
				for (const source of layer.sources) {
					addPreset(
						'Sources',
						`${sceneId}/${layer.name} - ${busName}`,
						`${presetIdPart(sceneId)}.${presetIdPart(layer.name)}.${presetIdPart(source)}.${idSuffix}`,
						{
							name: `${sceneId}/${layer.name} ${busName} - ${source}`,
							style: style(`$(kairos:${inputVariableId(source)})`, 'auto', BLACK),
							steps: onPress({
								actionId: ActionId.setSource,
								options: { layer: `/${scene.uuid}/${layer.uuid}`, sourceAB, source },
							}),
							feedbacks: [
								{
									feedbackId: FeedbackId.inputSource,
									options: { layer: `/${sceneId}/${layer.name}`, sourceAB, source },
									style: { bgcolor: tally },
								},
							],
						},
					)
				}
			}
		}
	}

	// AUX
	for (const aux of instance.state.auxes) {
		if (!aux.sources) continue
		for (const source of aux.sources) {
			addPreset('AUX', aux.name, `${aux.name}.${source}.setAux`, {
				name: `${aux.name} - ${source}`,
				style: style(`$(kairos:${auxVariableId(aux.name)})\\n$(kairos:${inputVariableId(source)})`, 'auto', BLACK),
				steps: onPress({ actionId: ActionId.setAUX, options: { aux: aux.name, source } }),
				feedbacks: [
					{
						feedbackId: FeedbackId.aux,
						options: { aux: aux.name, source },
						style: { bgcolor: BLUE },
					},
				],
			})
		}
	}

	// Snapshots
	for (const snapshot of instance.state.snapshots) {
		addPreset('Snapshots', snapshot.sceneName, `${snapshot.uuid}.recall`, {
			name: `${snapshot.sceneName}/${snapshot.name}`,
			style: style(snapshot.name, 'auto', BLACK),
			steps: onPress({
				actionId: ActionId.triggerSnapshot,
				options: { snapshot: `${snapshot.sceneName}/snapshots/${snapshot.uuid}` },
			}),
		})
	}

	// Macros
	for (const macro of instance.state.macros) {
		const name = `${macro.path}${macro.name}`
		addPreset('Macros', 'Global', `${macro.uuid}.play`, {
			name: `${name} Play`,
			style: style(`${name}\\nPLAY`, 'auto', BLACK),
			steps: onPress({ actionId: ActionId.macroControl, options: { macro: macro.uuid, action: 'play' } }),
			feedbacks: [{ feedbackId: FeedbackId.macroPlaying, options: { macro: macro.uuid }, style: { bgcolor: GREEN } }],
		})
		addPreset('Macros', 'Global', `${macro.uuid}.stop`, {
			name: `${name} Stop`,
			style: style(`${name}\\nSTOP`, 'auto', RED),
			steps: onPress({ actionId: ActionId.macroControl, options: { macro: macro.uuid, action: 'stop' } }),
		})
	}
	for (const macro of instance.state.sceneMacros) {
		const macroId = `${macro.sceneName}/macros/${macro.uuid}`
		addPreset('Macros', 'Scene', `${macro.uuid}.play`, {
			name: `${macro.name} Play`,
			style: style(`${macro.name}\\nPLAY`, 'auto', BLACK),
			steps: onPress({ actionId: ActionId.macroSceneControl, options: { macro: macroId, action: 'play' } }),
			feedbacks: [{ feedbackId: FeedbackId.sceneMacroPlaying, options: { macro: macroId }, style: { bgcolor: GREEN } }],
		})
		addPreset('Macros', 'Scene', `${macro.uuid}.stop`, {
			name: `${macro.name} Stop`,
			style: style(`${macro.name}\\nSTOP`, 'auto', RED),
			steps: onPress({ actionId: ActionId.macroSceneControl, options: { macro: macroId, action: 'stop' } }),
		})
	}

	// Players
	for (const { name: player, ref } of instance.state.players) {
		const section = PLAYER_SECTIONS[ref.realm]
		for (const control of PLAYER_CONTROLS) {
			addPreset(section, player, `${player}.${control.id}`, {
				name: `${player} ${control.name}`,
				style: style(`${player}\\n${control.text}`, '18', control.bgcolor),
				steps: onPress({ actionId: ActionId.playerControl, options: { player, action: control.action } }),
			})
		}
		addPreset(section, player, `${player}.repeat`, {
			name: `${player} Repeat`,
			style: style(`${player}\\nREPEAT`, '18', BLACK),
			steps: onPress({ actionId: ActionId.playerControl, options: { player, action: 'repeat=toggle' } }),
			feedbacks: [{ feedbackId: FeedbackId.playerRepeat, options: { player }, style: { bgcolor: GREEN } }],
		})
	}

	// Media stills, purple as the layer has to be chosen after placing the button
	const firstLayer = instance.state.layers.at(0)
	for (const still of instance.state.mediaStills) {
		addPreset('Media Stills', undefined, `${still}.select`, {
			name: mediaStillLabel(still),
			style: style(mediaStillLabel(still), 'auto', PURPLE),
			steps: onPress({
				actionId: ActionId.setMediaStill,
				options: { layer: firstLayer?.uuid ?? '', sourceAB: 'sourceA', source: still },
			}),
			feedbacks: [
				{
					feedbackId: FeedbackId.inputMediaStill,
					options: {
						layer: firstLayer ? layerFeedbackId(firstLayer) : '',
						sourceAB: 'sourceA',
						source: still,
					},
					style: { bgcolor: RED },
				},
			],
		})
	}

	// Multiviewers
	for (const multiviewer of instance.state.multiviewers) {
		for (const preset of multiviewer.presets ?? []) {
			if (!preset) continue
			addPreset('Multiviewers', multiviewer.name, `${multiviewer.uuid}${preset.id}`, {
				name: `${multiviewer.name} - ${preset.name}`,
				style: style(preset.name, 'auto', BLACK),
				steps: onPress({ actionId: ActionId.mvRecall, options: { mv: multiviewer.uuid, preset: preset.id } }),
			})
		}
	}

	// Scene actions
	for (const scene of instance.state.scenes) {
		for (const action of scene.actions) {
			addPreset('Scene Actions', scene.name, action.uuid, {
				name: `${scene.name}/${action.name}`,
				style: style(action.name, 'auto', BLACK),
				steps: onPress({
					actionId: ActionId.runAction,
					options: { action: `/${scene.name}/actions/${action.uuid}` },
				}),
			})
		}
	}

	// Audio: each press toggles mute, and the button is active while muted
	addPreset('Audio', undefined, 'Audio_mute', {
		name: 'Master Mute',
		style: style('MASTER\\nMUTE', '18', BLACK),
		steps: onPress({ actionId: ActionId.muteMaster, options: { mute: 'toggle' } }),
		feedbacks: [{ feedbackId: FeedbackId.audioMuteMaster, options: {}, style: { bgcolor: RED } }],
	})
	for (const { name: channel } of instance.state.audioChannels) {
		addPreset('Audio', undefined, `${channel}.Audio_mute`, {
			name: `${channel} Mute`,
			style: style(`${channel.replace('Channel ', 'CH ')}\\nMUTE`, '18', BLACK),
			steps: onPress({ actionId: ActionId.muteChannel, options: { channel, mute: 'toggle' } }),
			feedbacks: [{ feedbackId: FeedbackId.audioMuteChannel, options: { channel }, style: { bgcolor: RED } }],
		})
	}

	const structure = SECTIONS.flatMap(({ name, description }): CompanionPresetSection<KairosTypes>[] => {
		const groups = layout.get(name)!
		if (groups.size === 0) return []

		const ungrouped = groups.get(undefined)
		if (ungrouped && groups.size === 1) return [{ id: name, name, description, definitions: ungrouped }]

		return [
			{
				id: name,
				name,
				description,
				definitions: Array.from(groups, ([group, presetIds]): CompanionPresetGroup<KairosTypes> => ({
					id: `${name}/${group ?? ''}`,
					type: 'simple',
					name: group ?? '',
					presets: presetIds,
				})),
			},
		]
	})

	return { structure, presets }
}
