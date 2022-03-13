import KairosInstance from './'
import _ from 'lodash'

interface InstanceVariableDefinition {
  label: string
  name: string
  type?: string
}

interface InstanceVariableValue {
  [key: string]: string | number | undefined
}

export class Variables {
  private readonly instance: KairosInstance

  constructor(instance: KairosInstance) {
    this.instance = instance
  }

  /**
   * @param name Instance variable name
   * @returns Value of instance variable or undefined
   * @description Retrieves instance variable from any Kairos instances
   */
  public readonly get = (variable: string): string | undefined => {
    let data

    this.instance.parseVariables(variable, (value) => {
      data = value
    })

    return data
  }

  /**
   * @param variables Object of variablenames and their values
   * @description Updates or removes variable for current instance
   */
  public readonly set = (variables: InstanceVariableValue): void => {
    const newVariables: { [variableId: string]: string | undefined } = {}

    for (const name in variables) {
      newVariables[name] = variables[name]?.toString()
    }

    this.instance.setVariables(newVariables)
  }

  /**
   * @description Sets variable definitions
   */
  public readonly updateDefinitions = (): void => {
    const variables: Set<InstanceVariableDefinition> = new Set([
      // Status
      { label: 'Input on Main Background SourceA', name: 'main_background_sourceA' },
      { label: 'Input on Main Background SourceB', name: 'main_background_sourceB' },
    ])
    const audio: Set<InstanceVariableDefinition> = new Set([
      // Status
      { label: 'Mute Master', name: 'mute_master_audio' },
      { label: 'Mute Channel 1', name: 'mute_channel_1' },
      { label: 'Mute Channel 2', name: 'mute_channel_2' },
      { label: 'Mute Channel 3', name: 'mute_channel_3' },
      { label: 'Mute Channel 4', name: 'mute_channel_4' },
      { label: 'Mute Channel 5', name: 'mute_channel_5' },
      { label: 'Mute Channel 6', name: 'mute_channel_6' },
      { label: 'Mute Channel 7', name: 'mute_channel_7' },
      { label: 'Mute Channel 8', name: 'mute_channel_8' },
      { label: 'Mute Channel 9', name: 'mute_channel_9' },
      { label: 'Mute Channel 10', name: 'mute_channel_10' },
      { label: 'Mute Channel 11', name: 'mute_channel_11' },
      { label: 'Mute Channel 12', name: 'mute_channel_12' },
      { label: 'Mute Channel 13', name: 'mute_channel_13' },
      { label: 'Mute Channel 14', name: 'mute_channel_14' },
      { label: 'Mute Channel 15', name: 'mute_channel_15' },
      { label: 'Mute Channel 16', name: 'mute_channel_16' },
    ])
    let auxSources = []
    for (const AUX of this.instance.KairosObj.AUX) {
      auxSources.push({ label: `Source in ${AUX.aux}`, name: AUX.aux })
    }
    let auxAvailable = []
    for (const AUX of this.instance.KairosObj.AUX) {
      auxAvailable.push({ label: `${AUX.aux} available`, name: `${AUX.aux}.available` })
    }
    let playerRepeat = []
    for (const PLAYER of this.instance.KairosObj.PLAYERS) {
      playerRepeat.push({ label: `${PLAYER.player} in repeat modus`, name: `${PLAYER.player}.${PLAYER.repeat}` })
    }

    let filteredVariables = [...variables, ...auxSources, ...audio, ...playerRepeat, ...auxAvailable]

    this.instance.setVariableDefinitions(filteredVariables)
  }

  /**
   * @description Update variables
   */
  public readonly updateVariables = (): void => {
    const newVariables: InstanceVariableValue = {}

    // LIVE
    newVariables['main_background_sourceA'] = this.instance.KairosObj.main_background_sourceA
    newVariables['main_background_sourceB'] = this.instance.KairosObj.main_background_sourceB
    //AUX
    for (const AUX of this.instance.KairosObj.AUX) {
      newVariables[AUX.aux] = AUX.live
      newVariables[`${AUX.aux}.available`] = AUX.available == 0 ? 'disabled' : 'enabled'
    }
    // AUDIO
    for (const PLAYER of this.instance.KairosObj.PLAYERS) {
      newVariables[`${PLAYER.player}.${PLAYER.repeat}`] = PLAYER.repeat == 0 ? 'repeat off' : 'repeat on'
    }
    newVariables['mute_master_audio'] = this.instance.KairosObj.audio_master_mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_1'] = this.instance.KairosObj.AUDIO_CHANNELS[0].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_2'] = this.instance.KairosObj.AUDIO_CHANNELS[1].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_3'] = this.instance.KairosObj.AUDIO_CHANNELS[2].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_4'] = this.instance.KairosObj.AUDIO_CHANNELS[3].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_5'] = this.instance.KairosObj.AUDIO_CHANNELS[4].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_6'] = this.instance.KairosObj.AUDIO_CHANNELS[5].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_7'] = this.instance.KairosObj.AUDIO_CHANNELS[6].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_8'] = this.instance.KairosObj.AUDIO_CHANNELS[7].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_9'] = this.instance.KairosObj.AUDIO_CHANNELS[8].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_10'] = this.instance.KairosObj.AUDIO_CHANNELS[9].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_11'] = this.instance.KairosObj.AUDIO_CHANNELS[10].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_12'] = this.instance.KairosObj.AUDIO_CHANNELS[11].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_13'] = this.instance.KairosObj.AUDIO_CHANNELS[12].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_14'] = this.instance.KairosObj.AUDIO_CHANNELS[13].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_15'] = this.instance.KairosObj.AUDIO_CHANNELS[14].mute == 0 ? 'unmuted' : 'muted'
    newVariables['mute_channel_16'] = this.instance.KairosObj.AUDIO_CHANNELS[15].mute == 0 ? 'unmuted' : 'muted'

    this.set(newVariables)

    this.updateDefinitions()
  }
}
