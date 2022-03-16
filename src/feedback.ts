import KairosInstance from './'
import {
  CompanionFeedbackEvent,
  SomeCompanionInputField,
  CompanionBankRequiredProps,
  CompanionBankAdditionalStyleProps,
  CompanionFeedbackEventInfo,
  CompanionBankPNG,
} from '../../../instance_skel_types'
import { options } from './utils'

export interface KairosFeedbacks {
  // Tally
  inputSource: KairosFeedback<inputSourceCallback>
	//Audio
	audioMuteMaster: KairosFeedback<audioMuteCallback>
	audioMuteChannel: KairosFeedback<audioMuteChannelCallback>
	//AUX
	aux: KairosFeedback<auxCallback>

  // Index signature
  [key: string]: KairosFeedback<any>
}

// Tally
interface inputSourceCallback {
  type: 'inputSource'
  options: Readonly<{
    fg: number
    bg: number
		bg_pvw: number
    source: string
		sourceAB: string
		layer: string
  }>
}
interface inputMediaStillCallback {
  type: 'inputMediaStill'
  options: Readonly<{
    fg: number
    bg: number
		bg_pvw: number
    source: string
		sourceAB: string
		layer: string
  }>
}

// Audio
interface audioMuteCallback {
	type: 'audioMuteMaster'
	options: Readonly<{
    fg: number
    bg: number
    mute: number
  }>
}
interface audioMuteChannelCallback {
	type: 'audioMuteChannel'
	options: Readonly<{
    fg: number
    bg: number
    mute: number
		channel: string
  }>
}
//AUX
interface auxCallback {
	type: 'aux'
	options: Readonly<{
		fg: number
    bg: number
    aux: string
		source: string
	}>
}
// Callback type for Presets
export type FeedbackCallbacks =
  | inputSourceCallback 
  | inputMediaStillCallback 
	| auxCallback
	| audioMuteCallback
	| audioMuteChannelCallback

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionInputField, 'default'> & { default: string | number | boolean | null }

// Kairos Boolean and Advanced feedback types
interface KairosFeedbackBoolean<T> {
  type: 'boolean'
  label: string
  description: string
  style: Partial<CompanionBankRequiredProps & CompanionBankAdditionalStyleProps>
  options: InputFieldWithDefault[]
  callback?: (
    feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>,
    bank: Readonly<CompanionBankPNG | null>,
    info: Readonly<CompanionFeedbackEventInfo | null>
  ) => boolean
  subscribe?: (feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>) => boolean
  unsubscribe?: (feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>) => boolean
}

interface KairosFeedbackAdvanced<T> {
  type: 'advanced'
  label: string
  description: string
  options: InputFieldWithDefault[]
  callback?: (
    feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>,
    bank: Readonly<CompanionBankPNG | null>,
    info: Readonly<CompanionFeedbackEventInfo | null>
  ) => Partial<CompanionBankRequiredProps & CompanionBankAdditionalStyleProps> | void
  subscribe?: (
    feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>
  ) => Partial<CompanionBankRequiredProps & CompanionBankAdditionalStyleProps> | void
  unsubscribe?: (
    feedback: Readonly<Omit<CompanionFeedbackEvent, 'options' | 'type'> & T>
  ) => Partial<CompanionBankRequiredProps & CompanionBankAdditionalStyleProps> | void
}

export type KairosFeedback<T> = KairosFeedbackBoolean<T> | KairosFeedbackAdvanced<T>

