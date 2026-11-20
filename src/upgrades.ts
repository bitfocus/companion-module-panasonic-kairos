import type {
	CompanionMigrationOptionValues,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
} from '@companion-module/base'
import type { config, secrets } from './config.js'
import { mediaStillLabel } from './utils.js'

/**
 * The audio channel dropdown used to default to 'Channel1', which is not one of its choices ('Channel 1' etc).
 * API 2.x rejects dropdown values that are not in the choices, so rewrite any stored 'ChannelN' to 'Channel N'.
 */
const fixAudioChannelIds: CompanionStaticUpgradeScript<config, secrets> = (_context, props) => {
	const result: CompanionStaticUpgradeResult<config, secrets> = {
		updatedConfig: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}

	const fixChannel = (options: CompanionMigrationOptionValues): boolean => {
		const channel = options.channel
		if (!channel || channel.isExpression || typeof channel.value !== 'string') return false

		const match = /^Channel(\d+)$/.exec(channel.value)
		if (!match) return false

		channel.value = `Channel ${match[1]}`
		return true
	}

	for (const action of props.actions) {
		if (action.actionId === 'muteChannel' && fixChannel(action.options)) result.updatedActions.push(action)
	}
	for (const feedback of props.feedbacks) {
		if (feedback.feedbackId === 'audioMuteChannel' && fixChannel(feedback.options))
			result.updatedFeedbacks.push(feedback)
	}

	return result
}

/**
 * The password used to be a plain config field, it is now a secret so it is hidden and left out of exports
 */
const movePasswordToSecrets: CompanionStaticUpgradeScript<config, secrets> = (_context, props) => {
	const result: CompanionStaticUpgradeResult<config, secrets> = {
		updatedConfig: null,
		updatedSecrets: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}
	if (!props.config || !('password' in props.config)) return result

	const { password, ...updatedConfig } = props.config as config & { password?: unknown }
	result.updatedConfig = updatedConfig
	result.updatedSecrets = { ...props.secrets, password: typeof password === 'string' ? password : '' }
	return result
}

const UUID = '[0-9a-f]+(?:-[0-9a-f]+){4}'

/** The option of each action and feedback that used to store a UUID, and what that looked like */
const ID_OPTIONS: Record<'actions' | 'feedbacks', Record<string, { option: string; pattern: RegExp }>> = {
	actions: {
		setSource: { option: 'layer', pattern: new RegExp(`^/${UUID}/${UUID}$`, 'i') },
		setMediaStill: { option: 'layer', pattern: new RegExp(`^/${UUID}/${UUID}$`, 'i') },
		runAction: { option: 'action', pattern: new RegExp(`^/.+/actions/${UUID}$`, 'i') },
		macroControl: { option: 'macro', pattern: new RegExp(`^${UUID}$`, 'i') },
		macroSceneControl: { option: 'macro', pattern: new RegExp(`^.+/macros/${UUID}$`, 'i') },
		mvRecall: { option: 'mv', pattern: new RegExp(`^${UUID}$`, 'i') },
		triggerSnapshot: { option: 'snapshot', pattern: new RegExp(`^.+/snapshots/${UUID}$`, 'i') },
	},
	feedbacks: {
		macroPlaying: { option: 'macro', pattern: new RegExp(`^${UUID}$`, 'i') },
		sceneMacroPlaying: { option: 'macro', pattern: new RegExp(`^.+/macros/${UUID}$`, 'i') },
	},
}

/**
 * Layers, macros, snapshots etc are now stored by name, so a button works on any KAIROS running the same show. They
 * used to be stored by UUID, which no longer matches a dropdown choice, and an upgrade script can't look up the name
 * as it has no connection to the mixer. So those values move into expression mode, where they keep working as before
 * on the KAIROS they were made on, until the item is chosen again from the list.
 *
 * The layer feedbacks stored the layer's path with a leading `/`. With the scene's folder
 * (`/Templates/2Box/Background`), dropping the `/` matches the list. Before 5.0 they left the folder out
 * (`/2Box/Background`), which still finds the layer but matches no choice, so those become expressions holding it.
 */
