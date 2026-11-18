import type { CompanionInputFieldDropdown } from '@companion-module/base'

interface input {
	index: number
	name: string
	tally: number
	uuid: string
	shortcut: string
}

export enum updateFlags {
	onlyVariables = 1,
	All = 2,
	presets = 3,
}

export type SourceAB = 'sourceA' | 'sourceB'

// Force options to have a default to prevent sending undefined values
type EnforceDefault<T, U> = Omit<T, 'default'> & { default: U }

export interface Options {
	playerControl: EnforceDefault<CompanionInputFieldDropdown<'action', string>, string>
	macroStateControl: EnforceDefault<CompanionInputFieldDropdown<'action', string>, string>
	mute: EnforceDefault<CompanionInputFieldDropdown<'mute', number>, number>
	channel: EnforceDefault<CompanionInputFieldDropdown<'channel', string>, string>
}

/**
 * @description Common Action and Feedback options
 */
export const options: Options = {
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
			{ id: 'stop', label: 'Stop' },
			{ id: 'record', label: 'Record' },
			{ id: 'stop_record', label: 'Stop record' },
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
		default: 'Channel 1',
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
}

export const createUUID = (): string => {
	let dt: number = new Date().getTime()
	const uuid: string = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r: number = ((dt + Math.random() * 16) % 16) | 0
		dt = Math.floor(dt / 16)
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
	})
	return uuid
}

export const createInputWithName = (name: string): input => {
	return {
		index: 999,
		name: name,
		tally: 0,
		uuid: createUUID(),
		shortcut: name,
	}
}
