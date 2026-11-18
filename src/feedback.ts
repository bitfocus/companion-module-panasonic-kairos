import type KairosInstance from './index.js'
import { macroPath, sceneMacroPath } from './refs.js'
import { BLUE, GREEN, RED, isMacroPlaying, mediaStillLabel, options, type SourceAB } from './utils.js'
import type { CompanionFeedbackDefinitions } from '@companion-module/base'

export enum FeedbackId {
	inputSource = 'inputSource',
	inputMediaStill = 'inputMediaStill',
	audioMuteMaster = 'audioMuteMaster',
	audioMuteChannel = 'audioMuteChannel',
	aux = 'aux',
	playerRepeat = 'playerRepeat',
	macroPlaying = 'macroPlaying',
	sceneMacroPlaying = 'sceneMacroPlaying',
}

export type FeedbacksSchema = {
	[FeedbackId.inputSource]: { type: 'boolean'; options: { layer: string; sourceAB: SourceAB; source: string } }
	[FeedbackId.inputMediaStill]: { type: 'boolean'; options: { layer: string; sourceAB: SourceAB; source: string } }
	[FeedbackId.audioMuteMaster]: { type: 'boolean'; options: Record<string, never> }
	[FeedbackId.audioMuteChannel]: { type: 'boolean'; options: { channel: string } }
	[FeedbackId.aux]: { type: 'boolean'; options: { aux: string; source: string } }
	[FeedbackId.playerRepeat]: { type: 'boolean'; options: { player: string } }
	[FeedbackId.macroPlaying]: { type: 'boolean'; options: { macro: string } }
	[FeedbackId.sceneMacroPlaying]: { type: 'boolean'; options: { macro: string } }
}