const moveIdsToExpressions: CompanionStaticUpgradeScript<config, secrets> = (_context, props) => {
	const result: CompanionStaticUpgradeResult<config, secrets> = {
		updatedConfig: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}

	const moveId = (
		options: CompanionMigrationOptionValues,
		{ option, pattern }: { option: string; pattern: RegExp },
	) => {
		const stored = options[option]
		if (!stored || stored.isExpression || typeof stored.value !== 'string' || !pattern.test(stored.value)) return false
		options[option] = { isExpression: true, value: JSON.stringify(stored.value) }
		return true
	}

	for (const action of props.actions) {
		const idOption = ID_OPTIONS.actions[action.actionId]
		if (idOption && moveId(action.options, idOption)) result.updatedActions.push(action)
	}
	for (const feedback of props.feedbacks) {
		const idOption = ID_OPTIONS.feedbacks[feedback.feedbackId]
		if (idOption && moveId(feedback.options, idOption)) {
			result.updatedFeedbacks.push(feedback)
			continue
		}
		if (feedback.feedbackId !== 'inputSource' && feedback.feedbackId !== 'inputMediaStill') continue
		const layer = feedback.options.layer
		if (!layer || layer.isExpression || typeof layer.value !== 'string' || !layer.value.startsWith('/')) continue
		const path = layer.value.slice(1)
		feedback.options.layer =
			path.split('/').length > 2
				? { isExpression: false, value: path }
				: { isExpression: true, value: JSON.stringify(layer.value) }
		result.updatedFeedbacks.push(feedback)
	}

	return result
}

/**
 * Transitions and still images are now stored like everything else, with `/` between the parts (`Templates/2Box/BgdMix`,
 * `Logos/Intro.rr`), instead of as their TCP path (`Templates/2Box.BgdMix`, `MEDIA.stills.Logos.Intro&#46;rr`).
 *
 * Before 5.0 transitions left out the scene's folder (`2Box.BgdMix`), which can't be added back without the mixer, so
 * those become expressions holding the old value, which still finds the transition.
 */
const useSlashesForTransitionsAndStills: CompanionStaticUpgradeScript<config, secrets> = (_context, props) => {
	const result: CompanionStaticUpgradeResult<config, secrets> = {
		updatedConfig: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}

	const storedString = (options: CompanionMigrationOptionValues, option: string): string | undefined => {
		const stored = options[option]
		return stored && !stored.isExpression && typeof stored.value === 'string' ? stored.value : undefined
	}

	for (const action of props.actions) {
		if (action.actionId === 'autoTransition' || action.actionId === 'cutTransition') {
			const value = storedString(action.options, 'layer')
			const dot = value?.lastIndexOf('.') ?? -1
			// Already `Scene/Transition` if a `/` follows the last dot, which is then in a name (`Templates/Show.1/BgdMix`)
			if (value === undefined || dot === -1 || value.includes('/', dot)) continue
			const scene = value.slice(0, dot)
			action.options.layer = scene.includes('/')
				? { isExpression: false, value: `${scene}/${value.slice(dot + 1)}` }
				: { isExpression: true, value: JSON.stringify(value) }
			result.updatedActions.push(action)
		} else if (action.actionId === 'setMediaStill') {
			const value = storedString(action.options, 'source')
			if (!value?.startsWith('MEDIA.stills.')) continue
			action.options.source = { isExpression: false, value: mediaStillLabel(value) }
			result.updatedActions.push(action)
		}
	}
	for (const feedback of props.feedbacks) {
		if (feedback.feedbackId !== 'inputMediaStill') continue
		const value = storedString(feedback.options, 'source')
		if (!value?.startsWith('MEDIA.stills.')) continue
		feedback.options.source = { isExpression: false, value: mediaStillLabel(value) }
		result.updatedFeedbacks.push(feedback)
	}

	return result
}

export const UpgradeScripts: CompanionStaticUpgradeScript<config, secrets>[] = [
	fixAudioChannelIds,
	movePasswordToSecrets,
	moveIdsToExpressions,
	useSlashesForTransitionsAndStills,
]
