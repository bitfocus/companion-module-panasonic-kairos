import KairosInstance from '.'
import { InstanceStatus } from '@companion-module/base'


export class REST {
	private readonly instance: KairosInstance
	host: string
	restPort: number
	username: string
	password: string

	constructor(instance: KairosInstance, host: string, restPort: number, username: string, password: string) {
		this.instance = instance
		this.host = host
		this.restPort = restPort
		this.username = username
		this.password = password

		// this.instance.combinedLayerArray = []
		// this.instance.combinedTransitionsArray = []
		// this.instance.combinedSmacrosArray = []
		// this.instance.combinedSnapshotsArray = []

		// this.instance.KairosObj = {
		// 	audio_master_mute: 0,
		// 	INPUTS: [],
		// 	MEDIA_STILLS: [],
		// 	SCENES: [],
		// 	AUX: [],
		// 	MACROS: [],
		// 	PLAYERS: [
		// 		{ player: 'RR1', repeat: 0 },
		// 		{ player: 'RR2', repeat: 0 },
		// 		{ player: 'RR3', repeat: 0 },
		// 		{ player: 'RR4', repeat: 0 },
		// 		{ player: 'RR5', repeat: 0 },
		// 		{ player: 'RR6', repeat: 0 },
		// 		{ player: 'RR7', repeat: 0 },
		// 		{ player: 'RR8', repeat: 0 },
		// 		{ player: 'CP1', repeat: 0 },
		// 		{ player: 'CP2', repeat: 0 },
		// 		{ player: 'AP1', repeat: 0 },
		// 		{ player: 'AP2', repeat: 0 },
		// 		{ player: 'AP3', repeat: 0 },
		// 		{ player: 'AP4', repeat: 0 },
		// 		{ player: 'AP5', repeat: 0 },
		// 		{ player: 'AP6', repeat: 0 },
		// 		{ player: 'AP7', repeat: 0 },
		// 		{ player: 'AP8', repeat: 0 },
		// 		{ player: 'AP9', repeat: 0 },
		// 		{ player: 'AP10', repeat: 0 },
		// 		{ player: 'AP11', repeat: 0 },
		// 		{ player: 'AP12', repeat: 0 },
		// 		{ player: 'AP13', repeat: 0 },
		// 		{ player: 'AP14', repeat: 0 },
		// 		{ player: 'AP15', repeat: 0 },
		// 		{ player: 'AP16', repeat: 0 },
		// 	],
		// 	MV_PRESETS: [],
		// 	AUDIO_CHANNELS: [
		// 		{ channel: 'Channel 1', mute: 0 },
		// 		{ channel: 'Channel 2', mute: 0 },
		// 		{ channel: 'Channel 3', mute: 0 },
		// 		{ channel: 'Channel 4', mute: 0 },
		// 		{ channel: 'Channel 5', mute: 0 },
		// 		{ channel: 'Channel 6', mute: 0 },
		// 		{ channel: 'Channel 7', mute: 0 },
		// 		{ channel: 'Channel 8', mute: 0 },
		// 		{ channel: 'Channel 9', mute: 0 },
		// 		{ channel: 'Channel 10', mute: 0 },
		// 		{ channel: 'Channel 11', mute: 0 },
		// 		{ channel: 'Channel 12', mute: 0 },
		// 		{ channel: 'Channel 13', mute: 0 },
		// 		{ channel: 'Channel 14', mute: 0 },
		// 		{ channel: 'Channel 15', mute: 0 },
		// 		{ channel: 'Channel 16', mute: 0 },
		// 	],
		// }
		this.init()
	}

