import { InstanceStatus, TCPHelper } from '@companion-module/base'
import KairosInstance from '.'
import { updateBasicVariables } from './variables'

interface TCPSockets {
	main: TCPHelper | null
}

export class TCP {
	private readonly instance: KairosInstance
	private sockets: TCPSockets = {
		main: null,
	}
	private tcpHost: string
	private tcpPort: number
	private keepAliveInterval: NodeJS.Timer | undefined
	private recvRemain = ''
	private listQueue: string[] = [] // queue of outstanding command of list or info
	private nCommand = 0 // number of outstanding command
	private processCallback: ((data: Array<string>, cmd: string) => void) | null = null
	private waitListCallback: (() => void) | null = null
	private waitCommandCallback: (() => void) | null = null

	constructor(instance: KairosInstance, host: string, tcpPort: number) {
		this.instance = instance
		this.tcpHost = host
		this.tcpPort = tcpPort

		this.instance.combinedLayerArray = []
		this.instance.combinedTransitionsArray = []
		this.instance.combinedSmacrosArray = []
		this.instance.combinedSnapshotsArray = []

		this.instance.KairosObj = {
			audio_master_mute: 0,
			INPUTS: [],
			MEDIA_STILLS: [],
			SCENES: [],
			AUX: [],
			MACROS: [],
			PLAYERS: [
				{ player: 'RR1', repeat: 0 },
				{ player: 'RR2', repeat: 0 },
				{ player: 'RR3', repeat: 0 },
				{ player: 'RR4', repeat: 0 },
				{ player: 'RR5', repeat: 0 },
				{ player: 'RR6', repeat: 0 },
				{ player: 'RR7', repeat: 0 },
				{ player: 'RR8', repeat: 0 },
				{ player: 'CP1', repeat: 0 },
				{ player: 'CP2', repeat: 0 },
				{ player: 'AP1', repeat: 0 },
				{ player: 'AP2', repeat: 0 },
				{ player: 'AP3', repeat: 0 },
				{ player: 'AP4', repeat: 0 },
				{ player: 'AP5', repeat: 0 },
				{ player: 'AP6', repeat: 0 },
				{ player: 'AP7', repeat: 0 },
				{ player: 'AP8', repeat: 0 },
				{ player: 'AP9', repeat: 0 },
				{ player: 'AP10', repeat: 0 },
				{ player: 'AP11', repeat: 0 },
				{ player: 'AP12', repeat: 0 },
				{ player: 'AP13', repeat: 0 },
				{ player: 'AP14', repeat: 0 },
				{ player: 'AP15', repeat: 0 },
				{ player: 'AP16', repeat: 0 },
			],
			MV_PRESETS: [],
			AUDIO_CHANNELS: [
				{ channel: 'Channel 1', mute: 0 },
				{ channel: 'Channel 2', mute: 0 },
				{ channel: 'Channel 3', mute: 0 },
				{ channel: 'Channel 4', mute: 0 },
				{ channel: 'Channel 5', mute: 0 },
				{ channel: 'Channel 6', mute: 0 },
				{ channel: 'Channel 7', mute: 0 },
				{ channel: 'Channel 8', mute: 0 },
				{ channel: 'Channel 9', mute: 0 },
				{ channel: 'Channel 10', mute: 0 },
				{ channel: 'Channel 11', mute: 0 },
				{ channel: 'Channel 12', mute: 0 },
				{ channel: 'Channel 13', mute: 0 },
				{ channel: 'Channel 14', mute: 0 },
				{ channel: 'Channel 15', mute: 0 },
				{ channel: 'Channel 16', mute: 0 },
			],
		}
		this.init()
	}

	/**
	 * @description Close connection on instance disable/removal
	 */
	public readonly destroy = (): void => {
		if (this.sockets.main) this.sockets.main.destroy()
		if (this.keepAliveInterval != undefined) clearInterval(this.keepAliveInterval)
	}

