import type {
	CompanionMigrationOptionValues,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
} from '@companion-module/base'
import type { config, secrets } from './config.js'

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

export const UpgradeScripts: CompanionStaticUpgradeScript<config, secrets>[] = [
	fixAudioChannelIds,
	movePasswordToSecrets,
]