	/**
	 * @description Create initial requests to Kairos
	 */
	public readonly init = async (): Promise<void> => {

		let theResult = await this.sendCommand('/scenes')
		try {
			let converted = JSON.parse(theResult)
			this.instance.KairosObj.SCENES = converted
			console.log(this.instance.KairosObj.SCENES)

		} catch (error) {
			console.log(error)
		}

		// // Helpers
		// const addInternalSourceGroup = () => {
		// 	this.instance.KairosObj.INPUTS.push({ shortcut: 'INTSOURCES.MV1', name: 'MV1' })
		// 	this.instance.KairosObj.INPUTS.push({ shortcut: 'INTSOURCES.MV2', name: 'MV2' })
		// 	this.instance.KairosObj.INPUTS.push({ shortcut: 'BLACK', name: 'BLACK' })
		// 	this.instance.KairosObj.INPUTS.push({ shortcut: 'WHITE', name: 'WHITE' })
		// 	this.instance.KairosObj.INPUTS.push({
		// 		shortcut: 'INTSOURCES.ColorBar',
		// 		name: 'ColorBar',
		// 	})
		// 	this.instance.KairosObj.INPUTS.push({
		// 		shortcut: 'INTSOURCES.ColorCircle',
		// 		name: 'ColorCircle',
		// 	})
		// }
		// const addScene = (scene: string) => {
		// 	if (scene !== '')
		// 		this.instance.KairosObj.SCENES.push({
		// 			scene: scene,
		// 			smacros: [],
		// 			snapshots: [],
		// 			layers: [],
		// 			transitions: [],
		// 		})
		// 	this.instance.KairosObj.INPUTS.push({ shortcut: scene, name: scene.slice(7) })
		// }

		// const fetchScenes = () => {
		// 	return new Promise((resolve) => {
		// 		//This is an SCENES list, only at startup so reset
		// 		this.instance.KairosObj.SCENES.length = 0

		// 		this.sendCommand('list:SCENES')
		// 		this.processCallback = (data: Array<string>) => {
		// 			const layers = data.find((element) => element.endsWith('.Layers'))
		// 			if (layers) {
		// 				addScene(layers.substring(0, layers.length - 7))
		// 			} else {
		// 				data.forEach((element) => {
		// 					this.sendCommand(`list:${element}`)
		// 				})
		// 			}

		// 			listFinish().then(() => {
		// 				this.processCallback = null
		// 				resolve('fetch ready')
		// 			})
		// 		}
		// 	})
		// }
		// const fetchStills = () => {
		// 	return new Promise((resolve) => {
		// 		this.instance.KairosObj.MEDIA_STILLS.length = 0

		// 		this.sendCommand('list:MEDIA.stills')
		// 		this.processCallback = (data: Array<string>) => {
		// 			data.forEach((element) => {
		// 				if (element.endsWith('&#46;rr')) {
		// 					// receive top hierarchy
		// 					this.instance.KairosObj.MEDIA_STILLS.push(element)
		// 				} else {
		// 					this.sendCommand(`list:${element}`)
		// 				}
		// 			})
		// 		}
		// 		listFinish().then(() => {
		// 			this.processCallback = null
		// 			resolve('fetch ready')
		// 		})
		// 	})
		// }
		// const fetchFxinputs = () => {
		// 	return new Promise((resolve) => {
		// 		this.sendCommand('list:FXINPUTS')
		// 		this.processCallback = (data: Array<string>, cmd: string) => {
		// 			if (data.length === 0 && cmd !== 'FXINPUTS') {
		// 				// this.instance.log('debug', 'FXINPUT: ' + cmd.replace(/ /g, '_').split('.SourceEffectGroup')[0])
		// 				this.instance.KairosObj.INPUTS.push({
		// 					shortcut: cmd.split('.SourceEffectGroup')[0],
		// 					name: cmd.replace(/ /g, '_').split('.SourceEffectGroup')[0],
		// 				})
		// 			}
		// 			data.forEach((element) => {
		// 				this.sendCommand(`list:${element}`)
		// 			})
		// 		}
		// 		listFinish().then(() => {
		// 			this.processCallback = null
		// 			resolve('fetch ready')
		// 		})
		// 	})
		// }
		// const fetchMacros = () => {
		// 	return new Promise((resolve) => {
		// 		this.sendCommand('list:MACROS')
		// 		this.processCallback = (data: Array<string>, cmd: string) => {
		// 			if (data.length === 0 && cmd !== 'MACROS') {
		// 				this.instance.KairosObj.MACROS.push(cmd)
		// 			}
		// 			data.forEach((element) => {
		// 				this.sendCommand(`list:${element}`)
		// 			})
		// 		}
		// 		listFinish().then(() => {
		// 			this.processCallback = null
		// 			resolve('fetch ready')
		// 		})
		// 	})
		// }
		// const fetchFixedItems = () => {
		// 	return new Promise((resolve) => {
		// 		this.sendCommand('list:AUX')
		// 		//this.sendCommand('list:MACROS')
		// 		this.sendCommand('list:MVPRESETS')
		// 		this.sendCommand('list:INPUTS')
		// 		this.sendCommand('list:RAMRECORDERS')
		// 		this.sendCommand('list:PLAYERS')
		// 		//this.sendCommand('list:AUDIOPLAYERS')
		// 		this.sendCommand('list:GFXCHANNELS')
		// 		//this.sendCommand('list:FXINPUTS')
		// 		this.sendCommand('list:MATTES')
		// 		//this.sendCommand('list:MEDIA.stills')
		// 		addInternalSourceGroup()
		// 		listFinish().then(() => resolve('fetch ready'))
		// 	})
		// }
		// const fetchLayers = () => {
		// 	return new Promise((resolve) => {
		// 		for (const item of this.instance.KairosObj.SCENES) {
		// 			this.sendCommand(`list:${item.scene}.Layers`)
		// 			this.processCallback = (data: Array<string>, cmd: string) => {
		// 				data.forEach((element) => {
		// 					this.sendCommand(`list:${element}`)
		// 				})
		// 				if (data.length === 0) {
		// 					this.instance.combinedLayerArray.push({
		// 						name: cmd,
		// 						sourceA: '',
		// 						sourceB: '',
		// 						preset_enabled: 0,
		// 					})
		// 					item.layers.push({ layer: cmd, sourceA: '', sourceB: '' })
		// 				}
		// 			}
		// 		}
		// 		listFinish().then(() => {
		// 			this.processCallback = null
		// 			resolve('fetch ready')
		// 		})
		// 	})
		// }
		// const fetchVariableItems = () => {
		// 	return new Promise((resolve) => {
		// 		let begin: number, getA: number, getB: number

		// 		// Fetch all macros per scene
		// 		for (const item of this.instance.KairosObj.SCENES) {
		// 			if (item.scene !== '') {
		// 				this.sendCommand(`list:${item.scene}.Macros`)
		// 			}
		// 		}
		// 		// Fetch all snapshots per scene
		// 		for (const item of this.instance.KairosObj.SCENES) {
		// 			if (item.scene !== '') {
		// 				this.sendCommand(`list:${item.scene}.Snapshots`)
		// 			}
		// 		}
		// 		// Fetch all layer per scene
		// 		//for (const item of this.instance.KairosObj.SCENES) {
		// 		//	if (item.scene !== '') {
		// 		//		this.sendCommand(`list:${item.scene}.Layers`)
		// 		//	}
		// 		//}
		// 		// Fetch all transitions per scene
		// 		for (const item of this.instance.KairosObj.SCENES) {
		// 			if (item.scene !== '') {
		// 				this.sendCommand(`list:${item.scene}.Transitions`)
		// 			}
		// 		}

		// 		listFinish()
		// 			.then(() => {
		// 				// Fetch all input names
		// 				for (const INPUT of this.instance.KairosObj.INPUTS) {
		// 					if (INPUT.shortcut !== '') {
		// 						this.sendCommand(`${INPUT.shortcut}.name`)
		// 					}
		// 				}

		// 				// Fetch all live sources for AUX
		// 				// Fetch all AUX names
		// 				// Check if AUX is available
		// 				for (const iterator of this.instance.KairosObj.AUX) {
		// 					if (iterator.aux !== '') {
		// 						this.sendCommand(`${iterator.aux}.source`)
		// 						this.sendCommand(`${iterator.aux}.name`)
		// 						//this.sendCommand(`${iterator.aux}.available`)
		// 					}
		// 				}
		// 				return commandFinish()
		// 			})
		// 			.then(() => {
		// 				begin = Date.now()
		// 				this.instance.log('debug', 'number of layers ' + this.instance.combinedLayerArray.length)

		// 				// Get live source for each layer
		// 				for (const LAYER of this.instance.combinedLayerArray) {
		// 					this.sendCommand(`${LAYER.name}.sourceA`)
		// 				}
		// 				return commandFinish()
		// 			})
		// 			.then(() => {
		// 				getA = Date.now()
		// 				this.instance.log('debug', `get sourceA ${getA - begin} ms`)

		// 				// Get live source for each layer
		// 				for (const LAYER of this.instance.combinedLayerArray) {
		// 					this.sendCommand(`${LAYER.name}.sourceB`)
		// 				}
		// 				return commandFinish()
		// 			})
		// 			.then(() => {
		// 				getB = Date.now()
		// 				this.instance.log('debug', `get sourceB ${getB - getA} ms`)

		// 				// Get PVW enabled or not
		// 				for (const LAYER of this.instance.combinedLayerArray) {
		// 					this.sendCommand(`${LAYER.name}.preset_enabled`)
		// 				}
		// 				// Get repeat state for each player
		// 				for (const PLAYER of this.instance.KairosObj.PLAYERS) {
		// 					this.sendCommand(`${PLAYER.player}.repeat`)
		// 				}
		// 				// Get mute state for each audio mixer channel
		// 				//this.sendCommand(`Mixer.AudioMixers.AudioMixer.mute`)
		// 				this.sendCommand(`AUDIOMIXER.mute`)
		// 				for (const CHANNEL of this.instance.KairosObj.AUDIO_CHANNELS) {
		// 					//this.sendCommand(`Mixer.AudioMixers.AudioMixer.${CHANNEL.channel}.mute`)
		// 					this.sendCommand(`AUDIOMIXER.${CHANNEL.channel}.mute`)
		// 				}

		// 				commandFinish().then(() => resolve('fetch ready'))
		// 			})
		// 	})
		// }

		// const subscribeToData = () => {
		// 	return new Promise((resolve) => {
		// 		//this.sendCommand('subscribe:Mixer.AudioMixers.AudioMixer.mute')
		// 		this.sendCommand('subscribe:AUDIOMIXER.mute')
		// 		// Get all transitions together
		// 		for (const SCENE of this.instance.KairosObj.SCENES) {
		// 			this.instance.combinedTransitionsArray = this.instance.combinedTransitionsArray.concat(SCENE.transitions)
		// 		}
		// 		// Get all Scene Macros together
		// 		for (const SCENE of this.instance.KairosObj.SCENES) {
		// 			this.instance.combinedSmacrosArray = this.instance.combinedSmacrosArray.concat(SCENE.smacros)
		// 		}
		// 		// Get all Snapshots together
		// 		for (const SCENE of this.instance.KairosObj.SCENES) {
		// 			this.instance.combinedSnapshotsArray = this.instance.combinedSnapshotsArray.concat(SCENE.snapshots)
		// 		}

		// 		this.instance.KairosObj.PLAYERS.forEach((element) => {
		// 			this.sendCommand(`subscribe:${element.player}.repeat`)
		// 		})
		// 		this.instance.KairosObj.AUDIO_CHANNELS.forEach((element) => {
		// 			//this.sendCommand(`subscribe:Mixer.AudioMixers.AudioMixer.${element.channel}.mute`)
		// 			this.sendCommand(`subscribe:AUDIOMIXER.${element.channel}.mute`)
		// 		})
		// 		this.instance.KairosObj.AUX.forEach((element) => {
		// 			this.sendCommand(`subscribe:${element.aux}.source`)
		// 			this.sendCommand(`subscribe:${element.aux}.name`)
		// 		})
		// 		this.instance.KairosObj.INPUTS.forEach((element) => {
		// 			this.sendCommand(`subscribe:${element.shortcut}.name`)
		// 		})

		// 		for (const LAYER of this.instance.combinedLayerArray) {
		// 			this.sendCommand(`subscribe:${LAYER.name}.sourceA`)
		// 		}

		// 		for (const LAYER of this.instance.combinedLayerArray) {
		// 			this.sendCommand(`subscribe:${LAYER.name}.sourceB`)
		// 		}
		// 		commandFinish().then(() => resolve('subscribe ready'))
		// 	})
		// }
		// this.sockets.main.on('connect', async () => {
		// 	this.instance.log('debug', 'Connected to mixer')
		// 	this.instance.updateStatus(InstanceStatus.Ok, 'Connected')
		// 	this.keepAliveInterval = setInterval(keepAlive, 4500) //session expires at 5 seconds
		// 	await fetchScenes()
		// 	await fetchStills()
		// 	await fetchFxinputs()
		// 	await fetchMacros()
		// 	await fetchFixedItems()
		// 	await fetchLayers()
		// 	await fetchVariableItems()
		// 	await subscribeToData()
		// 	this.instance.updateInstance(updateFlags.All as number)
		// 	//	console.log('OBJ', this.instance.KairosObj))
		// })

		// /**
		//  * Processing here
		//  */

		// const processData = async (data: Array<string>, cmd: string): Promise<number> => {
		// 	let whatTodo = updateFlags.All
		// 	if (this.processCallback) {
		// 		this.processCallback(data, cmd)
		// 	} else if (data.find((element) => element === 'IP1')) {
		// 		//This is an input list
		// 		data.forEach((element) => {
		// 			if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
		// 		})
		// 	} else if (data.find((element) => element === 'GFX1')) {
		// 		//This is an input list
		// 		data.forEach((element) => {
		// 			if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
		// 		})
		// 	} else if (data.find((element) => element === 'RR1')) {
		// 		//This is an input list
		// 		data.forEach((element) => {
		// 			if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
		// 		})
		// 	} else if (data.find((element) => element === 'CP1')) {
		// 		//This is an input list
		// 		data.forEach((element) => {
		// 			if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
		// 		})
		// 	} else if (data.find((element) => element === 'IP-AUX1')) {
		// 		//This is an AUX list
		// 		this.instance.KairosObj.AUX.length = 0
		// 		data.forEach((element) => {
		// 			if (element !== '') this.instance.KairosObj.AUX.push({ aux: element, name: element, liveSource: '' })
		// 		})
		// 	} else if (data.find((element) => element === 'APPLICATION:NEW')) {
		// 		//Complete refresh of all data
		// 		this.instance.log('debug', 'Complete refresh of all data')
		// 		await fetchScenes()
		// 		await fetchStills()
		// 		await fetchFxinputs()
		// 		await fetchMacros()
		// 		await fetchFixedItems()
		// 		await fetchLayers()
		// 		await fetchVariableItems()
		// 		await subscribeToData()
		// 		this.instance.updateInstance(updateFlags.All as number)
		// 	} else {
		// 		whatTodo = updateFlags.None
		// 		// Do a switch block to go fast through the rest of the data
		// 		for (const returningData of data) {
		// 			switch (true) {
		// 				case /^$/i.test(returningData):
		// 					break
		// 				case /^OK$/i.test(returningData):
		// 					// this.instance.log('debug', 'Command succeeded')
		// 					break
		// 				case /^Error$/i.test(returningData):
		// 					// this.instance.log('debug', 'Command failed')
		// 					break
		// 				case /\.sourceA/i.test(returningData):
		// 					{
		// 						let index = this.instance.combinedLayerArray.findIndex(
		// 							(x) => x.name === returningData.split('=')[0].slice(0, -8)
		// 						)
		// 						if (index != -1) this.instance.combinedLayerArray[index].sourceA = returningData.split('=')[1]
		// 						updateBasicVariables(this.instance)
		// 						this.instance.checkFeedbacks('inputSource')
		// 					}
		// 					break
		// 				case /\.sourceB/i.test(returningData):
		// 					{
		// 						let index = this.instance.combinedLayerArray.findIndex(
		// 							(x) => x.name === returningData.split('=')[0].slice(0, -8)
		// 						)
		// 						if (index != -1) this.instance.combinedLayerArray[index].sourceB = returningData.split('=')[1]
		// 						updateBasicVariables(this.instance)
		// 						this.instance.checkFeedbacks('inputSource')
		// 					}
		// 					break
		// 				//case /^Mixer\.AudioMixers\.AudioMixer\.mute/i.test(returningData): // This is an Audio Master Mixer stuff
		// 				case /^AUDIOMIXER\.mute/i.test(returningData): // This is an Audio Master Mixer stuff
		// 					{
		// 						this.instance.KairosObj.audio_master_mute = parseInt(returningData.split('=')[1])
		// 						this.instance.checkFeedbacks('audioMuteMaster')
		// 						updateBasicVariables(this.instance)
		// 					}
		// 					break
		// 				//case /^Mixer\.AudioMixers\.AudioMixer\.Channel/i.test(returningData): // This is an Audio channel Mixer stuff
		// 				case /^AUDIOMIXER\.Channel/i.test(returningData): // This is an Audio channel Mixer stuff
		// 					{
		// 						let index = parseInt(returningData.slice(returningData.search('.Channel') + 9, -7)) - 1
		// 						this.instance.KairosObj.AUDIO_CHANNELS[index].mute = parseInt(returningData.split('=')[1])
		// 						this.instance.checkFeedbacks('audioMuteChannel')
		// 						updateBasicVariables(this.instance)
		// 					}
		// 					break
		// 				case /\.source=/i.test(returningData): // This is an AUX source
		// 					{
		// 						let index = this.instance.KairosObj.AUX.findIndex(
		// 							(x) => x.aux === returningData.split('=')[0].slice(0, returningData.split('=')[0].search('.source'))
		// 						)
		// 						if (index != -1) this.instance.KairosObj.AUX[index].liveSource = returningData.split('=')[1]
		// 						this.instance.checkFeedbacks('aux')
		// 						updateBasicVariables(this.instance)
		// 					}
		// 					break
		// 				//case /^MACROS\./i.test(returningData): // This is an MACRO
		// 				//	{
		// 				//		this.instance.KairosObj.MACROS.push(returningData)
		// 				//	}
		// 				//	break
		// 				//case /\.available=/i.test(returningData): // This is an AUX available check
		// 				//	{
		// 				//		let index = this.instance.KairosObj.AUX.findIndex(
		// 				//			(x) => x.aux === returningData.split('=')[0].slice(0, -10)
		// 				//		)
		// 				//		if (index != -1) this.instance.KairosObj.AUX[index].available = parseInt(returningData.split('=')[1])
		// 				//		updateBasicVariables(this.instance)
		// 				//	}
		// 				//	break
		// 				case /\.repeat=/i.test(returningData): // //This is an PLAYER repeat check
		// 					{
		// 						let index = this.instance.KairosObj.PLAYERS.findIndex(
		// 							(x) => x.player === returningData.split('=')[0].slice(0, -7)
		// 						)
		// 						if (index != -1) this.instance.KairosObj.PLAYERS[index].repeat = parseInt(returningData.split('=')[1])
		// 						updateBasicVariables(this.instance)
		// 					}
		// 					break
		// 				case /^MVPRESETS\./i.test(returningData): // This is an MV Preset list
		// 					this.instance.KairosObj.MV_PRESETS.push(returningData)
		// 					break
		// 				case /\.sourceOptions=/i.test(returningData): // This is scene source options list
		// 					//per scene source options
		// 					// this.instance.kairosObj.SCENES.SOURCE_OPTIONS.push(returningData)
		// 					break
		// 				case /\.Macros\./i.test(returningData): // This is a Scene Macro
		// 					{
		// 						let sceneName = data[0].slice(0, data[0].search('.Macros.')) // SCENES.Main.Macros.M-1
		// 						let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
		// 						if (index != -1) this.instance.KairosObj.SCENES[index].smacros.push(returningData)
		// 					}
		// 					break
		// 				case /\.Snapshots\./i.test(returningData): // This is a Snapshot
		// 					{
		// 						let sceneName = data[0].slice(0, data[0].search('.Snapshots.')) // SCENES.Main.Snapshots.SNP1
		// 						let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
		// 						if (index != -1) this.instance.KairosObj.SCENES[index].snapshots.push(returningData)
		// 					}
		// 					break
		// 				case /\.preset_enabled/i.test(returningData): //This is an response to SCENES.Main.Layers.Background.preset_enabled=1
		// 					{
		// 						let layer = returningData.split('=')[0].slice(0, returningData.split('=')[0].search('.preset_enabled'))
		// 						let index = this.instance.combinedLayerArray.findIndex((s) => s.name === layer)
		// 						if (index != -1)
		// 							this.instance.combinedLayerArray[index].preset_enabled = parseInt(returningData.split('=')[1])
		// 					}
		// 					break
		// 				// case /\.Layers\./i.test(returningData): // This is a Layer list
		// 				// 	{
		// 				// 		this.instance.combinedLayerArray.push({
		// 				// 			name: returningData,
		// 				// 			sourceA: '',
		// 				// 			sourceB: '',
		// 				// 			preset_enabled: 0,
		// 				// 		})
		// 				// 		let sceneName = returningData.slice(0, returningData.search('.Layers.'))
		// 				// 		let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
		// 				// 		if (index != -1)
		// 				// 			this.instance.KairosObj.SCENES[index].layers.push({ layer: returningData, sourceA: '', sourceB: '' })
		// 				// 	}
		// 				// 	break
		// 				case /\.Transitions\./i.test(returningData): // This is an Transition list, SCENES.Main.Transitions.BgdMix
		// 					{
		// 						let sceneName = returningData.slice(0, returningData.search('.Transitions.'))
		// 						let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
		// 						if (index != -1) this.instance.KairosObj.SCENES[index].transitions.push(returningData)
		// 					}
		// 					break
		// 				case /\.name=/i.test(returningData): // This is an name for an Input or AUX (BE AWARE THIS CAN CHANGE IN THE FUTURE)
		// 					{
		// 						let source = returningData.split('=')[0].slice(0, -5)
		// 						let name = returningData.split('=')[1]
		// 						let index_i = this.instance.KairosObj.INPUTS.findIndex((x) => x.shortcut === source)
		// 						let index_a = this.instance.KairosObj.AUX.findIndex((x) => x.aux === source)
		// 						if (index_i != -1) this.instance.KairosObj.INPUTS[index_i].name = name
		// 						else if (index_a != -1) this.instance.KairosObj.AUX[index_a].name = name
		// 						updateBasicVariables(this.instance)
		// 					}
		// 					break
		// 				//case /^FXINPUTS\./i.test(returningData):
		// 				//	this.instance.KairosObj.INPUTS.push({ shortcut: returningData, name: returningData })
		// 				//	break
		// 				case /^MATTES\./i.test(returningData):
		// 					this.instance.KairosObj.INPUTS.push({
		// 						shortcut: returningData,
		// 						name: returningData,
		// 					})
		// 					break
		// 				//case /^MEDIA\.stills\./i.test(returningData):
		// 				//	this.instance.KairosObj.MEDIA_STILLS.push(returningData)
		// 				//	break

		// 				default:
		// 					this.instance.log('error', 'No Case provided for: ' + returningData)
		// 			}
		// 		}
		// 	}
		// 	return whatTodo
		// }
	}

