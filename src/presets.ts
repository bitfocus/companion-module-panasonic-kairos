import { CompanionPreset } from '../../../instance_skel_types'
import KairosInstance from './index'
import { ActionCallbacks } from './actions'
import { FeedbackCallbacks } from './feedback'

export type PresetCategory =
  | 'Player | play'
  | 'Macro'
  | 'Multiviewer'
  | 'Switching'
  | 'Transition'
  | 'Snapshots'
  | 'Audio Mute'

interface KairosPresetAdditions {
  category: PresetCategory
  actions: ActionCallbacks[]
  release_actions?: ActionCallbacks[]
  feedbacks: FeedbackCallbacks[]
}

export type KairosPreset = Exclude<CompanionPreset, 'category' | 'actions' | 'release_actions' | 'feedbacks'> &
  KairosPresetAdditions

export function getPresets(instance: KairosInstance): KairosPreset[] {
  let presets: KairosPreset[] = []
  // Player
  instance.KairosObj.PLAYERS.forEach((element) => {
    presets.push({
      category: 'Player | play',
      label: element.player + 'play',
      bank: {
        style: 'text',
        text: element.player + '\\nplay',
        size: '24',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'play' } }],
      feedbacks: [],
    })
  })
  // Snapshots
  instance.KairosObj.SNAPSHOTS.forEach((element) => {
    presets.push({
      category: 'Snapshots',
      label: element,
      bank: {
        style: 'text',
        text: element,
        size: '24',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'triggerSnapshot', options: { snapshot: element } }],
      feedbacks: [],
    })
  })
  return presets
}
