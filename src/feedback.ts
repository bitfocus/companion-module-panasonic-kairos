import type KairosInstance from './index.js'
import { mediaStillLabel, options, type SourceAB } from './utils.js'
import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'

export enum FeedbackId {
	inputSource = 'inputSource',
	inputMediaStill = 'inputMediaStill',
	audioMuteMaster = 'audioMuteMaster',
	audioMuteChannel = 'audioMuteChannel',
	aux = 'aux',
}

export type FeedbacksSchema = {
	[FeedbackId.inputSource]: { type: 'boolean'; options: { layer: string; sourceAB: SourceAB; source: string } }
	[FeedbackId.inputMediaStill]: { type: 'boolean'; options: { layer: string; sourceAB: SourceAB; source: string } }
	[FeedbackId.audioMuteMaster]: { type: 'boolean'; options: Record<string, never> }
	[FeedbackId.audioMuteChannel]: { type: 'boolean'; options: { channel: string } }
	[FeedbackId.aux]: { type: 'boolean'; options: { aux: string; source: string } }
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
					choices: instance.combinedLayerArray.map((item) => ({
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
					choices: instance.KairosObj.INPUTS.map((item) => ({ id: item.name, label: item.name })),
					allowInvalidValues: true,
				},
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: (feedback): boolean => {
				const layer = feedback.options.layer
				const source = feedback.options.source
				const sourceAB = feedback.options.sourceAB
				for (const LAYER of instance.combinedLayerArray) {
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
					default: instance.combinedLayerArray[0]
						? `/${instance.combinedLayerArray[0].sceneName}/${instance.combinedLayerArray[0].layerName}`
						: 'layer1',
					choices: instance.combinedLayerArray.map((item) => ({
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
					default: instance.KairosObj.MEDIA_STILLS[0] ? instance.KairosObj.MEDIA_STILLS[0] : '1',
					choices: instance.KairosObj.MEDIA_STILLS.map((id) => ({ id, label: mediaStillLabel(id) })),
					allowInvalidValues: true,
				},
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: (feedback): boolean => {
				const layer = feedback.options.layer
				const source = feedback.options.source
				const sourceAB = feedback.options.sourceAB
				for (const LAYER of instance.combinedLayerArray) {
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
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: (): boolean => {
				if (instance.KairosObj.audio_master_mute === 1) return true
				else return false
			},
		},
		[FeedbackId.audioMuteChannel]: {
			type: 'boolean',
			name: 'Audio - Channel Muted',
			description: 'Shows when an audio mixer channel is muted',
			options: [options.channel],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: (feedback): boolean => {
				const channel = instance.KairosObj.AUDIO_CHANNELS.find((x) => x.channel === feedback.options.channel)
				return channel?.mute === 1
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
					default: instance.KairosObj.AUX[0] ? instance.KairosObj.AUX[0].name : '1',
					choices: instance.KairosObj.AUX.map((id) => ({ id: id.name, label: id.name })),
					allowInvalidValues: true,
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '',
					choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.name, label: id.name })),
					allowInvalidValues: true,
				},
			],
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			callback: (feedback): boolean => {
				const index = instance.KairosObj.AUX.findIndex((x) => x.name === feedback.options.aux)
				if (index == -1) return false
				if (instance.KairosObj.AUX[index].source === feedback.options.source) return true
				else return false
			},
		},
	}

	return feedbacks
}
