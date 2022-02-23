import instance_skel = require('../../../instance_skel')
// const Client = require('node-rest-client').Client
import {
  CompanionActions,
  CompanionConfigField,
  // CompanionFeedbacks,
  CompanionSystem,
  // CompanionPreset,
  // CompanionStaticUpgradeScript,
} from '../../../instance_skel_types'
import { Config } from './config'
import { getActions } from './actions'
import { getConfigFields } from './config'
// import { VMixData } from './data'
// import { getFeedbacks } from './feedback'
// import { getPresets } from './presets'
// import { Indicator } from './indicators'
import { REST } from './http'
// import { getUpgrades } from './upgrade'
// import { Variables } from './variables'


/**
 * Companion instance class for Panasonic Kairos
 */
class KairosInstance extends instance_skel<Config> {

	restClient!: REST
  
	constructor(system: CompanionSystem, id: string, config: Config) {
    super(system, id, config)
    this.system = system
    this.config = config
  }
 
  /**
   * @description triggered on instance being enabled
   */
  public init(): void {
    // New Module warning
    this.log(
      'info',
      `Welcome, Panasonic module is loading`
    )

    this.status(this.STATUS_WARNING, 'Connecting')
    // this.variables = new Variables(this)
    this.restClient = new REST(this)

    this.updateInstance()
    // this.setPresetDefinitions(getPresets(this) as CompanionPreset[])
    // this.variables.updateDefinitions()

    // this.checkFeedbacks('mixSelect', 'buttonText')
  }

  /**
   * @returns config options
   * @description generates the config options available for this instance
   */
  public readonly config_fields = (): CompanionConfigField[] => {
    return getConfigFields()
  }

  /**
   * @param config new configuration data
   * @description triggered every time the config for this instance is saved
   */
  public updateConfig(config: Config): void {
    this.config = config
    this.updateInstance()
    // this.setPresetDefinitions(getPresets(this) as CompanionPreset[])
    // if (this.variables) this.variables.updateDefinitions()
  }

  /**
   * @description close connections and stop timers/intervals
   */
  public readonly destroy = (): void => {
    this.log('debug', `Instance destroyed: ${this.id}`)
  }

  /**
   * @description sets actions and feedbacks available for this instance
   */
  private updateInstance(): void {
    // Cast actions and feedbacks from Kairos types to Companion types
    const actions = getActions(this) as CompanionActions
    // const feedbacks = getFeedbacks(this) as CompanionFeedbacks

    this.setActions(actions)
    // this.setFeedbackDefinitions(feedbacks)
  }
}

export = KairosInstance