	/**
	 * @description Create a TCP connection to Kairos
	 */
	public readonly init = (): void => {
		if (this.tcpHost === undefined || this.tcpPort === undefined) {
			this.instance.log(
				'warn',
				`Unable to connect to Kairos, please configure a host and port in the instance configuration`
			)
			return
		}

		this.sockets.main = new TCPHelper(this.tcpHost, this.tcpPort)

		this.sockets.main.on('status_change', (status: InstanceStatus) => {
			console.log('status change', status)
			this.instance.updateStatus(status)
		})

		this.sockets.main.on('error', (err: Error) => {
			this.instance.updateStatus(InstanceStatus.UnknownError, err.message)
		})
		// Helpers
		const addInternalSourceGroup = () => {
			this.instance.KairosObj.INPUTS.push({ index: 'INTSOURCES.MV1', uuid: 'INTSOURCES.MV1', name: 'MV1' })
			this.instance.KairosObj.INPUTS.push({ index: 'INTSOURCES.MV2', uuid: 'INTSOURCES.MV2', name: 'MV2' })
			this.instance.KairosObj.INPUTS.push({ index: 'BLACK', uuid: 'BLACK', name: 'BLACK' })
			this.instance.KairosObj.INPUTS.push({ index: 'WHITE', uuid: 'WHITE', name: 'WHITE' })
			this.instance.KairosObj.INPUTS.push({
				index: 'INTSOURCES.ColorBar',
				uuid: 'INTSOURCES.ColorBar',
				name: 'ColorBar',
			})
			this.instance.KairosObj.INPUTS.push({
				index: 'INTSOURCES.ColorCircle',
				uuid: 'INTSOURCES.ColorCircle',
				name: 'ColorCircle',
			})
		}
		const addScene = (scene: string) => {
			if (scene !== '')
				this.instance.KairosObj.SCENES.push({
					scene: scene,
					smacros: [],
					snapshots: [],
					layers: [],
					transitions: [],
				})
			this.instance.KairosObj.INPUTS.push({ uuid: scene, index: scene, name: scene.slice(7) })
		}
		const listFinish = () => {
			return new Promise((resolve) => {
				this.waitListCallback = () => resolve('done')
			})
		}
		const commandFinish = () => {
			return new Promise((resolve) => {
				this.waitCommandCallback = () => resolve('done')
			})
		}

		const fetchScenes = () => {
			return new Promise((resolve) => {
				//This is an SCENES list, only at startup so reset
				this.instance.KairosObj.SCENES.length = 0

				this.sendCommand('list:SCENES')
				this.processCallback = (data: Array<string>) => {
					const layers = data.find((element) => element.endsWith('.Layers'))
					if (layers) {
						addScene(layers.substring(0, layers.length - 7))
					} else {
						data.forEach((element) => {
							this.sendCommand(`list:${element}`)
						})
					}

					listFinish().then(() => {
						this.processCallback = null
						resolve('fetch ready')
					})
				}
			})
		}
		const fetchStills = () => {
			return new Promise((resolve) => {
				this.instance.KairosObj.MEDIA_STILLS.length = 0

				this.sendCommand('list:MEDIA.stills')
				this.processCallback = (data: Array<string>) => {
					data.forEach((element) => {
						if (element.endsWith('&#46;rr')) {
							// receive top hierarchy
							this.instance.KairosObj.MEDIA_STILLS.push(element)
						} else {
							this.sendCommand(`list:${element}`)
						}
					})
				}
				listFinish().then(() => {
					this.processCallback = null
					resolve('fetch ready')
				})
			})
		}
		const fetchFxinputs = () => {
			return new Promise((resolve) => {
				this.sendCommand('list:FXINPUTS')
				this.processCallback = (data: Array<string>, cmd: string) => {
					if (data.length === 0 && cmd !== 'FXINPUTS') {
						this.instance.KairosObj.INPUTS.push({ index: cmd, uuid: cmd, name: '' })
					}
					data.forEach((element) => {
						this.sendCommand(`list:${element}`)
					})
				}
				listFinish().then(() => {
					this.processCallback = null
					resolve('fetch ready')
				})
			})
		}
		const fetchMacros = () => {
			return new Promise((resolve) => {
				this.sendCommand('list:MACROS')
				this.processCallback = (data: Array<string>, cmd: string) => {
					if (data.length === 0 && cmd !== 'MACROS') {
						this.instance.KairosObj.MACROS.push(cmd)
					}
					data.forEach((element) => {
						this.sendCommand(`list:${element}`)
					})
				}
				listFinish().then(() => {
					this.processCallback = null
					resolve('fetch ready')
				})
			})
		}
		const fetchFixedItems = () => {
			return new Promise((resolve) => {
				this.sendCommand('list:AUX')
				//this.sendCommand('list:MACROS')
				this.sendCommand('list:MVPRESETS')
				this.sendCommand('list:INPUTS')
				this.sendCommand('list:RAMRECORDERS')
				this.sendCommand('list:PLAYERS')
				//this.sendCommand('list:AUDIOPLAYERS')
				this.sendCommand('list:GFXCHANNELS')
				//this.sendCommand('list:FXINPUTS')
				this.sendCommand('list:MATTES')
				//this.sendCommand('list:MEDIA.stills')
				addInternalSourceGroup()
				listFinish().then(() => resolve('fetch ready'))
			})
		}
		const fetchLayers = () => {
			return new Promise((resolve) => {
				for (const item of this.instance.KairosObj.SCENES) {
					this.sendCommand(`list:${item.scene}.Layers`)
					this.processCallback = (data: Array<string>, cmd: string) => {
						data.forEach((element) => {
							this.sendCommand(`list:${element}`)
						})
						if (data.length === 0) {
							this.instance.combinedLayerArray.push({
								name: cmd,
								sourceA: '',
								sourceB: '',
								preset_enabled: 0,
							})
							item.layers.push({ layer: cmd, sourceA: '', sourceB: '' })
						}
					}
				}
				listFinish().then(() => {
					this.processCallback = null
					resolve('fetch ready')
				})
			})
		}
		const fetchVariableItems = () => {
			return new Promise((resolve) => {
				let begin: number, getA: number, getB: number

				// Fetch all macros per scene
				for (const item of this.instance.KairosObj.SCENES) {
					if (item.scene !== '') {
						this.sendCommand(`list:${item.scene}.Macros`)
					}
				}
				// Fetch all snapshots per scene
				for (const item of this.instance.KairosObj.SCENES) {
					if (item.scene !== '') {
						this.sendCommand(`list:${item.scene}.Snapshots`)
					}
				}
				// Fetch all layer per scene
				//for (const item of this.instance.KairosObj.SCENES) {
				//	if (item.scene !== '') {
				//		this.sendCommand(`list:${item.scene}.Layers`)
				//	}
				//}
				// Fetch all transitions per scene
				for (const item of this.instance.KairosObj.SCENES) {
					if (item.scene !== '') {
						this.sendCommand(`list:${item.scene}.Transitions`)
					}
				}

				listFinish()
					.then(() => {
						// Fetch all input names
						for (const INPUT of this.instance.KairosObj.INPUTS) {
							if (INPUT.uuid !== '') {
								this.sendCommand(`${INPUT.uuid}.name`)
							}
						}

						// Fetch all live sources for AUX
						// Fetch all AUX names
						// Check if AUX is available
						for (const iterator of this.instance.KairosObj.AUX) {
							if (iterator.index !== '') {
								this.sendCommand(`${iterator.index}.source`)
								this.sendCommand(`${iterator.index}.name`)
								//this.sendCommand(`${iterator.aux}.available`)
							}
						}
						return commandFinish()
					})
					.then(() => {
						begin = Date.now()
						console.log('number of layers', this.instance.combinedLayerArray.length)

						// Get live source for each layer
						for (const LAYER of this.instance.combinedLayerArray) {
							this.sendCommand(`${LAYER.name}.sourceA`)
						}
						return commandFinish()
					})
					.then(() => {
						getA = Date.now()
						console.log('get sourceA', getA - begin, 'ms')

						// Get live source for each layer
						for (const LAYER of this.instance.combinedLayerArray) {
							this.sendCommand(`${LAYER.name}.sourceB`)
						}
						return commandFinish()
					})
					.then(() => {
						getB = Date.now()
						console.log('get sourceB', getB - getA, 'ms')

						// Get PVW enabled or not
						for (const LAYER of this.instance.combinedLayerArray) {
							this.sendCommand(`${LAYER.name}.preset_enabled`)
						}
						// Get repeat state for each player
						for (const PLAYER of this.instance.KairosObj.PLAYERS) {
							this.sendCommand(`${PLAYER.player}.repeat`)
						}
						// Get mute state for each audio mixer channel
						//this.sendCommand(`Mixer.AudioMixers.AudioMixer.mute`)
						this.sendCommand(`AUDIOMIXER.mute`)
						for (const CHANNEL of this.instance.KairosObj.AUDIO_CHANNELS) {
							//this.sendCommand(`Mixer.AudioMixers.AudioMixer.${CHANNEL.channel}.mute`)
							this.sendCommand(`AUDIOMIXER.${CHANNEL.channel}.mute`)
						}

						commandFinish().then(() => resolve('fetch ready'))
					})
			})
		}

		const subscribeToData = () => {
			return new Promise((resolve) => {
				//this.sendCommand('subscribe:Mixer.AudioMixers.AudioMixer.mute')
				this.sendCommand('subscribe:AUDIOMIXER.mute')
				// Get all transitions together
				for (const SCENE of this.instance.KairosObj.SCENES) {
					this.instance.combinedTransitionsArray = this.instance.combinedTransitionsArray.concat(SCENE.transitions)
				}
				// Get all Scene Macros together
				for (const SCENE of this.instance.KairosObj.SCENES) {
					this.instance.combinedSmacrosArray = this.instance.combinedSmacrosArray.concat(SCENE.smacros)
				}
				// Get all Snapshots together
				for (const SCENE of this.instance.KairosObj.SCENES) {
					this.instance.combinedSnapshotsArray = this.instance.combinedSnapshotsArray.concat(SCENE.snapshots)
				}

				this.instance.KairosObj.PLAYERS.forEach((element) => {
					this.sendCommand(`subscribe:${element.player}.repeat`)
				})
				this.instance.KairosObj.AUDIO_CHANNELS.forEach((element) => {
					//this.sendCommand(`subscribe:Mixer.AudioMixers.AudioMixer.${element.channel}.mute`)
					this.sendCommand(`subscribe:AUDIOMIXER.${element.channel}.mute`)
				})
				this.instance.KairosObj.AUX.forEach((element) => {
					this.sendCommand(`subscribe:${element.index}.source`)
					this.sendCommand(`subscribe:${element.index}.name`)
				})
				this.instance.KairosObj.INPUTS.forEach((element) => {
					this.sendCommand(`subscribe:${element.uuid}.name`)
				})

				for (const LAYER of this.instance.combinedLayerArray) {
					this.sendCommand(`subscribe:${LAYER.name}.sourceA`)
				}

				for (const LAYER of this.instance.combinedLayerArray) {
					this.sendCommand(`subscribe:${LAYER.name}.sourceB`)
				}
				commandFinish().then(() => resolve('subscribe ready'))
			})
		}
		this.sockets.main.on('connect', async () => {
			this.instance.log('debug', 'Connected to mixer')
			this.instance.updateStatus(InstanceStatus.Ok, 'Connected')
			this.keepAliveInterval = setInterval(keepAlive, 4500) //session expires at 5 seconds
			await fetchScenes()
			await fetchStills()
			await fetchFxinputs()
			await fetchMacros()
			await fetchFixedItems()
			await fetchLayers()
			await fetchVariableItems()
			await subscribeToData()
			await this.instance.updateInstance()
			//	console.log('OBJ', this.instance.KairosObj))
		})

		let keepAlive = () => {
			this.sendCommand('')
			this.instance.log('debug', 'Keepalive sent')
		}

		/**
		 * Processing here
		 */

		const processData = (data: Array<string>, cmd: string) => {
			if (this.processCallback) {
				this.processCallback(data, cmd)
			} else if (data.find((element) => element === 'IP1')) {
				//This is an input list
				data.forEach((element) => {
					if (element !== '') this.instance.KairosObj.INPUTS.push({ index: element, uuid: element, name: element })
				})
			} else if (data.find((element) => element === 'GFX1')) {
				//This is an input list
				data.forEach((element) => {
					if (element !== '') this.instance.KairosObj.INPUTS.push({ index: element, uuid: element, name: element })
				})
			} else if (data.find((element) => element === 'RR1')) {
				//This is an input list
				data.forEach((element) => {
					if (element !== '') this.instance.KairosObj.INPUTS.push({ index: element, uuid: element, name: element })
				})
			} else if (data.find((element) => element === 'CP1')) {
				//This is an input list
				data.forEach((element) => {
					if (element !== '') this.instance.KairosObj.INPUTS.push({ index: element, uuid: element, name: element })
				})
			} else if (data.find((element) => element === 'IP-AUX1')) {
				//This is an AUX list
				this.instance.KairosObj.AUX.length = 0
				data.forEach((element) => {
					if (element !== '')
						this.instance.KairosObj.AUX.push({ uuid: element, index: element, name: element, liveSource: '' })
				})
			} else {
				// Do a switch block to go fast through the rest of the data
				for (const returningData of data) {
					switch (true) {
						case /^$/i.test(returningData):
							break
						case /^OK$/i.test(returningData):
							this.instance.log('debug', 'Command succeeded')
							break
						case /^Error$/i.test(returningData):
							this.instance.log('debug', 'Command failed')
							break
						case /\.sourceA/i.test(returningData):
							{
								let index = this.instance.combinedLayerArray.findIndex(
									(x) => x.name === returningData.split('=')[0].slice(0, -8)
								)
								if (index != -1) this.instance.combinedLayerArray[index].sourceA = returningData.split('=')[1]
								updateBasicVariables(this.instance)
								this.instance.checkFeedbacks('inputSource')
							}
							break
						case /\.sourceB/i.test(returningData):
							{
								let index = this.instance.combinedLayerArray.findIndex(
									(x) => x.name === returningData.split('=')[0].slice(0, -8)
								)
								if (index != -1) this.instance.combinedLayerArray[index].sourceB = returningData.split('=')[1]
								updateBasicVariables(this.instance)
								this.instance.checkFeedbacks('inputSource')
							}
							break
						//case /^Mixer\.AudioMixers\.AudioMixer\.mute/i.test(returningData): // This is an Audio Master Mixer stuff
						case /^AUDIOMIXER\.mute/i.test(returningData): // This is an Audio Master Mixer stuff
							{
								this.instance.KairosObj.audio_master_mute = parseInt(returningData.split('=')[1])
								this.instance.checkFeedbacks('audioMuteMaster')
								updateBasicVariables(this.instance)
							}
							break
						//case /^Mixer\.AudioMixers\.AudioMixer\.Channel/i.test(returningData): // This is an Audio channel Mixer stuff
						case /^AUDIOMIXER\.Channel/i.test(returningData): // This is an Audio channel Mixer stuff
							{
								let index = parseInt(returningData.slice(returningData.search('.Channel') + 9, -7)) - 1
								this.instance.KairosObj.AUDIO_CHANNELS[index].mute = parseInt(returningData.split('=')[1])
								this.instance.checkFeedbacks('audioMuteChannel')
								updateBasicVariables(this.instance)
							}
							break
						case /\.source=/i.test(returningData): // This is an AUX source
							{
								let index = this.instance.KairosObj.AUX.findIndex(
									(x) => x.index === returningData.split('=')[0].slice(0, returningData.split('=')[0].search('.source'))
								)
								if (index != -1) this.instance.KairosObj.AUX[index].liveSource = returningData.split('=')[1]
								this.instance.checkFeedbacks('aux')
								updateBasicVariables(this.instance)
							}
							break
						//case /^MACROS\./i.test(returningData): // This is an MACRO
						//	{
						//		this.instance.KairosObj.MACROS.push(returningData)
						//	}
						//	break
						//case /\.available=/i.test(returningData): // This is an AUX available check
						//	{
						//		let index = this.instance.KairosObj.AUX.findIndex(
						//			(x) => x.aux === returningData.split('=')[0].slice(0, -10)
						//		)
						//		if (index != -1) this.instance.KairosObj.AUX[index].available = parseInt(returningData.split('=')[1])
						//		updateBasicVariables(this.instance)
						//	}
						//	break
						case /\.repeat=/i.test(returningData): // //This is an PLAYER repeat check
							{
								let index = this.instance.KairosObj.PLAYERS.findIndex(
									(x) => x.player === returningData.split('=')[0].slice(0, -7)
								)
								if (index != -1) this.instance.KairosObj.PLAYERS[index].repeat = parseInt(returningData.split('=')[1])
								updateBasicVariables(this.instance)
							}
							break
						case /^MVPRESETS\./i.test(returningData): // This is an MV Preset list
							this.instance.KairosObj.MV_PRESETS.push(returningData)
							break
						case /\.Macros\./i.test(returningData): // This is a Scene Macro
							{
								let sceneName = data[0].slice(0, data[0].search('.Macros.')) // SCENES.Main.Macros.M-1
								let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
								if (index != -1) this.instance.KairosObj.SCENES[index].smacros.push(returningData)
							}
							break
						case /\.Snapshots\./i.test(returningData): // This is a Snapshot
							{
								let sceneName = data[0].slice(0, data[0].search('.Snapshots.')) // SCENES.Main.Snapshots.SNP1
								let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
								if (index != -1) this.instance.KairosObj.SCENES[index].snapshots.push(returningData)
							}
							break
						case /\.preset_enabled/i.test(returningData): //This is an response to SCENES.Main.Layers.Background.preset_enabled=1
							{
								let layer = returningData.split('=')[0].slice(0, returningData.split('=')[0].search('.preset_enabled'))
								let index = this.instance.combinedLayerArray.findIndex((s) => s.name === layer)
								if (index != -1)
									this.instance.combinedLayerArray[index].preset_enabled = parseInt(returningData.split('=')[1])
							}
							break
						//case /\.Layers\./i.test(returningData): // This is a Layer list
						//	{
						//		this.instance.combinedLayerArray.push({
						//			name: returningData,
						//			sourceA: '',
						//			sourceB: '',
						//			preset_enabled: 0,
						//		})
						//		let sceneName = returningData.slice(0, returningData.search('.Layers.'))
						//		let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
						//		if (index != -1)
						//			this.instance.KairosObj.SCENES[index].layers.push({ layer: returningData, sourceA: '', sourceB: '' })
						//	}
						//	break
						case /\.Transitions\./i.test(returningData): // This is an Transition list, SCENES.Main.Transitions.BgdMix
							{
								let sceneName = returningData.slice(0, returningData.search('.Transitions.'))
								let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
								if (index != -1) this.instance.KairosObj.SCENES[index].transitions.push(returningData)
							}
							break
						case /\.name=/i.test(returningData): // This is an name for an Input or AUX (BE AWARE THIS CAN CHANGE IN THE FUTURE)
							{
								let source = returningData.split('=')[0].slice(0, -5)
								let name = returningData.split('=')[1]
								let index_i = this.instance.KairosObj.INPUTS.findIndex((x) => x.uuid === source)
								let index_a = this.instance.KairosObj.AUX.findIndex((x) => x.index === source)
								if (index_i != -1) this.instance.KairosObj.INPUTS[index_i].name = name
								else if (index_a != -1) this.instance.KairosObj.AUX[index_a].name = name
								updateBasicVariables(this.instance)
							}
							break
						//case /^FXINPUTS\./i.test(returningData):
						//	this.instance.KairosObj.INPUTS.push({ shortcut: returningData, name: returningData })
						//	break
						case /^MATTES\./i.test(returningData):
							this.instance.KairosObj.INPUTS.push({ index: returningData, uuid: returningData, name: returningData })
							break
						//case /^MEDIA\.stills\./i.test(returningData):
						//	this.instance.KairosObj.MEDIA_STILLS.push(returningData)
						//	break

						default:
							console.log('ERROR No Case provided for: ' + returningData)
					}
				}
			}
		}

		// ToDo: It should operate call back function with each transitions
		this.sockets.main.on('data', (data: Buffer) => {
			let str = this.recvRemain + data.toString()
			this.recvRemain = ''
			if (str.endsWith('\r\n') === false) {
				// store uncompleted line
				const end = str.lastIndexOf('\r\n')
				if (end < 0) {
					this.recvRemain = str
					return
				}
				this.recvRemain = str.substring(end + 2)
				str = str.substring(0, end + 2)
			}
			while (this.listQueue.length > 0) {
				if (str.startsWith('\r\n')) {
					// empty list
					str = str.substring(2)
					processData([], this.listQueue[0])
				} else if (str.startsWith('Error\r\n')) {
					// error return
					str = str.substring(7)
				} else {
					let end = str.indexOf('\r\n\r\n')
					if (end < 0) {
						this.recvRemain = str + this.recvRemain
						return
					}
					const message = str.substring(0, end).split('\r\n')
					processData(message, this.listQueue[0])
					str = str.substring(end + 4)
				}
				this.listQueue.shift()
				if (this.listQueue.length === 0 && this.waitListCallback) {
					const callback = this.waitListCallback
					this.waitListCallback = null
					callback()
				}
			}
			if (str !== '') {
				const message = str.split('\r\n')
				processData(message, '')
				if (this.nCommand > 0) {
					this.nCommand -= message.length - 1
					if (this.nCommand <= 0) {
						this.nCommand = 0
						if (this.waitCommandCallback) {
							const callback = this.waitCommandCallback
							this.waitCommandCallback = null
							callback()
						}
					}
				}
			}
		})
	}

