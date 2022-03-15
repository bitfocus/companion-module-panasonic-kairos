import { CompanionPreset } from '../../../instance_skel_types'
import KairosInstance from './index'
import { ActionCallbacks } from './actions'
import { FeedbackCallbacks } from './feedback'

// export type PresetCategory =
//   | 'Player | play'
//   | 'Macro'
//   | 'Multiviewer'
//   | 'Switching'
//   | 'Transition'
//   | 'Snapshots'
//   | 'Audio Mute'
// 	| 'AUX'

interface KairosPresetAdditions {
  category: string
  actions: ActionCallbacks[]
  release_actions?: ActionCallbacks[]
  feedbacks: FeedbackCallbacks[]
}

export type KairosPreset = Exclude<CompanionPreset, 'category' | 'actions' | 'release_actions' | 'feedbacks'> &
  KairosPresetAdditions

export function getPresets(instance: KairosInstance): KairosPreset[] {
  let presets: KairosPreset[] = []
	// Switch INPUT per Layer
	for (const SCENES of instance.KairosObj.SCENES) {
		for (const LAYER of SCENES.layers) {
			instance.KairosObj.INPUTS.forEach((INPUT) => {
				presets.push({
					category: `${SCENES.scene.slice(7)} | ${LAYER.layer.slice(LAYER.layer.search('.Layers.')+8)} | PGM`,
					label: INPUT.shortcut,
					bank: {
						style: 'text',
						text: `$(kairos:${INPUT.shortcut})`,
						size: '18',
						color: instance.rgb(255, 255, 255),
						bgcolor: instance.rgb(0, 0, 0),
					},
					actions: [{ action: 'setSource', options: { functionID: '', layer: LAYER.layer, sourceAB: 'sourceA', source: INPUT.shortcut } }],
					feedbacks: [{
						type: 'inputSource',
						options: { source: INPUT.shortcut, sourceAB: 'sourceA', layer: LAYER.layer, fg: instance.rgb(255, 255, 255), bg: instance.rgb(255, 0, 0), bg_pvw: instance.rgb(0, 255, 0) },
					},]
				})
			})
			instance.KairosObj.INPUTS.forEach((INPUT) => {
				presets.push({
					category: `${SCENES.scene.slice(7)} | ${LAYER.layer.slice(LAYER.layer.search('.Layers.')+8)} | PVW`,
					label: INPUT.shortcut,
					bank: {
						style: 'text',
						text: `$(kairos:${INPUT.shortcut})`,
						size: '18',
						color: instance.rgb(255, 255, 255),
						bgcolor: instance.rgb(0, 0, 0),
					},
					actions: [{ action: 'setSource', options: { functionID: '', layer: LAYER.layer, sourceAB: 'sourceB', source: INPUT.shortcut } }],
					feedbacks: [{
						type: 'inputSource',
						options: { source: INPUT.shortcut, sourceAB: 'sourceB', layer: LAYER.layer, fg: instance.rgb(255, 255, 255), bg: instance.rgb(255, 0, 0), bg_pvw: instance.rgb(0, 255, 0) },
					},]
				})
			})
		}		
	}
	// Player
  instance.KairosObj.PLAYERS.forEach((element) => {
    presets.push({
      category: 'Player | play',
      label: element.player + 'play',
      bank: {
        style: 'text',
        text: element.player + '\\nplay',
        size: '18',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'play' } }],
      feedbacks: [],
    })
  })
  instance.KairosObj.PLAYERS.forEach((element) => {
    presets.push({
      category: 'Player | stop',
      label: element.player + 'stop',
      bank: {
        style: 'text',
        text: element.player + '\\nstop',
        size: '18',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'stop' } }],
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
					text: el.slice(el.search('.Snapshots.')+11),
					size: '18',
					color: instance.rgb(255, 255, 255),
					bgcolor: instance.rgb(0, 0, 0),
				},
				actions: [{ action: 'triggerSnapshot', options: { snapshot: el } }],
				feedbacks: [],
			})
		})
  })
	// AUX
	instance.KairosObj.AUX.forEach((element) => {
		instance.KairosObj.INPUTS.forEach(INPUT => {
			presets.push({
				category: element.aux,
				label: element.aux,
				bank: {
					style: 'text',
					text: `${element.aux}\\n$(kairos:${INPUT.shortcut})`,
					size: '18',
					color: instance.rgb(255, 255, 255),
					bgcolor: instance.rgb(0, 0, 0),
				},
				actions: [{ action: 'setAUX', options: { functionID: '', aux: element.aux, source: INPUT.shortcut } }],
				feedbacks: [{
          type: 'aux',
          options: { aux: element.aux, source: INPUT.shortcut, fg: instance.rgb(255, 255, 255), bg: instance.rgb(0, 255, 0) },
        },],
			})
		})
	})
  return presets
}
