import type KairosInstance from './index.js'
import { auxSource, booleanValue, layerSource, macroStatus } from './state.js'
import { refToPath } from 'kairos-connection'
import {
	dropdownChoices,
	findAudioChannel,
	findPlayer,
	layerChoices,
	macroChoices,
	matchedId,
	resolveChoice,
	sceneMacroChoices,
} from './choices.js'
import { audioMutePath, layerFeedbackId, masterMutePath, playerRepeatPath, sceneMacroPath } from './refs.js'
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
	const layerSourceSelected = ({
		layer: id,
		sourceAB,
		source,
	}: {
		layer: string
		sourceAB: SourceAB
		source: string
	}): boolean => {
		const uuid = matchedId(resolveChoice(layerChoices(instance.state), id))
		const layer = instance.state.layers.find((entry) => entry.uuid === uuid)
		return layer !== undefined && layerSource(instance.state, layer, sourceAB) === source
	}
	const layerFeedbackChoices = instance.state.layers.map((layer) => ({
		id: layerFeedbackId(layer),
		label: layerFeedbackId(layer).slice(1),
	}))
	const globalMacros = macroChoices(instance.state)
	const sceneMacros = sceneMacroChoices(instance.state)

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
					default: layerFeedbackChoices[0]?.id ?? '',
					choices: layerFeedbackChoices,
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
					default: instance.state.inputs[0]?.name ?? '',
					choices: instance.state.inputs.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			defaultStyle: { bgcolor: RED },
			callback: (feedback) => layerSourceSelected(feedback.options),
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
					default: layerFeedbackChoices[0]?.id ?? '',
					choices: layerFeedbackChoices,
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
			callback: (feedback) => layerSourceSelected(feedback.options),
		},
		[FeedbackId.audioMuteMaster]: {
			type: 'boolean',
			name: 'Audio - Master Muted',
			description: 'Shows when the audio mixer master is muted',
			options: [],
			defaultStyle: { bgcolor: RED },
			callback: (): boolean => {
				return booleanValue(instance.state, masterMutePath) === true
			},
		},
		[FeedbackId.audioMuteChannel]: {
			type: 'boolean',
			name: 'Audio - Channel Muted',
			description: 'Shows when an audio mixer channel is muted',
			options: [options.channel],
			defaultStyle: { bgcolor: RED },
			callback: (feedback): boolean => {
				const channel = findAudioChannel(instance.state.audioChannels, feedback.options.channel)
				return channel !== undefined && booleanValue(instance.state, audioMutePath(channel)) === true
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
					default: instance.state.inputs[0]?.name ?? '',
					choices: instance.state.inputs.map((id) => ({ id: id.name, label: id.name })),
					allowInvalidValues: true,
				},
			],
			defaultStyle: { bgcolor: BLUE },
			callback: (feedback): boolean => {
				const aux = instance.state.auxes.find((entry) => entry.name === feedback.options.aux)
				return aux !== undefined && auxSource(instance.state, aux) === feedback.options.source
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
					allowInvalidValues: true,
				},
			],
			defaultStyle: { bgcolor: GREEN },
			callback: (feedback): boolean => {
				const player = findPlayer(instance.state.players, feedback.options.player)
				return player !== undefined && booleanValue(instance.state, playerRepeatPath(player.ref)) === true
			},
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
					default: globalMacros[0]?.id ?? '',
					choices: dropdownChoices(globalMacros),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: 'In an expression, a macro can also be given by its name',
				},
			],
			defaultStyle: { bgcolor: GREEN },
			callback: (feedback): boolean => {
				const id = matchedId(resolveChoice(macroChoices(instance.state), feedback.options.macro))
				const macro = instance.state.macros.find((x) => x.uuid === id)
				return macro !== undefined && isMacroPlaying(macroStatus(instance.state, refToPath(macro.ref), macro.uuid))
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
					default: sceneMacros[0]?.id ?? '',
					choices: dropdownChoices(sceneMacros),
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: 'In an expression, a scene macro can also be given as `Scene/macro name`',
				},
			],
			defaultStyle: { bgcolor: GREEN },
			callback: (feedback): boolean => {
				const id = matchedId(resolveChoice(sceneMacroChoices(instance.state), feedback.options.macro))
				const macro = instance.state.sceneMacros.find((x) => `${x.sceneName}/macros/${x.uuid}` === id)
				return macro !== undefined && isMacroPlaying(macroStatus(instance.state, sceneMacroPath(macro), macro.uuid))
			},
		},
	}

	return feedbacks
}