export function getFeedbacks(instance: KairosInstance): KairosFeedbacks {
  return {
    // Tally
    inputSource: {
      type: 'advanced',
      label: 'Switched state',
      description: 'Indicates if an source is in Program/Preview',
      options: [
				{
          type: 'dropdown',
          label: 'Layer',
          id: 'layer',
          default: instance.combinedLayerArray[0].name,
          choices: instance.combinedLayerArray.map((id) => ({ id: id.name, label: id.name })),
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
          default: instance.KairosObj.INPUTS[0].shortcut,
          choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.shortcut, label: id.name })),
        },
				options.foregroundColor,
				options.backgroundColorProgram,
				options.backgroundColorPreview,
      ],
      callback: (feedback) => {
				let layer = feedback.options.layer
        let source = feedback.options.source
				let sourceAB = feedback.options.sourceAB
				for (const LAYER of instance.combinedLayerArray) {
					if (LAYER.name == layer && LAYER.sourceA === source && sourceAB == 'sourceA') return { color: feedback.options.fg, bgcolor: feedback.options.bg }
					if (LAYER.name == layer && LAYER.sourceB === source && sourceAB == 'sourceB') return { color: feedback.options.fg, bgcolor: feedback.options.bg_pvw }
				}
        return
      },
    },
    inputMediaStill: {
      type: 'advanced',
      label: 'Switched state',
      description: 'Indicates if an still is in Program/Preview',
      options: [
				{
          type: 'dropdown',
          label: 'Layer',
          id: 'layer',
          default: instance.combinedLayerArray[0].name,
          choices: instance.combinedLayerArray.map((id) => ({ id: id.name, label: id.name })),
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
          default: instance.KairosObj.MEDIA_STILLS[0],
          choices: instance.KairosObj.MEDIA_STILLS.map((id) => ({ id, label: id })),
        },
				options.foregroundColor,
				options.backgroundColorProgram,
				options.backgroundColorPreview,
      ],
      callback: (feedback) => {
				let layer = feedback.options.layer
        let source = feedback.options.source
				let sourceAB = feedback.options.sourceAB
				for (const LAYER of instance.combinedLayerArray) {
					if (LAYER.name == layer && LAYER.sourceA === source && sourceAB == 'sourceA') return { color: feedback.options.fg, bgcolor: feedback.options.bg }
					if (LAYER.name == layer && LAYER.sourceB === source && sourceAB == 'sourceB') return { color: feedback.options.fg, bgcolor: feedback.options.bg_pvw }
				}
        return
      },
    },
		audioMuteMaster: {
			type: 'advanced',
      label: 'Mute audio master',
      description: 'Indicates if audio mixer is muted',
      options: [
				options.foregroundColor,
				options.backgroundColorProgram,
      ],
      callback: (feedback) => {
        if (instance.KairosObj.audio_master_mute === 1) return { color: feedback.options.fg, bgcolor: feedback.options.bg }
        else return
      },
		},
		audioMuteChannel: {
			type: 'advanced',
      label: 'Mute audio channel',
      description: 'Indicates if audio channel is muted',
      options: [
				options.channel,
				options.foregroundColor,
				options.backgroundColorProgram,
      ],
      callback: (feedback) => {
				let channelNumber = parseInt(feedback.options.channel.slice(7)) - 1
        if (instance.KairosObj.AUDIO_CHANNELS[channelNumber].mute === 1) return { color: feedback.options.fg, bgcolor: feedback.options.bg }
        else return
      },
		},
		aux: {
			type: 'advanced',
      label: 'AUX',
      description: 'Indicates if an source is in an AUX',
      options: [
				{
          type: 'dropdown',
          label: 'AUX',
          id: 'aux',
          default: instance.KairosObj.AUX[0].aux,
          choices: instance.KairosObj.AUX.map((id) => ({ id: id.aux, label: id.aux })),
        },
				{
          type: 'dropdown',
          label: 'Source',
          id: 'source',
          default: instance.KairosObj.INPUTS[0].shortcut,
          choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.shortcut, label: id.name })),
        },
				options.foregroundColor,
				options.backgroundColorProgram,
      ],
      callback: (feedback) => {
				let index = instance.KairosObj.AUX.findIndex(x => x.aux === feedback.options.aux)
        if (instance.KairosObj.AUX[index].liveSource === feedback.options.source) return { color: feedback.options.fg, bgcolor: feedback.options.bg }
        else return
      },
		}
	
  }
}
