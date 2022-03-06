import instance_skel = require('../../../instance_skel')
import {
  CompanionActions,
  CompanionConfigField,
  CompanionFeedbacks,
  CompanionSystem,
  // CompanionPreset,
  // CompanionStaticUpgradeScript,
} from '../../../instance_skel_types'
import { Config } from './config'
import { getActions } from './actions'
import { getConfigFields } from './config'
import { getFeedbacks } from './feedback'
// import { getPresets } from './presets'
// import { Indicator } from './indicators'
import { TCP } from './tcp'
// import { getUpgrades } from './upgrade'
import { Variables } from './variables'


/**
 * Companion instance class for Panasonic Kairos
 */
class KairosInstance extends instance_skel<Config> {

	constructor(system: CompanionSystem, id: string, config: Config) {
    super(system, id, config)
    this.system = system
    this.config = config
  }
	public KairosObj!: { main_background_sourceA: string, main_background_sourceB: string, INPUTS: Array<string>; SCENES: Array<string>; AUX: Array<string>} 

  public connected = false
  public tcp: TCP | null = null
	public variables: Variables | null = null

  /**
   * @description triggered on instance being enabled
   */
  public init(): void {
    // New Module warning
    this.log(
      'info',
      `Welcome, Panasonic module is loading`
    )
		this.variables = new Variables(this)
		this.tcp = new TCP(this)
    this.status(this.STATUS_WARNING, 'Connecting')

    this.updateInstance()
		this.variables.updateDefinitions()
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
    if (this.variables) this.variables.updateDefinitions()

  }

  /**
   * @description close connections and stop timers/intervals
   */
  public readonly destroy = (): void => {
    this.log('debug', `Instance destroyed: ${this.id}`)
  }

//  /**
//    * @param option string from text inputs
//    * @returns array of strings indexed by the button modifier delimiter
//    * @description first splits the string by the position of the delimiter, then parses any instance variables in each part
//    */
//   public readonly parseOption = (option: string): string[] => {
//     const instanceVariable = RegExp(/\$\(([^:$)]+):([^)$]+)\)/)

//     return option.split(this.config.shiftDelimiter).map((value) => {
//       if (instanceVariable.test(value)) {
//         return this.variables ? this.variables.get(value) || '' : ''
//       } else {
//         return value
//       }
//     })
//   }
  /**
   * @description sets actions and feedbacks available for this instance
   */
  public updateInstance(): void {
    // Cast actions and feedbacks from Kairos types to Companion types
    const actions = getActions(this) as CompanionActions
    const feedbacks = getFeedbacks(this) as CompanionFeedbacks

    this.setActions(actions)
    this.setFeedbackDefinitions(feedbacks)
  }
}

export = KairosInstance