// Dropdowns listing layers, sources and AUXes are filled from the mixer once it has been polled. Their stored values
// are still meaningful before that (or if the mixer is unreachable), so `allowInvalidValues` stops Companion from
// rejecting values that are not in the current choices.
export function getFeedbacks(instance: KairosInstance): CompanionFeedbackDefinitions<FeedbacksSchema> {
	const feedbacks: CompanionFeedbackDefinitions<FeedbacksSchema> = {
		// Tally
		[FeedbackId.inputSource]: {
			type: 'boolean',
			name: 'Layers - Source Selected',
			description: "Shows when a source is on a layer's A or B bus",
			options: [
				{
					type: 'dropdown',
					label: 'Layer',
					id: 'layer',
					default: '',
					choices: instance.state.layers.map((item) => ({
						id: `/${item.sceneName}/${item.layerName}`,
						label: `${item.sceneName}/${item.layerName}`,
					})),
					allowInvalidValues: true,
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
					choices: instance.state.inputs.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			defaultStyle: { bgcolor: RED },
			callback: (feedback): boolean => {
				const layer = feedback.options.layer
				const source = feedback.options.source
				const sourceAB = feedback.options.sourceAB
				for (const LAYER of instance.state.layers) {
					if (`/${LAYER.sceneName}/${LAYER.layerName}` == layer && LAYER.sourceA === source && sourceAB == 'sourceA')
						return true
					if (`/${LAYER.sceneName}/${LAYER.layerName}` == layer && LAYER.sourceB === source && sourceAB == 'sourceB')
						return true
				}
				return false
			},
		},
		[FeedbackId.inputMediaStill]: {
			type: 'boolean',
			name: 'Layers - Media Still Selected',
			description: "Shows when a media still is on a layer's A or B bus",
			options: [
				{
					type: 'dropdown',
					label: 'Layer',
					id: 'layer',
					default: instance.state.layers[0]
						? `/${instance.state.layers[0].sceneName}/${instance.state.layers[0].layerName}`
						: 'layer1',
					choices: instance.state.layers.map((item) => ({
						id: `/${item.sceneName}/${item.layerName}`,
						label: `${item.sceneName}/${item.layerName}`,
					})),
					allowInvalidValues: true,
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
			defaultStyle: { bgcolor: RED },
			callback: (feedback): boolean => {
				const layer = feedback.options.layer
				const source = feedback.options.source
				const sourceAB = feedback.options.sourceAB
				for (const LAYER of instance.state.layers) {
					if (`/${LAYER.sceneName}/${LAYER.layerName}` == layer && LAYER.sourceA === source && sourceAB == 'sourceA')
						return true
					if (`/${LAYER.sceneName}/${LAYER.layerName}` == layer && LAYER.sourceB === source && sourceAB == 'sourceB')
						return true
				}
				return false
			},
		},
		[FeedbackId.audioMuteMaster]: {
			type: 'boolean',
			name: 'Audio - Master Muted',
			description: 'Shows when the audio mixer master is muted',
			options: [],
			defaultStyle: { bgcolor: RED },
			callback: (): boolean => {
				return instance.state.masterMuted
			},
		},
		[FeedbackId.audioMuteChannel]: {
			type: 'boolean',
			name: 'Audio - Channel Muted',
			description: 'Shows when an audio mixer channel is muted',
			options: [options.channel],
			defaultStyle: { bgcolor: RED },
			callback: (feedback): boolean => {
				const channel = instance.state.audioChannels.find((x) => x.name === feedback.options.channel)
				return channel?.muted ?? false
			},
		},
		[FeedbackId.aux]: {
			type: 'boolean',
			name: 'AUX - Source Selected',
			description: 'Shows when a source is routed to an AUX',
			options: [
				{
					type: 'dropdown',
					label: 'AUX',
					id: 'aux',
					default: instance.state.auxes[0] ? instance.state.auxes[0].name : '1',
					choices: instance.state.auxes.map((id) => ({ id: id.name, label: id.name })),
					allowInvalidValues: true,
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '',
					choices: instance.state.inputs.map((id) => ({ id: id.name, label: id.name })),
					allowInvalidValues: true,
				},
			],
			defaultStyle: { bgcolor: BLUE },
			callback: (feedback): boolean => {
				const index = instance.state.auxes.findIndex((x) => x.name === feedback.options.aux)
				if (index == -1) return false
				if (instance.state.auxes[index].source === feedback.options.source) return true
				else return false
			},
		},
		[FeedbackId.playerRepeat]: {
			type: 'boolean',
			name: 'Players - Repeat On',
			description: 'Shows when a player is in repeat mode',
			options: [
				{
					type: 'dropdown',
					label: 'Player',
					id: 'player',
					default: instance.state.players[0]?.name ?? 'RR1',
					choices: instance.state.players.map(({ name }) => ({ id: name, label: name })),
				},
			],
			defaultStyle: { bgcolor: GREEN },
			callback: (feedback): boolean =>
				instance.state.players.find((x) => x.name === feedback.options.player)?.repeat ?? false,
		},
		[FeedbackId.macroPlaying]: {
			type: 'boolean',
			name: 'Macros - Global Macro Playing',
			description: 'Shows while a global macro is playing',
			options: [
				{
					type: 'dropdown',
					label: 'Macro',
					id: 'macro',
					default: instance.state.macros[0]?.uuid ?? '',
					choices: instance.state.macros.map((item) => ({ id: item.uuid, label: `${item.path}${item.name}` })),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
				},
			],
			defaultStyle: { bgcolor: GREEN },
			callback: (feedback): boolean => {
				const macro = instance.state.macros.find((x) => x.uuid === feedback.options.macro)
				return macro !== undefined && isMacroPlaying(instance.state.macroStatus.get(macroPath(macro)))
			},
		},
		[FeedbackId.sceneMacroPlaying]: {
			type: 'boolean',
			name: 'Macros - Scene Macro Playing',
			description: 'Shows while a scene macro is playing',
			options: [
				{
					type: 'dropdown',
					label: 'Scene Macro',
					id: 'macro',
					default: '',
					choices: instance.state.sceneMacros.map((item) => ({
						id: `${item.sceneName}/macros/${item.uuid}`,
						label: item.name,
					})),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
				},
			],
			defaultStyle: { bgcolor: GREEN },
			callback: (feedback): boolean => {
				const macro = instance.state.sceneMacros.find(
					(x) => `${x.sceneName}/macros/${x.uuid}` === feedback.options.macro,
				)
				return macro !== undefined && isMacroPlaying(instance.state.macroStatus.get(sceneMacroPath(macro)))
			},
		},
	}

	return feedbacks
}
