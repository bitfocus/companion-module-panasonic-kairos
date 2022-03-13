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
	| 'AUX'

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
	// AUX
	instance.KairosObj.AUX.forEach((element) => {
		element.sources.forEach(source => {
			presets.push({
				category: 'AUX',
				label: element.aux,
				bank: {
					style: 'text',
					text: element.aux + '\\n' + source,
					size: 'auto',
					color: instance.rgb(255, 255, 255),
					bgcolor: instance.rgb(0, 0, 0),
				},
				actions: [{ action: 'setAUX', options: { functionID: '', aux: element.aux, source } }],
				feedbacks: [{
          type: 'aux',
          options: { aux: element.aux, source, fg: instance.rgb(255, 255, 255), bg: instance.rgb(0, 255, 0) },
        },],
			})
		})
	})
  // Player
  instance.KairosObj.PLAYERS.forEach((element) => {
    presets.push({
      category: 'Player | play',
      label: element.player + 'play',
      bank: {
        style: 'text',
        text: element.player + '\\nplay',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'play' } }],
      feedbacks: [],
    })
  })
  // Snapshots
  instance.KairosObj.SCENES.forEach((element) => {
		element.snapshots.forEach(el => {
			presets.push({
				category: 'Snapshots',
				label: el,
				bank: {
					style: 'text',
					text: el,
					size: 'auto',
					color: instance.rgb(255, 255, 255),
					bgcolor: instance.rgb(0, 0, 0),
				},
				actions: [{ action: 'triggerSnapshot', options: { snapshot: el } }],
				feedbacks: [],
			})
		})
  })
  return presets
}
