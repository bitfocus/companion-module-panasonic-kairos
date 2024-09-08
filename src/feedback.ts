import KairosInstance from './'
import { options } from './utils'
import { combineRgb, CompanionFeedbackDefinition, CompanionFeedbackDefinitions } from '@companion-module/base'

export enum FeedbackId {
	inputSource = 'inputSource',
	inputMediaStill = 'inputMediaStill',
	audioMuteMaster = 'audioMuteMaster',
	audioMuteChannel = 'audioMuteChannel',
	aux = 'aux',
}

export function getFeedbacks(instance: KairosInstance): CompanionFeedbackDefinitions {
	const feedbacks: { [id in FeedbackId]: CompanionFeedbackDefinition | undefined } = {
		// Tally
		[FeedbackId.inputSource]: {
			type: 'boolean',
			name: 'Switched state',
			description: 'Indicates if an source is in Program/Preview',
			options: [
				{
					type: 'dropdown',
					label: 'Layer',
					id: 'layer',
					default: '',
					choices: instance.combinedLayerArray.map((item) => ({ id: `/${item.sceneName}/${item.layerName}`, label: `/${item.sceneName}/${item.layerName}` })),
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
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: (feedback): boolean => {
				let layer = feedback.options.layer
				let source = feedback.options.source
				let sourceAB = feedback.options.sourceAB
				for (const LAYER of instance.combinedLayerArray) {
					if (`/${LAYER.sceneName}/${LAYER.layerName}` == layer && LAYER.sourceA === source && sourceAB == 'sourceA') return true
					if (`/${LAYER.sceneName}/${LAYER.layerName}` == layer && LAYER.sourceB === source && sourceAB == 'sourceB') return true
				}
				return false
			},
		},
		[FeedbackId.inputMediaStill]: {
			type: 'boolean',
			name: 'Switched state',
			description: 'Indicates if an still is in Program/Preview',
			options: [
				{
					type: 'dropdown',
					label: 'Layer',
					id: 'layer',
					default: instance.combinedLayerArray[0] ? `/${instance.combinedLayerArray[0].sceneName}/${instance.combinedLayerArray[0].layerName}` : 'layer1',
					choices: instance.combinedLayerArray.map((item) => ({ id: `/${item.sceneName}/${item.layerName}`, label: `/${item.sceneName}/${item.layerName}` })),
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
					choices: instance.KairosObj.MEDIA_STILLS.map((id) => ({ id, label: id })),
				},
			],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: (feedback): boolean => {
				let layer = feedback.options.layer
				let source = feedback.options.source
				let sourceAB = feedback.options.sourceAB
				for (const LAYER of instance.combinedLayerArray) {
					if (`/${LAYER.sceneName}/${LAYER.layerName}` == layer && LAYER.sourceA === source && sourceAB == 'sourceA') return true
					if (`/${LAYER.sceneName}/${LAYER.layerName}` == layer && LAYER.sourceB === source && sourceAB == 'sourceB') return true
				}
				return false
			},
		},
		[FeedbackId.audioMuteMaster]: {
			type: 'boolean',
			name: 'Mute audio master',
			description: 'Indicates if audio mixer is muted',
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
			name: 'Mute audio channel',
			description: 'Indicates if audio channel is muted',
			options: [options.channel],
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(255, 0, 0),
			},
			callback: (feedback): boolean => {
				let channelString = feedback.options.channel as string
				let channelNumber = parseInt(channelString.slice(7)) - 1
				if (instance.KairosObj.AUDIO_CHANNELS[channelNumber].mute === 1) return true
				else return false
			},
		},
		[FeedbackId.aux]: {
			type: 'boolean',
			name: 'AUX',
			description: 'Indicates if an source is in an AUX',
			options: [
				{
					type: 'dropdown',
					label: 'AUX',
					id: 'aux',
					default: instance.KairosObj.AUX[0] ? instance.KairosObj.AUX[0].name : '1',
					choices: instance.KairosObj.AUX.map((id) => ({ id: id.name, label: id.name })),
				},
				{
					type: 'dropdown',
					label: 'Source',
					id: 'source',
					default: '',
					choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.name, label: id.name })),
				},
			],
			defaultStyle: {
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			callback: (feedback): boolean => {
				let index = instance.KairosObj.AUX.findIndex((x) => x.name === feedback.options.aux)
				if (index == -1) return false
				if (instance.KairosObj.AUX[index].source === feedback.options.source) return true
				else return false
			},
		},
	}

	return feedbacks
}