	/**
	 * @param command function and any params
	 * @description Check TCP connection status and format command to send to Kairos
	 * @todo It should provide callback or promise of each transaction
	 */
	public readonly sendCommand = (command: string): void => {
		if (this.sockets.main) {
			if (command.startsWith('list:') || command.startsWith('info:')) {
				this.listQueue.push(command.replace(/^(list|info):/, ''))
			} else if (command !== '') {
				this.nCommand++
			}
			const message = `${command}\r\n`
			//			if (message != '\r\n') console.log('send:' + message.trim())

			this.sockets.main.send(message).catch((err) => {
				if (err) this.instance.log('debug', err.message)
			})
			if (message != '\r\n') this.instance.log('debug', `Sending command: ${message}`)
		}
	}

	/**
	 * @description Check for config changes and start new connections/polling if needed
	 */
	public readonly update = (): void => {
		if (this.instance.config === undefined) return
		const hostCheck = this.instance.config.host !== this.tcpHost || this.instance.config.tcpPort !== this.tcpPort

		if (hostCheck) {
			this.tcpHost = this.instance.config.host
			this.tcpPort = this.instance.config.tcpPort
			if (this.keepAliveInterval != undefined) clearInterval(this.keepAliveInterval)

			let ready = true

			const destroySocket = (type: 'main') => {
				const socket = this.sockets[type] as any
				if (socket && (socket.connected || socket.socket.connecting)) {
					socket.destroy()
				} else {
					if (socket !== null) {
						this.instance.log('debug', `socket error: Cannot update connections while they're initializing`)
						ready = false
					}
				}
			}

			if (this.sockets.main) destroySocket('main')

			if (ready) this.init()
		}
	}
}
