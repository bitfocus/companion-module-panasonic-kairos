import type {
	CompanionMigrationOptionValues,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
} from '@companion-module/base'
import type { config } from './config.js'

/**
 * The audio channel dropdown used to default to 'Channel1', which is not one of its choices ('Channel 1' etc).
 * API 2.x rejects dropdown values that are not in the choices, so rewrite any stored 'ChannelN' to 'Channel N'.
 */
const fixAudioChannelIds: CompanionStaticUpgradeScript<config> = (_context, props) => {
	const result: CompanionStaticUpgradeResult<config, undefined> = {
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

export const UpgradeScripts: CompanionStaticUpgradeScript<config>[] = [fixAudioChannelIds]
