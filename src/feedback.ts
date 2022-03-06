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
          default: 'SDI1',
          choices: instance.KairosObj.INPUTS.map((id) => ({ id, label: id })),
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
          default: 'SDI1',
          choices: instance.KairosObj.INPUTS.map((id) => ({ id, label: id })),
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

	
  }
}
