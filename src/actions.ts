import { CompanionActionEventInfo, CompanionActionEvent, SomeCompanionInputField } from '../../../instance_skel_types'
import { options } from './utils'
import KairosInstance from './index'

export interface KairosActions {
  // Get
  getList: KairosAction<GetListCallback>
  // Layer Source Assigment
  setSource: KairosAction<SetSourceACallback>
  // Transition
  programCut: KairosAction<ProgramCutCallback>
  programAuto: KairosAction<ProgramAutoCallback>
  // Index signature
  [key: string]: KairosAction<any>
}

//Get
interface GetListCallback {
  action: 'getList'
  options: Readonly<{
    functionID: 'list:SCENES' | 'list:AUX' | 'list:MACROS'
  }>
}
// Layer Source Assignment
interface SetSourceACallback {
  action: 'setSoure'
  options: Readonly<{
    scene: string
    layer: string
		sourceAB: string
    source: string
  }>
}
// Transition
interface ProgramCutCallback {
  action: 'programCut'
  options: Readonly<{
    scene: string
  }>
}
interface ProgramAutoCallback {
  action: 'programAuto'
  options: Readonly<{
    scene: string
  }>
}

export type ActionCallbacks =
  //Get
  | GetListCallback
  // Layer Source Assignment
  | SetSourceACallback
  // Transition
  | ProgramCutCallback

// Force options to have a default to prevent sending undefined values
type InputFieldWithDefault = Exclude<SomeCompanionInputField, 'default'> & { default: string | number | boolean | null }

// Actions specific to Kairos
export interface KairosAction<T> {
  label: string
  description?: string
  options: InputFieldWithDefault[]
  callback: (
    action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>,
    info: Readonly<CompanionActionEventInfo | null>
  ) => void
  subscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
  unsubscribe?: (action: Readonly<Omit<CompanionActionEvent, 'options' | 'id'> & T>) => void
}

export function getActions(instance: KairosInstance): KairosActions {
  /**
   * @param action Action callback object
   * @param _info Unused
   * @description Sends functions/params from actions that don't require complex logic
   */

  const sendBasicCommand = (action: Readonly<ActionCallbacks>, _info?: CompanionActionEventInfo | null): void => {
    let functionName: string = action.action

    if ('functionID' in action.options) {
      functionName = action.options.functionID
    }
    console.log('functionName', functionName)

    if (instance.tcp) instance.tcp.sendCommand(functionName)
  }

  return {
    //Get
    getList: {
      label: 'Get list from switcher',
      options: [
        {
          type: 'dropdown',
          label: 'Select transition',
          id: 'functionID',
          default: 'list:SCENES',
          choices: [
            { id: 'list:SCENES', label: 'Scenes' },
            { id: 'list:AUX', label: 'Aux' },
            { id: 'list:MACROS', label: 'Macros' },
          ],
        },
      ],
      callback: sendBasicCommand,
    },

    custom: {
      label: 'Send custom command',
      options: [
        {
          label: 'command',
          type: 'textinput',
          id: 'functionID',
          default: '',
        },
      ],
      callback: sendBasicCommand,
    },
    // Layer Source Assignment
    setSource: {
      label: 'Set Source',
      options: [
        {
					type: 'dropdown',
					label: 'Scene',
					id: 'scene',
					default: 'SCENES.Main',
					choices: instance.KairosObj.SCENES.map((id) => ({ id, label: id })),
				},
        {
          type: 'dropdown',
          label: 'Layer',
          id: 'layer',
          default: 'Background',
          choices: [{ id: 'Background', label: 'Background' },],
        },
        {
          type: 'dropdown',
          label: 'SourceA/B',
          id: 'sourceAB',
          default: 'sourceA',
          choices: [{ id: 'sourceA', label: 'sourceA' },{ id: 'sourceB', label: 'sourceB' },],
        },
        {
          type: 'dropdown',
          label: 'Source',
          id: 'source',
          default: 'SDI1',
          choices: instance.KairosObj.INPUTS.map((id) => ({ id, label: id })),
        },
      ],
      callback: (action) => {
        const setSource: any = {
          id: 'setSource',
          options: {
            functionID: `${action.options.scene}.Layers.${action.options.layer}.${action.options.sourceAB}=${action.options.source}`,
          },
        }
        sendBasicCommand(setSource)
      },
    },
    // Transition
    programCut: {
      label: 'Transition - CUT',
      options: [options.sceneSelect],
      callback: (action) => {
        const programCut: any = {
          id: 'programCut',
          options: {
            functionID: `${action.options.scene}.cut`,
          },
        }

        sendBasicCommand(programCut)
      },
    },
    programAuto: {
      label: 'Transition - AUTO',
      options: [options.sceneSelect],
      callback: (action) => {
        const programAuto: any = {
          id: 'programAuto',
          options: {
            functionID: `${action.options.scene}.auto`,
            scene: action.options.scene,
          },
        }

        sendBasicCommand(programAuto)
      },
    },
  }
}
