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
  for (const LAYER of instance.combinedLayerArray) {
    instance.KairosObj.INPUTS.forEach((INPUT) => {
      presets.push({
        category: `${LAYER.name.slice(7, LAYER.name.search('.Layers.'))} | ${LAYER.name.slice(
          LAYER.name.search('.Layers.') + 8
        )} | PGM`,
        label: INPUT.shortcut,
        bank: {
          style: 'text',
          text: `$(kairos:${INPUT.shortcut})`,
          size: '18',
          color: instance.rgb(255, 255, 255),
          bgcolor: instance.rgb(0, 0, 0),
        },
        actions: [
          {
            action: 'setSource',
            options: { functionID: '', layer: LAYER.name, sourceAB: 'sourceA', source: INPUT.shortcut },
          },
        ],
        feedbacks: [
          {
            type: 'inputSource',
            options: {
              source: INPUT.shortcut,
              sourceAB: 'sourceA',
              layer: LAYER.name,
              fg: instance.rgb(255, 255, 255),
              bg: instance.rgb(255, 0, 0),
              bg_pvw: instance.rgb(0, 255, 0),
            },
          },
        ],
      })
    })
    instance.KairosObj.INPUTS.forEach((INPUT) => {
      presets.push({
        category: `${LAYER.name.slice(7, LAYER.name.search('.Layers.'))} | ${LAYER.name.slice(
          LAYER.name.search('.Layers.') + 8
        )} | PVW`,
        label: INPUT.shortcut,
        bank: {
          style: 'text',
          text: `$(kairos:${INPUT.shortcut})`,
          size: '18',
          color: instance.rgb(255, 255, 255),
          bgcolor: instance.rgb(0, 0, 0),
        },
        actions: [
          {
            action: 'setSource',
            options: { functionID: '', layer: LAYER.name, sourceAB: 'sourceB', source: INPUT.shortcut },
          },
        ],
        feedbacks: [
          {
            type: 'inputSource',
            options: {
              source: INPUT.shortcut,
              sourceAB: 'sourceB',
              layer: LAYER.name,
              fg: instance.rgb(255, 255, 255),
              bg: instance.rgb(255, 0, 0),
              bg_pvw: instance.rgb(0, 255, 0),
            },
          },
        ],
      })
    })
		instance.KairosObj.MEDIA_STILLS.forEach((STILL) => {
			presets.push({
				category: `MEDIASTILL`,
				label: STILL,
				bank: {
					style: 'text',
					text: `${STILL.slice(13)}\\nPGM`,
					size: 'auto',
					color: instance.rgb(255, 255, 255),
					bgcolor: instance.rgb(0, 0, 0),
				},
				actions: [
					{
						action: 'setMediaStill',
						options: { functionID: '', layer: LAYER.name, sourceAB: 'sourceA', source: STILL },
					},
				],
				feedbacks: [
					{
						type: 'inputSource',
						options: {
							source: STILL,
							sourceAB: 'sourceA',
							layer: LAYER.name,
							fg: instance.rgb(255, 255, 255),
							bg: instance.rgb(255, 0, 0),
							bg_pvw: instance.rgb(0, 255, 0),
						},
					},
				],
			})
		})
		// instance.KairosObj.MEDIA_STILLS.forEach((STILL) => {
		// 	presets.push({
		// 		category: `MEDIASTILL`,
		// 		label: STILL,
		// 		bank: {
		// 			style: 'text',
		// 			text: `${STILL.slice(13)}\\nPVW`,
		// 			size: 'auto',
		// 			color: instance.rgb(255, 255, 255),
		// 			bgcolor: instance.rgb(0, 0, 0),
		// 		},
		// 		actions: [
		// 			{
		// 				action: 'setMediaStill',
		// 				options: { functionID: '', layer: LAYER.name, sourceAB: 'sourceB', source: STILL },
		// 			},
		// 		],
		// 		feedbacks: [
		// 			{
		// 				type: 'inputSource',
		// 				options: {
		// 					source: STILL,
		// 					sourceAB: 'sourceB',
		// 					layer: LAYER.name,
		// 					fg: instance.rgb(255, 255, 255),
		// 					bg: instance.rgb(255, 0, 0),
		// 					bg_pvw: instance.rgb(0, 255, 0),
		// 				},
		// 			},
		// 		],
		// 	})
		// })
  }
  // Player
  instance.KairosObj.PLAYERS.forEach((element) => {
    presets.push({
      category: 'PLAYERS',
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
    presets.push({
      category: 'PLAYERS',
      label: element.player + 'stop',
      bank: {
        style: 'text',
        text: element.player + '\\nstop',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'stop' } }],
      feedbacks: [],
    })
    presets.push({
      category: 'PLAYERS',
      label: element.player + 'pause',
      bank: {
        style: 'text',
        text: element.player + '\\npause',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'pause' } }],
      feedbacks: [],
    })
    presets.push({
      category: 'PLAYERS',
      label: element.player + 'begin',
      bank: {
        style: 'text',
        text: element.player + '\\nbegin',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'begin' } }],
      feedbacks: [],
    })
		presets.push({
      category: 'PLAYERS',
      label: element.player + 'rewind',
      bank: {
        style: 'text',
        text: element.player + '\\nrewind',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'rewind' } }],
      feedbacks: [],
    })
		presets.push({
      category: 'PLAYERS',
      label: element.player + 'step_back',
      bank: {
        style: 'text',
        text: element.player + '\\nstep_back',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'step_back' } }],
      feedbacks: [],
    })
		presets.push({
      category: 'PLAYERS',
      label: element.player + 'reverse_play',
      bank: {
        style: 'text',
        text: element.player + '\\nreverse_play',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'reverse_play' } }],
      feedbacks: [],
    })
		presets.push({
      category: 'PLAYERS',
      label: element.player + 'step_forward',
      bank: {
        style: 'text',
        text: element.player + '\\nstep_forward',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'step_forward' } }],
      feedbacks: [],
    })
		presets.push({
      category: 'PLAYERS',
      label: element.player + 'fast_forward',
      bank: {
        style: 'text',
        text: element.player + '\\nfast_forward',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'fast_forward' } }],
      feedbacks: [],
    })
		presets.push({
      category: 'PLAYERS',
      label: element.player + 'end',
      bank: {
        style: 'text',
        text: element.player + '\\nend',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'end' } }],
      feedbacks: [],
    })
		presets.push({
      category: 'PLAYERS',
      label: element.player + 'repeat',
      bank: {
        style: 'text',
        text: element.player + '\\nRepeat off',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'repeat=0' } }],
      feedbacks: [],
    })
		presets.push({
      category: 'PLAYERS',
      label: element.player + 'repeat',
      bank: {
        style: 'text',
        text: element.player + '\\nRepeat on',
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'playerControl', options: { functionID: '', player: element.player, action: 'repeat=1' } }],
      feedbacks: [],
    })
  })
  // Snapshots & scene transitions
  instance.KairosObj.SCENES.forEach((SCENE) => {
		presets.push({
			category: 'TRANSITIONS',
			label: 'Program Cut',
			bank: {
				style: 'text',
				text: `${SCENE.scene}\\nCUT`,
				size: 'auto',
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(255, 0, 0),
			},
			actions: [{ action: 'programCut', options: { scene: SCENE.scene } }],
			feedbacks: [],
		})
		presets.push({
			category: 'TRANSITIONS',
			label: 'Program Auto',
			bank: {
				style: 'text',
				text: `${SCENE.scene}\\nAUTO`,
				size: 'auto',
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(255, 0, 0),
			},
			actions: [{ action: 'programAuto', options: { scene: SCENE.scene } }],
			feedbacks: [],
		})
    SCENE.snapshots.forEach((SNAPSHOT) => {
      presets.push({
        category: 'Snapshots',
        label: SNAPSHOT,
        bank: {
          style: 'text',
          text: SNAPSHOT.slice(SNAPSHOT.search('.Snapshots.') + 11),
          size: 'auto',
          color: instance.rgb(255, 255, 255),
          bgcolor: instance.rgb(0, 0, 0),
        },
        actions: [{ action: 'triggerSnapshot', options: { snapshot: SNAPSHOT } }],
        feedbacks: [],
      })
    })
  })
  // AUX
  instance.KairosObj.AUX.forEach((element) => {
    instance.KairosObj.INPUTS.forEach((INPUT) => {
      presets.push({
        category: element.aux,
        label: element.aux,
        bank: {
          style: 'text',
          text: `${element.aux}\\n$(kairos:${INPUT.shortcut})`,
          size: 'auto',
          color: instance.rgb(255, 255, 255),
          bgcolor: instance.rgb(0, 0, 0),
        },
        actions: [{ action: 'setAUX', options: { functionID: '', aux: element.aux, source: INPUT.shortcut } }],
        feedbacks: [
          {
            type: 'aux',
            options: {
              aux: element.aux,
              source: INPUT.shortcut,
              fg: instance.rgb(255, 255, 255),
              bg: instance.rgb(0, 255, 0),
            },
          },
        ],
      })
    })
  })
  // MACRO
  instance.KairosObj.MACROS.forEach((MACRO) => {
    presets.push({
      category: 'MACROS',
      label: 'Macros',
      bank: {
        style: 'text',
        text: `${MACRO}\\nplay`,
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'macroControl', options: { functionID: '', macro: MACRO, action: 'play' } }],
      feedbacks: [],
    })
    presets.push({
      category: 'MACROS',
      label: 'Macros',
      bank: {
        style: 'text',
        text: `${MACRO}\\pause`,
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'macroControl', options: { functionID: '', macro: MACRO, action: 'pause' } }],
      feedbacks: [],
    })
    presets.push({
      category: 'MACROS',
      label: 'Macros',
      bank: {
        style: 'text',
        text: `${MACRO}\\nstop`,
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'macroControl', options: { functionID: '', macro: MACRO, action: 'stop' } }],
      feedbacks: [],
    })
    presets.push({
      category: 'MACROS',
      label: 'Macros',
      bank: {
        style: 'text',
        text: `${MACRO}\\nrecord`,
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'macroControl', options: { functionID: '', macro: MACRO, action: 'record' } }],
      feedbacks: [],
    })
    presets.push({
      category: 'MACRO',
      label: 'Macros',
      bank: {
        style: 'text',
        text: `${MACRO}\\nstop record`,
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'macroControl', options: { functionID: '', macro: MACRO, action: 'stop_record' } }],
      feedbacks: [],
    })
  })
  // MULTIVIEWER
  instance.KairosObj.MV_PRESETS.forEach((PRESET) => {
    presets.push({
      category: 'Multiviewer presets | MV1',
      label: 'Macros',
      bank: {
        style: 'text',
        text: `${PRESET}`,
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'mvRecall', options: { functionID: '', preset: PRESET, mv: 'recall_mv1' } }],
      feedbacks: [],
    })
    presets.push({
      category: 'Multiviewer presets | MV2',
      label: 'Macros',
      bank: {
        style: 'text',
        text: `${PRESET}`,
        size: 'auto',
        color: instance.rgb(255, 255, 255),
        bgcolor: instance.rgb(0, 0, 0),
      },
      actions: [{ action: 'mvRecall', options: { functionID: '', preset: PRESET, mv: 'recall_mv2' } }],
      feedbacks: [],
    })
  })
  // AUDIO
  presets.push({
    category: 'AUDIO MUTE',
    label: 'MUTE',
    bank: {
      style: 'text',
      text: 'MASTER\\nMUTE',
      size: '14',
      color: instance.rgb(255, 255, 255),
      bgcolor: instance.rgb(0, 0, 0),
			latch: true,
    },
    actions: [{ action: 'muteMaster', options: { mute: 1 } }],
    release_actions: [{ action: 'muteMaster', options: { mute: 0 } }],
    feedbacks: [
      {
        type: 'audioMuteMaster',
        options: {
          mute: 1,
          fg: instance.rgb(255, 255, 255),
          bg: instance.rgb(0, 255, 255),
        },
      },
    ],
  })
	instance.KairosObj.AUDIO_CHANNELS.forEach((CHANNEL) => {
		presets.push({
			category: 'AUDIO MUTE',
			label: 'MUTE',
			bank: {
				style: 'text',
				text: `${CHANNEL.channel}\\nMUTE`,
				size: '14',
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(0, 0, 0),
				latch: true,
			},
			actions: [{ action: 'muteChannel', options: { channel: CHANNEL.channel, mute: 1 } }],
			release_actions: [{ action: 'muteChannel', options: { channel: CHANNEL.channel, mute: 0 } }],
			feedbacks: [
				{
					type: 'audioMuteChannel',
					options: {
						channel: CHANNEL.channel,
						mute: 1,
						fg: instance.rgb(255, 255, 255),
						bg: instance.rgb(0, 255, 255),
					},
				},
			],
		})
	})
	// TRANSITIONS
	instance.combinedTransitionsArray.forEach((TRANSITION) => {
		presets.push({
			category: 'TRANSITIONS',
			label: 'Next transition',
			bank: {
				style: 'text',
				text: `${TRANSITION}\\nNext transition`,
				size: '14',
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(0, 0, 0),
			},
			actions: [{ action: 'nextTransition', options: { transition: TRANSITION } }],
			feedbacks: [],
		})
		presets.push({
			category: 'TRANSITIONS',
			label: 'Cut transition',
			bank: {
				style: 'text',
				text: `${TRANSITION}\\nCUT`,
				size: 'auto',
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(0, 0, 0),
			},
			actions: [{ action: 'cutTransition', options: { layer: TRANSITION } }],
			feedbacks: [],
		})
		presets.push({
			category: 'TRANSITIONS',
			label: 'Auto transition',
			bank: {
				style: 'text',
				text: `${TRANSITION}\\nAUTO`,
				size: 'auto',
				color: instance.rgb(255, 255, 255),
				bgcolor: instance.rgb(0, 0, 0),
			},
			actions: [{ action: 'autoTransition', options: { layer: TRANSITION } }],
			feedbacks: [],
		})
	})
  return presets
}
