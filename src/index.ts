import type { config, secrets } from './config.js'
import { getActions, type ActionsSchema } from './actions.js'
import { getConfigFields } from './config.js'
import { FeedbackId, getFeedbacks, type FeedbacksSchema } from './feedback.js'
import { getPresets } from './presets.js'
import { updateBasicVariables } from './variables.js'
import { TCP } from './tcp.js'
import { REST } from './rest.js'
import { InstanceBase, type CompanionVariableValues, type SomeCompanionConfigField } from '@companion-module/base'
import { ConnectionStatus } from './status.js'
import { updateFlags } from './utils.js'
import { emptyMixerState, type MixerState } from './state.js'
import { UpgradeScripts } from './upgrades.js'

export type KairosTypes = {
	config: config
	secrets: secrets
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: CompanionVariableValues
}

export { UpgradeScripts }

export default class KairosInstance extends InstanceBase<KairosTypes> {
	config: config | undefined
	secrets: secrets | undefined
	rest: REST | undefined
	tcp: TCP | undefined
	readonly connectionStatus = new ConnectionStatus(
		(status, message) => this.updateStatus(status, message),
		(level, message) => this.log(level, message),
	)
	constructor(internal: unknown) {
		super(internal)
		// Keep old variable references working without listing the legacy IDs.
		this.instanceOptions.disableVariableValidation = true
	}

	public state: MixerState = emptyMixerState()

	private readonly sentDefinitions = new Map<string, string>()
	private sentVariableValues: CompanionVariableValues = {}

	/**
	 * @description triggered on instance being enabled
	 */
	async init(config: config, _isFirstInit: boolean, secrets: secrets): Promise<void> {
		await this.configUpdated(config, secrets)
	}

	/**
	 * Creates the configuration fields for web config.
	 */
	public getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	/**
	 * @param config new configuration data
	 * @param secrets new secrets, stored apart from the config
	 * @description triggered every time the config for this instance is saved
	 */
	public async configUpdated(config: config, secrets: secrets): Promise<void> {
		this.config = config
		this.secrets = secrets
		this.tcp?.destroy()
		this.rest?.destroy()
		// Forget what the previous connection found, which may have been a different mixer
		this.state = emptyMixerState()
		this.connectionStatus.reset()
		this.tcp = new TCP(this, config.host, config.tcpPort)
		this.rest = new REST(this, config.host, config.restPort, config.username, secrets?.password ?? '')
		this.updateInstance(updateFlags.All)
		this.checkFeedbacks(
			FeedbackId.aux,
			FeedbackId.inputSource,
			FeedbackId.inputMediaStill,
			FeedbackId.audioMuteMaster,
			FeedbackId.audioMuteChannel,
			FeedbackId.playerRepeat,
			FeedbackId.macroPlaying,
			FeedbackId.sceneMacroPlaying,
		)
	}

	/**
	 * @description close connections and stop timers/intervals
	 */
	public async destroy(): Promise<void> {
		this.tcp?.destroy()
		this.rest?.destroy()
		this.tcp = undefined
		this.rest = undefined
		this.log('debug', `Instance destroyed: ${this.id}`)
	}

	/**
	 * @description sets actions and feedbacks available for this instance
	 */
	public updateInstance(updateFlag: updateFlags): void {
		if (updateFlag === updateFlags.All) {
			this.tcp?.sync()
			const actions = getActions(this)
			const feedbacks = getFeedbacks(this)

			if (this.definitionsChanged('actions', actions)) this.setActionDefinitions(actions)
			if (this.definitionsChanged('feedbacks', feedbacks)) this.setFeedbackDefinitions(feedbacks)
			this.updatePresets()
			updateBasicVariables(this)
		} else if (updateFlag === updateFlags.onlyVariables) {
			updateBasicVariables(this)
		} else if (updateFlag === updateFlags.presets) {
			this.updatePresets()
		}
	}

	private updatePresets(): void {
		const { structure, presets } = getPresets(this)
		if (this.definitionsChanged('presets', { structure, presets })) this.setPresetDefinitions(structure, presets)
	}

	/**
	 * REST rebuilds every definition on each poll, and Companion reprocesses (and logs) each one it is sent, so only
	 * send them when they differ from the last ones sent. The callbacks look everything up when they run, so
	 * definitions with the same options behave the same.
	 */
	public definitionsChanged(kind: 'actions' | 'feedbacks' | 'presets' | 'variables', definitions: unknown): boolean {
		const serialized = JSON.stringify(definitions)
		if (this.sentDefinitions.get(kind) === serialized) return false
		this.sentDefinitions.set(kind, serialized)
		return true
	}

	/**
	 * Sends the variable values that differ from the last ones sent
	 * @param resend send them all, as after the variable definitions changed
	 */
	public setChangedVariableValues(values: CompanionVariableValues, resend: boolean): void {
		const changed: CompanionVariableValues = {}
		// Undefined values clear IDs that disappeared, including aliases without definitions.
		for (const id of Object.keys(this.sentVariableValues)) {
			if (!Object.hasOwn(values, id)) {
				changed[id] = undefined
				delete this.sentVariableValues[id]
			}
		}
		for (const [id, value] of Object.entries(values)) {
			const publishedValue = value ?? ''
			if (!resend && Object.hasOwn(this.sentVariableValues, id) && this.sentVariableValues[id] === publishedValue)
				continue
			changed[id] = publishedValue
			this.sentVariableValues[id] = publishedValue
		}
		if (Object.keys(changed).length > 0) this.setVariableValues(changed)
	}
}