	/**
	 * @param command function and any params
	 * @description Check TCP connection status and format command to send to Kairos
	 * @todo It should provide callback or promise of each transaction
	 */
	public readonly sendCommand = async (command: string): Promise<string> => {
		const formattedRestRequest = `http://${this.host}:${this.restPort}${command}`
		const base64Credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
		const headers = new Headers({
			'Authorization': `Basic ${base64Credentials}`
		})
		this.instance.log('debug', `Sending command: ${formattedRestRequest}`)
		try {
			const response = await fetch(formattedRestRequest, { headers })
			const result = await response.text()
			this.instance.updateStatus(InstanceStatus.Ok)
			return result
		} catch (error) {
			this.instance.updateStatus(InstanceStatus.UnknownError, 'Error sending command')
			return (error as Error).message
		}
	}

	/**
	 * @description Check for config changes and start new connections/polling if needed
	 */
	public readonly update = (): void => {
		// if (this.instance.config === undefined) return
		// const hostCheck = this.instance.config.host !== this.tcpHost || this.instance.config.tcpPort !== this.tcpPort
		// if (hostCheck) {
		// 	this.tcpHost = this.instance.config.host
		// 	this.tcpPort = this.instance.config.tcpPort
		// 	if (this.keepAliveInterval != undefined) clearInterval(this.keepAliveInterval)
		// 	let ready = true
		// 	const destroySocket = (type: 'main') => {
		// 		const socket = this.sockets[type] as any
		// 		if (socket && (socket.connected || socket.socket.connecting)) {
		// 			socket.destroy()
		// 		} else {
		// 			if (socket !== null) {
		// 				this.instance.log('debug', `socket error: Cannot update connections while they're initializing`)
		// 				ready = false
		// 			}
		// 		}
		// 	}
		// 	if (this.sockets.main) destroySocket('main')
		// 	if (ready) this.init()
		// }
	}
}
