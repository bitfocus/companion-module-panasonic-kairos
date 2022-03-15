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
  playerControl: EnforceDefault<CompanionInputFieldDropdown, string>
  macroControl: EnforceDefault<CompanionInputFieldDropdown, string>
  mvRecall: EnforceDefault<CompanionInputFieldDropdown, string>
	mute: EnforceDefault<CompanionInputFieldDropdown, number>
	channel: EnforceDefault<CompanionInputFieldDropdown, string>
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

  playerControl: {
    type: 'dropdown',
    label: 'Action',
    id: 'action',
    default: 'begin',
    choices: [
      { id: 'begin', label: 'Go to Begin' },
      { id: 'rewind', label: 'Rewind' },
      { id: 'step_back', label: 'Step back' },
      { id: 'reverse_play', label: 'Reverse play' },
      { id: 'play', label: 'Play' },
      { id: 'pause', label: 'Pause' },
      { id: 'stop', label: 'Stop' },
      { id: 'step_forward', label: 'Step forward' },
      { id: 'fast_forward', label: 'Fast forward' },
      { id: 'end', label: 'Go to End' },
      { id: 'repeat=0', label: 'Repeat off' },
      { id: 'repeat=1', label: 'Repeat on' },
    ],
  },

	macroControl: {
    type: 'dropdown',
    label: 'Macro',
    id: 'action',
    default: 'play',
    choices: [
      { id: 'play', label: 'Play' },
      { id: 'pause', label: 'Pause' },
      { id: 'stop', label: 'Stop' },
      { id: 'record', label: 'Record' },
      { id: 'stop_record', label: 'Stop record' },
    ],
  },

	mvRecall: {
    type: 'dropdown',
    label: 'Multiviewer',
    id: 'mv',
    default: 'recall_mv1',
    choices: [
      { id: 'recall_mv1', label: 'Multiviewer 1' },
      { id: 'recall_mv2', label: 'Multiviewer 2' },
    ],
  },

	mute: {
    type: 'dropdown',
    label: 'Mute',
    id: 'mute',
    default: 0,
    choices: [
      { id: 0, label: 'unmute' },
      { id: 1, label: 'mute' },
    ],
  },

	channel: {
    type: 'dropdown',
    label: 'Channel',
    id: 'channel',
    default: 'Channel1',
    choices: [
      { id: 'Channel1', label: 'Channel1' },
      { id: 'Channel2', label: 'Channel2' },
      { id: 'Channel3', label: 'Channel3' },
      { id: 'Channel4', label: 'Channel4' },
      { id: 'Channel5', label: 'Channel5' },
      { id: 'Channel6', label: 'Channel6' },
      { id: 'Channel7', label: 'Channel7' },
      { id: 'Channel8', label: 'Channel8' },
      { id: 'Channel9', label: 'Channel9' },
      { id: 'Channel10', label: 'Channel10' },
      { id: 'Channel11', label: 'Channel11' },
      { id: 'Channel12', label: 'Channel12' },
      { id: 'Channel13', label: 'Channel13' },
      { id: 'Channel14', label: 'Channel14' },
      { id: 'Channel15', label: 'Channel15' },
      { id: 'Channel16', label: 'Channel16' },
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
    label: 'Background color when in preview',
    id: 'bg_pvw',
    default: rgb(0, 255, 0),
  },

  backgroundColorProgram: {
    type: 'colorpicker',
    label: 'Background color when in grogram',
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
