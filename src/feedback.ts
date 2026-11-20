import type KairosInstance from './index.js'
import { auxSource, booleanValue, layerSource, macroStatus } from './state.js'
import { refToPath } from 'kairos-connection'
import {
	auxCatalog,
	findAudioChannel,
	findPlayer,
	layerCatalog,
	macroCatalog,
	macroPath,
	mediaStillCatalog,
	panelMacroCatalog,
	sceneMacroCatalog,
	sourceCatalog,
	VALUE_TOOLTIPS,
	type Catalog,
} from './choices.js'
import { audioMutePath, masterMutePath, playerRepeatPath, sceneMacroPath } from './refs.js'
import { BLUE, GREEN, RED, isMacroPlaying, options, type SourceAB } from './utils.js'
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
	panelMacroPlaying = 'panelMacroPlaying',
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
	[FeedbackId.panelMacroPlaying]: { type: 'boolean'; options: { macro: string } }
}

// Dropdowns listing layers, sources and AUXes are filled from the mixer once it has been polled. Their stored values
// are still meaningful before that (or if the mixer is unreachable), so `allowInvalidValues` stops Companion from
// rejecting values that are not in the current choices.
export function getFeedbacks(instance: KairosInstance): CompanionFeedbackDefinitions<FeedbacksSchema> {
	/**
	 * Whether a layer's bus has the source an option stores. TCP and REST report it in other forms (`NDI1` or the name an
	 * input is shown with, a still's TCP path), which `catalog` turns into what the option stores.
	 */
	const layerSourceSelected = (
		catalog: Catalog,
		{ layer: id, sourceAB, source }: { layer: string; sourceAB: SourceAB; source: string },
	): boolean => {
		const uuid = layerCatalog(instance.state).resolve(id)
		const layer = instance.state.layers.find((entry) => refToPath(entry.ref) === uuid)
		const current = layer && layerSource(instance.state, layer, sourceAB)
		return current !== undefined && catalog.idOf(current) === catalog.idOf(source)
	}
	const sources = sourceCatalog(instance.state)
	const auxes = auxCatalog(instance.state)
	const stills = mediaStillCatalog(instance.state)
	const layers = layerCatalog(instance.state)
	const globalMacros = macroCatalog(instance.state)
	const sceneMacros = sceneMacroCatalog(instance.state)
	const panelMacros = panelMacroCatalog(instance.state)

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
					default: layers.choices[0]?.id ?? '',
					choices: layers.choices,
					tooltip: VALUE_TOOLTIPS.layer,
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
					default: sources.choices[0]?.id ?? '',
					choices: sources.choices,
					tooltip: VALUE_TOOLTIPS.source,
					allowInvalidValues: true,
				},
			],
			defaultStyle: { bgcolor: RED },
			callback: (feedback) => layerSourceSelected(sourceCatalog(instance.state), feedback.options),
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
					default: layers.choices[0]?.id ?? '',
					choices: layers.choices,
					tooltip: VALUE_TOOLTIPS.layer,
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
					default: stills.choices[0]?.id ?? '',
					choices: stills.choices,
					tooltip: VALUE_TOOLTIPS.mediaStill,
					allowInvalidValues: true,
				},
			],
			defaultStyle: { bgcolor: RED },
			callback: (feedback) => layerSourceSelected(mediaStillCatalog(instance.state), feedback.options),
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
					default: auxes.choices[0]?.id ?? '',
					choices: auxes.choices,
					allowInvalidValues: true,
					tooltip: VALUE_TOOLTIPS.aux,
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: sources.choices[0]?.id ?? '',
					choices: sources.choices,
					tooltip: VALUE_TOOLTIPS.source,
					allowInvalidValues: true,
				},
			],
			defaultStyle: { bgcolor: BLUE },
			callback: (feedback): boolean => {
				const slot = auxCatalog(instance.state).resolve(feedback.options.aux)
				const aux = instance.state.auxes.find((entry) => entry.slot === slot)
				const current = aux && auxSource(instance.state, aux)
				if (current === undefined) return false
				const sources = sourceCatalog(instance.state)
				return sources.idOf(current) === sources.idOf(feedback.options.source)
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
					default: globalMacros.choices[0]?.id ?? '',
					choices: globalMacros.choices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: VALUE_TOOLTIPS.macro,
				},
			],
			defaultStyle: { bgcolor: GREEN },
			callback: (feedback): boolean => {
				const target = macroCatalog(instance.state).resolve(feedback.options.macro)
				const macro = instance.state.macros.find((x) => macroPath(x) === target || x.uuid === target)
				const path = macro && macroPath(macro)
				return path !== undefined && isMacroPlaying(macroStatus(instance.state, path, path))
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
					default: sceneMacros.choices[0]?.id ?? '',
					choices: sceneMacros.choices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: VALUE_TOOLTIPS.sceneMacro,
				},
			],
			defaultStyle: { bgcolor: GREEN },
			callback: (feedback): boolean => {
				const target = sceneMacroCatalog(instance.state).resolve(feedback.options.macro)
				const macro = instance.state.sceneMacros.find(
					(x) => sceneMacroPath(x) === target || `${x.sceneName}/macros/${x.uuid}` === target,
				)
				const path = macro && sceneMacroPath(macro)
				return path !== undefined && isMacroPlaying(macroStatus(instance.state, path, path))
			},
		},
		[FeedbackId.panelMacroPlaying]: {
			type: 'boolean',
			name: 'Macros - Panel Macro Playing',
			description: 'Shows while a macro on a control panel profile is playing',
			options: [
				{
					type: 'dropdown',
					label: 'Panel Macro',
					id: 'macro',
					default: panelMacros.choices[0]?.id ?? '',
					choices: panelMacros.choices,
					allowInvalidValues: true,
					minChoicesForSearch: 8,
					tooltip: VALUE_TOOLTIPS.panelMacro,
				},
			],
			defaultStyle: { bgcolor: GREEN },
			callback: (feedback): boolean => {
				const path = panelMacroCatalog(instance.state).resolve(feedback.options.macro)
				return isMacroPlaying(macroStatus(instance.state, path, path))
			},
		},
	}

	return feedbacks
}
