import { CompanionActionEventInfo, CompanionActionEvent, SomeCompanionInputField } from '../../../instance_skel_types'
import { options } from './utils'
import KairosInstance from './index'

type MixOptionEntry = 0 | 1 | 2 | 3 | -1

export interface KairosActions {
  // Get
  getList: KairosAction<GetListCallback>
  // Input
  previewInput: KairosAction<PreviewInputCallback>
  // Transition
  programCut: KairosAction<ProgramCutCallback>
  // Index signature
  [key: string]: KairosAction<any>
}

//Get
interface GetListCallback {
  action: 'getList'
  options: Readonly<{
    functionID: 'inputs' | 'scenes' | 'aux' | 'marcos'
  }>
}

// Input
interface PreviewInputCallback {
  action: 'previewInput'
  options: Readonly<{
    input: string
    mix: MixOptionEntry
  }>
}

// Transition
interface ProgramCutCallback {
  action: 'programCut'
  options: Readonly<{
    input: string
    mix: MixOptionEntry
  }>
}

export type ActionCallbacks =
  //Get
  | GetListCallback

  // Input
  | PreviewInputCallback

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

    if (instance.restClient) instance.restClient.getCommand(functionName)
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
          default: 'inputs',
          choices: [
            { id: 'inputs', label: 'Inputs' },
            { id: 'scenes', label: 'Scenes' },
            { id: 'aux', label: 'Aux' },
            { id: 'macros', label: 'Macros' },
          ],
        },
      ],
      callback: sendBasicCommand,
    },

    // Input
    previewInput: {
      label: 'Input - Send Input to Preview',
      options: [options.input, options.mixSelect],
      callback: sendBasicCommand,
    },

    // Transition
    programCut: {
      label: 'Transition - Send Input to Program',
      options: [options.input, options.mixSelect],
      callback: (action) => {
        const programCut: any = {
          id: 'programCut',
          options: {
            functionID: 'CutDirect',
            input: action.options.input,
            mix: action.options.mix === -1 ? 0 : 1,
          },
        }

        if (programCut.options.mix !== 0) programCut.options.functionID = 'Cut'
        sendBasicCommand(programCut)
      },
    },
  }
}
