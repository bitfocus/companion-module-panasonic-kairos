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
  inputSourceA: KairosFeedback<inputSourceACallback>
  inputSourceB: KairosFeedback<inputSourceBCallback>
	//Audio
	audioMuteMaster: KairosFeedback<audioMuteCallback>
	audioMuteChannel: KairosFeedback<audioMuteChannelCallback>

  // Index signature
  [key: string]: KairosFeedback<any>
}

// Tally
interface inputSourceACallback {
  type: 'inputSourceA'
  options: Readonly<{
    fg: number
    bg: number
    source: string
  }>
}

interface inputSourceBCallback {
  type: 'inputSourceA'
	options: Readonly<{
    fg: number
    bg: number
    source: string
  }>
}

// Audio
interface audioMuteCallback {
	type: ''
	options: Readonly<{
    fg: number
    bg: number
    mute: number
  }>
}
interface audioMuteChannelCallback {
	type: ''
	options: Readonly<{
    fg: number
    bg: number
    mute: number
		channel: string
  }>
}

// Callback type for Presets
export type FeedbackCallbacks =
  // Tally
  inputSourceACallback | inputSourceBCallback

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
    inputSourceA: {
      type: 'advanced',
      label: 'Tally - Program state',
      description: 'Indicates if an source is in Program',
      options: [
        {
          type: 'dropdown',
          label: 'Source',
          id: 'source',
          default: instance.KairosObj.INPUTS[0].input,
          choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.input, label: id.name })),
        },
				options.foregroundColor,
				options.backgroundColorProgram,
      ],
      callback: (feedback) => {
        let source = feedback.options.source

        if (instance.KairosObj.main_background_sourceA === source) return { color: feedback.options.fg, bgcolor: feedback.options.bg }
        else return
      },
    },
    inputSourceB: {
      type: 'advanced',
      label: 'Tally - Preview state',
      description: 'Indicates if an source is in Program',
      options: [
        {
          type: 'dropdown',
          label: 'Source',
          id: 'source',
          default: instance.KairosObj.INPUTS[0].input,
          choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.input, label: id.name })),
        },
				options.foregroundColor,
				options.backgroundColorProgram,
      ],
      callback: (feedback) => {
        let source = feedback.options.source

        if (instance.KairosObj.main_background_sourceB === source) return { color: feedback.options.fg, bgcolor: feedback.options.bg }
        else return
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
          default: instance.KairosObj.INPUTS[0].input,
          choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.input, label: id.name })),
        },
				options.foregroundColor,
				options.backgroundColorProgram,
      ],
      callback: (feedback) => {
				let index = instance.KairosObj.AUX.findIndex(x => x.aux === feedback.options.aux)
        if (instance.KairosObj.AUX[index].live === feedback.options.source) return { color: feedback.options.fg, bgcolor: feedback.options.bg }
        else return
      },
		}
	
  }
}
