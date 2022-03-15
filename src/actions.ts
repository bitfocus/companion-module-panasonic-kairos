import { CompanionActionEventInfo, CompanionActionEvent, SomeCompanionInputField } from '../../../instance_skel_types'
import { options } from './utils'
import KairosInstance from './index'

export interface KairosActions {
  // playerControl
  playerControl: KairosAction<PlayerControlCallback>
  macroControl: KairosAction<MacroControlCallback>
  // AUX
  setAUX: KairosAction<SetAUXCallback>
  // mv Recall
  mvRecall: KairosAction<MvRecallCallback>
  // Layer Source Assignment
  setSource: KairosAction<SetSourceACallback>
  // Transition
  programCut: KairosAction<ProgramCutCallback>
  programAuto: KairosAction<ProgramAutoCallback>
	nextTransition: KairosAction<NextTransitionCallback>
	autoTransition: KairosAction<AutoTransitionCallback>
	cutTransition: KairosAction<CutTransitionCallback>
  // Snapshots
  triggerSnapshot: KairosAction<TriggerSnapshotCallback>
  // Audio mixer control
  muteMaster: KairosAction<MuteMasterCallback>
  muteChannel: KairosAction<MuteChannelCallback>
  // Index signature
  [key: string]: KairosAction<any>
}

// Player Control
interface PlayerControlCallback {
  action: 'playerControl'
  options: Readonly<{
    functionID: ''
    player: string
    action: string
  }>
}
interface MacroControlCallback {
  action: 'macroControl'
  options: Readonly<{
    functionID: ''
    macro: string
    action: string
  }>
}
// AUX
interface SetAUXCallback {
  action: 'setAUX'
  options: Readonly<{
    functionID: ''
    aux: string
    source: string
  }>
}
// MV recall
interface MvRecallCallback {
  action: 'mvRecall'
  options: Readonly<{
    functionID: ''
    mv: string
    preset: string
  }>
}
// Layer Source Assignment
interface SetSourceACallback {
  action: 'setSource'
  options: Readonly<{
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
interface NextTransitionCallback {
  action: 'nextTransition'
  options: Readonly<{
		transition: string
  }>
}
interface AutoTransitionCallback {
  action: 'nextTransition'
  options: Readonly<{
		transition: string
  }>
}
interface CutTransitionCallback {
  action: 'nextTransition'
  options: Readonly<{
		transition: string
  }>
}
// Snapshots
interface TriggerSnapshotCallback {
  action: 'triggerSnapshot'
  options: Readonly<{
    snapshot: string
  }>
}
// Audio
interface MuteMasterCallback {
  action: 'muteMasterCallback'
  options: Readonly<{
    mute: number
  }>
}
interface MuteChannelCallback {
  action: 'muteChannelCallback'
  options: Readonly<{
    channel: string
    mute: number
  }>
}
export type ActionCallbacks =
  | MacroControlCallback
  | PlayerControlCallback
  | SetAUXCallback
  | MvRecallCallback
  | SetSourceACallback
  | ProgramAutoCallback
  | ProgramCutCallback
  | TriggerSnapshotCallback
  | MuteChannelCallback
  | MuteChannelCallback
	| NextTransitionCallback
	| AutoTransitionCallback
	| CutTransitionCallback

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

    if (instance.tcp) instance.tcp.sendCommand(functionName)
  }

