import {
	CompanionInputFieldColor,
	CompanionInputFieldDropdown,
	CompanionInputFieldNumber,
	CompanionInputFieldTextInput,
} from '@companion-module/base'

interface input {
	index: number
	name: string
	tally: number
	uuid: string
	shortcut: string
}

export enum updateFlags {
	None = 0,
	onlyVariables = 1,
	All = 2,
	presets = 3,
}

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
	macroStateControl: EnforceDefault<CompanionInputFieldDropdown, string>
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
export const combineRgb = (red: number, green: number, blue: number): number => {
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
			{ id: 'reverse', label: 'Reverse play' },
			{ id: 'play', label: 'Play' },
			{ id: 'pause', label: 'Pause' },
			//{ id: 'stop', label: 'Stop' },
			{ id: 'step_forward', label: 'Step forward' },
			{ id: 'fast_forward', label: 'Fast forward' },
			{ id: 'end', label: 'Go to End' },
			{ id: 'repeat=0', label: 'Repeat off' },
			{ id: 'repeat=1', label: 'Repeat on' },
		],
	},

	macroStateControl: {
		type: 'dropdown',
		label: 'Macro',
		id: 'action',
		default: 'play',
		choices: [
			{ id: 'play', label: 'Play' },
			//{ id: 'pause', label: 'Pause' },
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
			{ id: 'Channel 1', label: 'Channel 1' },
			{ id: 'Channel 2', label: 'Channel 2' },
			{ id: 'Channel 3', label: 'Channel 3' },
			{ id: 'Channel 4', label: 'Channel 4' },
			{ id: 'Channel 5', label: 'Channel 5' },
			{ id: 'Channel 6', label: 'Channel 6' },
			{ id: 'Channel 7', label: 'Channel 7' },
			{ id: 'Channel 8', label: 'Channel 8' },
			{ id: 'Channel 9', label: 'Channel 9' },
			{ id: 'Channel 10', label: 'Channel 10' },
			{ id: 'Channel 11', label: 'Channel 11' },
			{ id: 'Channel 12', label: 'Channel 12' },
			{ id: 'Channel 13', label: 'Channel 13' },
			{ id: 'Channel 14', label: 'Channel 14' },
			{ id: 'Channel 15', label: 'Channel 15' },
			{ id: 'Channel 16', label: 'Channel 16' },
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
		id: 'color',
		default: combineRgb(255, 255, 255),
	},

	foregroundColorBlack: {
		type: 'colorpicker',
		label: 'Foreground color',
		id: 'color',
		default: combineRgb(0, 0, 0),
	},

	backgroundColorPreview: {
		type: 'colorpicker',
		label: 'Background color when in preview',
		id: 'bgcolor',
		default: combineRgb(0, 255, 0),
	},

	backgroundColorProgram: {
		type: 'colorpicker',
		label: 'Background color when in grogram',
		id: 'bgcolor',
		default: combineRgb(255, 0, 0),
	},

	backgroundColorYellow: {
		type: 'colorpicker',
		label: 'Background color',
		id: 'bgcolor',
		default: combineRgb(255, 255, 0),
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

export const createUUID = (): string => {
	let dt: number = new Date().getTime()
	let uuid: string = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r: number = (dt + Math.random() * 16) % 16 | 0
		dt = Math.floor(dt / 16)
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
	})
	return uuid
}

// Helpers
export const createInputWithName = (name: string): input => {
	return {
		index: 999,
		name: name,
		tally: 0,
		uuid: createUUID(),
		shortcut: name,
	}
}
