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
   * @description Retrieves instance variable from any vMix instances
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

		let filteredVariables = [...variables]
		this.instance.setVariableDefinitions(filteredVariables)

  }

  /**
   * @description Update variables
   */
  public readonly updateVariables = (): void => {
    const newVariables: InstanceVariableValue = {}

    // Status
    newVariables['main_background_sourceA'] = this.instance.KairosObj.main_background_sourceA
    newVariables['main_background_sourceB'] = this.instance.KairosObj.main_background_sourceB

    this.set(newVariables)

    this.updateDefinitions()
  }
}