  return {
    // Layer Source Assignment
    setSource: {
      label: 'Set Source',
      options: [
        {
          type: 'dropdown',
          label: 'Layer',
          id: 'layer',
          default: instance.combinedLayerArray[0].name,
          choices: instance.combinedLayerArray.map((id) => ({ id: id.name, label: id.name })),
        },
        {
          type: 'dropdown',
          label: 'SourceA/B',
          id: 'sourceAB',
          default: 'sourceA',
          choices: [
            { id: 'sourceA', label: 'sourceA' },
            { id: 'sourceB', label: 'sourceB' },
          ],
        },
        {
          type: 'dropdown',
          label: 'Source',
          id: 'source',
          default: instance.KairosObj.INPUTS[0].input,
          choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.input, label: id.name })),
        },
      ],
      callback: (action) => {
        const setSource: any = {
          id: 'setSource',
          options: {
            // functionID: `${action.options.scene}.Layers.${action.options.layer}.${action.options.sourceAB}=${action.options.source}`,
            functionID: `${action.options.layer}.${action.options.sourceAB}=${action.options.source}`,
          },
        }
				// Don't wait for the value to return from the mixer, set it directly
				let index = instance.combinedLayerArray.findIndex((x) => x.name === action.options.layer)
				if(index != -1) {
					action.options.sourceAB == 'sourceA' ? instance.combinedLayerArray[index].sourceA = action.options.source : instance.combinedLayerArray[index].sourceB = action.options.source
				}
				instance.checkFeedbacks('inputSource')
        sendBasicCommand(setSource)
      },
    },
    // Transition
    programCut: {
      label: 'Transition - CUT',
      options: [
        {
          type: 'dropdown',
          label: 'Scene',
          id: 'scene',
          default: instance.KairosObj.SCENES[0].scene,
          choices: instance.KairosObj.SCENES.map((id) => ({ id: id.scene, label: id.scene.slice(7) })),
        },
      ],
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
      options: [
        {
          type: 'dropdown',
          label: 'Scene',
          id: 'scene',
          default: instance.KairosObj.SCENES[0].scene,
          choices: instance.KairosObj.SCENES.map((id) => ({ id: id.scene, label: id.scene.slice(7) })),
        },
      ],
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
		nextTransition: {
			label: 'Transition - NEXT selected scene',
      options: [
				{
          type: 'dropdown',
          label: 'Set next transition',
          id: 'transition',
          default: instance.combinedTransitionsArray[0],
          choices: instance.combinedTransitionsArray.map((id) => ({ id, label: id.slice(7) })),
        },
      ],
      callback: (action) => {
        const nextTransition: any = {
          id: 'nextTransition',
          options: {
            functionID: `${action.options.transition.slice(0,11)}.next_transition=${action.options.transition.slice(24)}`,
          },
        }
        sendBasicCommand(nextTransition)
      },
		},
		autoTransition: {
			label: 'Transition per scene - AUTO',
      options: [
        {
          type: 'dropdown',
          label: 'Transition per scene',
          id: 'transition',
          default: instance.combinedTransitionsArray[0],
          choices: instance.combinedTransitionsArray.map((id) => ({ id, label: id.slice(7) })),
        },
      ],
      callback: (action) => {
        const autoTransition: any = {
          id: 'autoTransition',
          options: {
            functionID: `${action.options.transition}.transition_auto`,
          },
        }
        sendBasicCommand(autoTransition)
      },
		},
		cutTransition: {
			label: 'Transition per scene - CUT',
      options: [
        {
          type: 'dropdown',
          label: 'Transition per scene',
          id: 'transition',
          default: instance.combinedTransitionsArray[0],
          choices: instance.combinedTransitionsArray.map((id) => ({ id, label: id.slice(7) })),
        },
      ],
      callback: (action) => {
        const cutTransition: any = {
          id: 'cutTransition',
          options: {
            functionID: `${action.options.transition}.transition_auto`,
          },
        }
        sendBasicCommand(cutTransition)
      },
		},
    //AUX
    setAUX: {
      label: 'Set AUX',
      options: [
        {
          type: 'dropdown',
          label: 'AUX',
          id: 'aux',
          default: instance.KairosObj.AUX[0].aux,
          choices: instance.KairosObj.AUX.map((id) => ({ id: id.aux, label: id.aux })),
        },
        {
          type: 'dropdown',
          label: 'Source',
          id: 'source',
          default: instance.KairosObj.INPUTS[0].input,
          choices: instance.KairosObj.INPUTS.map((id) => ({ id: id.input, label: id.name })),
        },
      ],
      callback: (action) => {
        const setAUX: any = {
          id: 'setAUX',
          options: {
            functionID: `${action.options.aux}.source=${action.options.source}`,
          },
        }
        // Don't wait for the value to return from the mixer, set it directly
        let index = instance.KairosObj.AUX.findIndex((x) => x.aux === action.options.aux)
        instance.KairosObj.AUX[index].liveSource = action.options.source
        instance.checkFeedbacks('aux')
        instance.variables?.updateVariables()
        sendBasicCommand(setAUX)
      },
    },
    //Control
    playerControl: {
      label: 'Ram recorder action',
      options: [
        {
          type: 'dropdown',
          label: 'Scene',
          id: 'player',
          default: instance.KairosObj.PLAYERS[0].player,
          choices: instance.KairosObj.PLAYERS.map((element) => ({ id: element.player, label: element.player })),
        },
        options.playerControl,
      ],
      callback: (action) => {
        const playerControl: any = {
          id: 'playerControl',
          options: {
            functionID: `${action.options.player}.${action.options.action}`,
          },
        }
        sendBasicCommand(playerControl)
      },
    },
    macroControl: {
      label: 'Macro action',
      options: [
        {
          type: 'dropdown',
          label: 'Macro',
          id: 'macro',
          default: instance.KairosObj.MACROS[0],
          choices: instance.KairosObj.MACROS.map((id) => ({ id, label: id.slice(7) })),
        },
        options.macroControl,
      ],
      callback: (action) => {
        const macroControl: any = {
          id: 'macroControl',
          options: {
            functionID: `${action.options.macro}.${action.options.action}`,
          },
        }
        sendBasicCommand(macroControl)
      },
    },
    // Recall MV presets
    mvRecall: {
      label: 'Recall multiviewer preset',
      options: [
        {
          type: 'dropdown',
          label: 'Preset',
          id: 'preset',
          default: instance.KairosObj.MV_PRESETS[0],
          choices: instance.KairosObj.MV_PRESETS.map((id) => ({ id, label: id.slice(17) })),
        },
        options.mvRecall,
      ],
      callback: (action) => {
        const mvRecall: any = {
          id: 'mvRecall',
          options: {
            functionID: `${action.options.preset}.${action.options.mv}`,
          },
        }
        sendBasicCommand(mvRecall)
      },
    },
    // Snapshots
    triggerSnapshot: {
      label: 'Trigger snapshots',
      options: [
        {
          type: 'dropdown',
          label: 'snapshot name',
          id: 'snapshot',
          default: instance.combinedSnapshotsArray[0],
          choices: instance.combinedSnapshotsArray.map((id) => ({ id, label: id })),
        },
      ],
      callback: (action) => {
        const triggerSnapshot: any = {
          id: 'triggerSnapshot',
          options: {
            functionID: `${action.options.snapshot}.recall`,
          },
        }

        sendBasicCommand(triggerSnapshot)
      },
    },
    // Custom
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
    //Audio
    muteMaster: {
      label: 'Mute Master',
      options: [options.mute],
      callback: (action) => {
        const muteMaster: any = {
          id: 'muteMaster',
          options: {
            functionID: `Mixer.AudioMixers.AudioMixer.mute=${action.options.mute}`,
          },
        }
        instance.KairosObj.audio_master_mute = action.options.mute
        instance.checkFeedbacks('audioMuteMaster')
        instance.variables?.updateVariables()
        sendBasicCommand(muteMaster)
      },
    },
    muteChannel: {
      label: 'Mute Channel',
      options: [options.channel, options.mute],
      callback: (action) => {
        const muteChannel: any = {
          id: 'muteChannel',
          options: {
            functionID: `Mixer.AudioMixers.AudioMixer.${action.options.channel}.mute=${action.options.mute}`,
          },
        }
        let channelNumber = parseInt(action.options.channel.slice(7)) - 1
        instance.KairosObj.AUDIO_CHANNELS[channelNumber].mute = action.options.mute
        instance.checkFeedbacks('audioMuteChannel')
        instance.variables?.updateVariables()
        sendBasicCommand(muteChannel)
      },
    },
  }
}
