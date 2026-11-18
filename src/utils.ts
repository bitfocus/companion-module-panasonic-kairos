import { combineRgb, type CompanionInputFieldDropdown } from '@companion-module/base'
import { MacroStatus } from 'kairos-connection'

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

/** 0 unmutes, 1 mutes, and 'toggle' does the opposite of the current state */
export type MuteValue = number | 'toggle'

/** Whether to mute, given the mute option and whether it is muted now */
/**
 * The multiviewer presets, for a dropdown. Preset ids are per multiviewer, and every multiviewer has the same ones, so
 * each id is listed once; the multiviewer is chosen in its own option.
 */
export const multiviewerPresetChoices = (
	multiviewers: { presets?: ({ id: string | number; name: string } | null)[] }[],
): { id: string | number; label: string }[] => {
	const names = new Map<string | number, Set<string>>()
	for (const preset of multiviewers.flatMap((multiviewer) => multiviewer.presets ?? [])) {
		if (!preset) continue
		const presetNames = names.get(preset.id) ?? new Set()
		presetNames.add(preset.name)
		names.set(preset.id, presetNames)
	}
	return Array.from(names, ([id, presetNames]) => ({ id, label: Array.from(presetNames).join(' / ') }))
}

/** A macro status reported over TCP, or undefined if it isn't one the library knows */
export const parseMacroStatus = (value: string): MacroStatus | undefined =>
	(Object.values(MacroStatus) as string[]).includes(value) ? (value as MacroStatus) : undefined

export const isMacroPlaying = (status: MacroStatus | undefined): boolean => status === MacroStatus.Playing

// Force options to have a default to prevent sending undefined values
type EnforceDefault<T, U> = Omit<T, 'default'> & { default: U }

export interface Options {
	playerControl: EnforceDefault<CompanionInputFieldDropdown<'action', string>, string>
	macroStateControl: EnforceDefault<CompanionInputFieldDropdown<'action', string>, string>
	mute: EnforceDefault<CompanionInputFieldDropdown<'mute', MuteValue>, MuteValue>
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
			{ id: 'begin', label: 'Go to Start' },
			{ id: 'rewind', label: 'Rewind' },
			{ id: 'step_back', label: 'Step Back' },
			{ id: 'reverse', label: 'Reverse Play' },
			{ id: 'play', label: 'Play' },
			{ id: 'pause', label: 'Pause' },
			{ id: 'step_forward', label: 'Step Forward' },
			{ id: 'fast_forward', label: 'Fast Forward' },
			{ id: 'end', label: 'Go to End' },
			{ id: 'repeat=0', label: 'Repeat Off' },
			{ id: 'repeat=1', label: 'Repeat On' },
			{ id: 'repeat=toggle', label: 'Repeat Toggle' },
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
			{ id: 'stop_record', label: 'Stop Record' },
		],
	},

	mute: {
		type: 'dropdown',
		label: 'Mute',
		id: 'mute',
		default: 0,
		choices: [
			{ id: 0, label: 'Unmute' },
			{ id: 1, label: 'Mute' },
			{ id: 'toggle', label: 'Toggle' },
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

/**
 * A readable name for a media still path, e.g. `MEDIA.stills.Logos.Intro&#46;rr` is `Logos/Intro.rr`
 */
export const mediaStillLabel = (path: string): string =>
	path
		.replace(/^MEDIA\.stills\./, '')
		.split('.')
		.map((part) => part.replace(/&#46;/g, '.'))
		.join('/')

export const WHITE = combineRgb(255, 255, 255)
export const BLACK = combineRgb(0, 0, 0)
export const RED = combineRgb(200, 0, 0)
export const GREEN = combineRgb(0, 200, 0)
export const YELLOW = combineRgb(200, 200, 0)
export const BLUE = combineRgb(0, 0, 200)
export const PURPLE = combineRgb(200, 0, 200)
