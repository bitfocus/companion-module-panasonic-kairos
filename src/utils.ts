import {
  CompanionInputFieldColor,
  CompanionInputFieldDropdown,
  CompanionInputFieldNumber,
  CompanionInputFieldTextInput,
} from '../../../instance_skel_types'

type TimeFormat = 'hh:mm:ss' | 'hh:mm:ss.ms' | 'mm:ss' | 'mm:ss.ms'

// interface NumericDropdownChoice {
//   id: number
//   label: string
// }

// interface NumericInputFieldDropown extends Exclude<CompanionInputFieldDropdown, 'choices'> {
//   choices: NumericDropdownChoice[]
// }

// Force options to have a default to prevent sending undefined values
type EnforceDefault<T, U> = Omit<T, 'default'> & { default: U }

export interface Options {
  input: EnforceDefault<CompanionInputFieldTextInput, string>
  sceneSelect: EnforceDefault<CompanionInputFieldDropdown, string>
  layerSelect: EnforceDefault<CompanionInputFieldDropdown, string>
  sourceSelect: EnforceDefault<CompanionInputFieldDropdown, string>
  foregroundColor: EnforceDefault<CompanionInputFieldColor, number>
  foregroundColorBlack: EnforceDefault<CompanionInputFieldColor, number>
  backgroundColorPreview: EnforceDefault<CompanionInputFieldColor, number>
  backgroundColorProgram: EnforceDefault<CompanionInputFieldColor, number>
  backgroundColorYellow: EnforceDefault<CompanionInputFieldColor, number>
  selectedIndex: EnforceDefault<CompanionInputFieldNumber, number>
  comparison: EnforceDefault<CompanionInputFieldDropdown, string>
}

// Static Variables
export const TRANSITIONS = ['cut', 'auto'] as const
export const SOURCES = ['IP1', 'IP2', 'IP3'] as const

/**
 * @param red 0-255
 * @param green 0-255
 * @param blue 0-255
 * @returns RGB value encoded for Companion Bank styling
 */
export const rgb = (red: number, green: number, blue: number): number => {
  return ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff)
}

/**
 * @description Common Action and Feedback options
 */
export const options: Options = {
  input: {
    type: 'textinput',
    label: 'Input',
    id: 'input',
    default: '1',
    tooltip: 'Number, Name, or GUID',
  },

  sceneSelect: {
    type: 'dropdown',
    label: 'Scene',
    id: 'scene',
    default: 'SCENES.Main',
    choices: [
      { id: 'SCENES.Main', label: 'Main' },
      { id: 'SCENES.Test1', label: 'Test1' },
      { id: 'SCENES.New Scene-1', label: 'New Scene-1' },
    ],
  },

  layerSelect: {
    type: 'dropdown',
    label: 'Layer',
    id: 'layer',
    default: 'Background',
    choices: [
      { id: 'Background', label: 'Background' },
      { id: 'Layer-1', label: 'Layer-1' },
      { id: 'Layer-2', label: 'Layer-2' },
    ],
  },

  sourceSelect: {
    type: 'dropdown',
    label: 'Source',
    id: 'source',
    default: 'SDI1',
    choices: SOURCES.map((id) => ({ id, label: id })),
  },

  foregroundColor: {
    type: 'colorpicker',
    label: 'Foreground color',
    id: 'fg',
    default: rgb(255, 255, 255),
  },

  foregroundColorBlack: {
    type: 'colorpicker',
    label: 'Foreground color',
    id: 'fg',
    default: rgb(0, 0, 0),
  },

  backgroundColorPreview: {
    type: 'colorpicker',
    label: 'Background color',
    id: 'bg',
    default: rgb(0, 255, 0),
  },

  backgroundColorProgram: {
    type: 'colorpicker',
    label: 'Background color',
    id: 'bg',
    default: rgb(255, 0, 0),
  },

  backgroundColorYellow: {
    type: 'colorpicker',
    label: 'Background color',
    id: 'bg',
    default: rgb(255, 255, 0),
  },

  selectedIndex: {
    type: 'number',
    label: 'Selected Index',
    id: 'selectedIndex',
    default: 1,
    min: 1,
    max: 9999,
  },

  comparison: {
    type: 'dropdown',
    label: 'Comparison',
    id: 'comparison',
    default: 'eq',
    choices: [
      { id: 'eq', label: '=' },
      { id: 'lt', label: '<' },
      { id: 'lte', label: '<=' },
      { id: 'gt', label: '>' },
      { id: 'gte', label: '>=' },
    ],
  },
}

/**
 * @param time Time in miliseconds or seconds
 * @param interval Interval of the time value - 'ms' or 's'
 * @param format String formatting - 'hh:mm:ss', 'hh:mm:ss.ms', 'mm:ss', or 'mm:ss.ms'
 * @returns Formated time string
 */
export const formatTime = (time: number, interval: 'ms' | 's', format: TimeFormat): string => {
  const timeMS = time * (interval === 'ms' ? 1 : 1000)
  const padding = (value: number): string => (value < 10 ? '0' + value : value.toString())

  const hh = padding(Math.floor(timeMS / 360000))
  const mm = padding(Math.floor(timeMS / 60000) % 60)
  const ss = padding(Math.floor(timeMS / 1000) % 60)
  const ms = (timeMS % 1000) / 100

  const result = `${format.includes('hh') ? `${hh}:` : ''}${mm}:${ss}${format.includes('ms') ? `.${ms}` : ''}`
  return result
}
