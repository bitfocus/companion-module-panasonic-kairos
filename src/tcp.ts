import { InstanceStatus, TCPHelper } from '@companion-module/base'
import KairosInstance from '.'
import { updateBasicVariables } from './variables'

interface TCPSockets {
	main: TCPHelper | null
}

enum updateFlags {
	None = 0,
	onlyVariables = 1,
	All = 2,
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

		// this.instance.combinedLayerArray = []
		// this.instance.combinedTransitionsArray = []
		// this.instance.combinedSmacrosArray = []
		// this.instance.combinedSnapshotsArray = []

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
			this.instance.log('debug', 'status change' + status)
			this.instance.updateStatus(status)
		})

		this.sockets.main.on('error', (err: Error) => {
			this.instance.updateStatus(InstanceStatus.UnknownError, err.message)
		})
		// Helpers
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
		// const fetchStills = () => {
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

		// 	}

		// const fetchFxinputs = () => {
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
		// 		this.sendCommand('list:RAMRECORDERS')
		// 		this.sendCommand('list:PLAYERS')
		// 		//this.sendCommand('list:AUDIOPLAYERS')
		// 		this.sendCommand('list:GFXCHANNELS')
		// 		//this.sendCommand('list:FXINPUTS')
		// 		this.sendCommand('list:MATTES')
		// 		//this.sendCommand('list:MEDIA.stills')
		// }

		const subscribeToData = () => {
			//this.sendCommand('subscribe:Mixer.AudioMixers.AudioMixer.mute')
			this.sendCommand('subscribe:AUDIOMIXER.mute')
			// Get all transitions together
			// for (const SCENE of this.instance.KairosObj.SCENES) {
			// 	this.instance.combinedTransitionsArray = this.instance.combinedTransitionsArray.concat(SCENE.transitions)
			// }
			// // Get all Scene Macros together
			// for (const SCENE of this.instance.KairosObj.SCENES) {
			// 	this.instance.combinedSmacrosArray = this.instance.combinedSmacrosArray.concat(SCENE.smacros)
			// }
			// // Get all Snapshots together
			// for (const SCENE of this.instance.KairosObj.SCENES) {
			// 	this.instance.combinedSnapshotsArray = this.instance.combinedSnapshotsArray.concat(SCENE.snapshots)
			// }

			this.instance.KairosObj.PLAYERS.forEach((element) => {
				this.sendCommand(`subscribe:${element.player}.repeat`)
			})
			this.instance.KairosObj.AUDIO_CHANNELS.forEach((element) => {
				//this.sendCommand(`subscribe:Mixer.AudioMixers.AudioMixer.${element.channel}.mute`)
				this.sendCommand(`subscribe:AUDIOMIXER.${element.channel}.mute`)
			})
			this.instance.KairosObj.AUX.forEach((element) => {
				this.sendCommand(`subscribe:${element.name}.source`)
				this.sendCommand(`subscribe:${element.name}.name`)
			})
			this.instance.KairosObj.INPUTS.forEach((element) => {
				this.sendCommand(`subscribe:${element.shortcut}.name`)
			})

			for (const LAYER of this.instance.combinedLayerArray) {
				this.sendCommand(`subscribe:${LAYER.name}.sourceA`)
			}

			for (const LAYER of this.instance.combinedLayerArray) {
				this.sendCommand(`subscribe:${LAYER.name}.sourceB`)
			}
		}
		this.sockets.main.on('connect', async () => {
			this.instance.log('debug', 'Connected to mixer')
			this.instance.updateStatus(InstanceStatus.Ok, 'Connected')
			this.keepAliveInterval = setInterval(keepAlive, 4500) //session expires at 5 seconds
			await subscribeToData()
			this.instance.updateInstance(updateFlags.All as number)
			//	console.log('OBJ', this.instance.KairosObj))
		})

		let keepAlive = () => {
			this.sendCommand('')
			// this.instance.log('debug', 'Keepalive sent')
		}

		/**
		 * Processing here
		 */

		const processData = async (data: Array<string>, cmd: string): Promise<number> => {
			let whatTodo = updateFlags.All
			if (this.processCallback) {
				this.processCallback(data, cmd)
				// } else if (data.find((element) => element === 'IP1')) {
				// 	//This is an input list
				// 	data.forEach((element) => {
				// 		if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
				// 	})
				// } else if (data.find((element) => element === 'GFX1')) {
				// 	//This is an input list
				// 	data.forEach((element) => {
				// 		if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
				// 	})
				// } else if (data.find((element) => element === 'RR1')) {
				// 	//This is an input list
				// 	data.forEach((element) => {
				// 		if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
				// 	})
				// } else if (data.find((element) => element === 'CP1')) {
				// 	//This is an input list
				// 	data.forEach((element) => {
				// 		if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
				// 	})
			} else if (data.find((element) => element === 'APPLICATION:NEW')) {
				//Complete refresh of all data
				this.instance.log('debug', 'Complete refresh of all data')
				// SEND UPDATE ALL??????
				await subscribeToData()
				this.instance.updateInstance(updateFlags.All as number)
			} else {
				whatTodo = updateFlags.None
				// Do a switch block to go fast through the rest of the data
				for (const returningData of data) {
					switch (true) {
						case /^$/i.test(returningData):
							break
						case /^OK$/i.test(returningData):
							// this.instance.log('debug', 'Command succeeded')
							break
						case /^Error$/i.test(returningData):
							// this.instance.log('debug', 'Command failed')
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
									(x) => x.name === returningData.split('=')[0].slice(0, returningData.split('=')[0].search('.source'))
								)
								if (index != -1) this.instance.KairosObj.AUX[index].source = returningData.split('=')[1]
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
						case /\.sourceOptions=/i.test(returningData): // This is scene source options list
							//per scene source options
							// this.instance.kairosObj.SCENES.SOURCE_OPTIONS.push(returningData)
							break
						// case /\.Macros\./i.test(returningData): // This is a Scene Macro
						// 	{
						// 		let sceneName = data[0].slice(0, data[0].search('.Macros.')) // SCENES.Main.Macros.M-1
						// 		let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
						// 		if (index != -1) this.instance.KairosObj.SCENES[index].smacros.push(returningData)
						// 	}
						// 	break
						// case /\.Snapshots\./i.test(returningData): // This is a Snapshot
						// 	{
						// 		let sceneName = data[0].slice(0, data[0].search('.Snapshots.')) // SCENES.Main.Snapshots.SNP1
						// 		let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
						// 		if (index != -1) this.instance.KairosObj.SCENES[index].snapshots.push(returningData)
						// 	}
						// 	break
						case /\.preset_enabled/i.test(returningData): //This is an response to SCENES.Main.Layers.Background.preset_enabled=1
							{
								let layer = returningData.split('=')[0].slice(0, returningData.split('=')[0].search('.preset_enabled'))
								let index = this.instance.combinedLayerArray.findIndex((s) => s.name === layer)
								if (index != -1)
									this.instance.combinedLayerArray[index].preset_enabled = parseInt(returningData.split('=')[1])
							}
							break
						// case /\.Layers\./i.test(returningData): // This is a Layer list
						// 	{
						// 		this.instance.combinedLayerArray.push({
						// 			name: returningData,
						// 			sourceA: '',
						// 			sourceB: '',
						// 			preset_enabled: 0,
						// 		})
						// 		let sceneName = returningData.slice(0, returningData.search('.Layers.'))
						// 		let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
						// 		if (index != -1)
						// 			this.instance.KairosObj.SCENES[index].layers.push({ layer: returningData, sourceA: '', sourceB: '' })
						// 	}
						// 	break
						// case /\.Transitions\./i.test(returningData): // This is an Transition list, SCENES.Main.Transitions.BgdMix
						// 	{
						// 		let sceneName = returningData.slice(0, returningData.search('.Transitions.'))
						// 		let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
						// 		if (index != -1) this.instance.KairosObj.SCENES[index].transitions.push(returningData)
						// 	}
						// 	break
						case /\.name=/i.test(returningData): // This is an name for an Input or AUX (BE AWARE THIS CAN CHANGE IN THE FUTURE)
							{
								let source = returningData.split('=')[0].slice(0, -5)
								let name = returningData.split('=')[1]
								let index_i = this.instance.KairosObj.INPUTS.findIndex((x) => x.shortcut === source)
								let index_a = this.instance.KairosObj.AUX.findIndex((x) => x.name === source)
								if (index_i != -1) this.instance.KairosObj.INPUTS[index_i].name = name
								else if (index_a != -1) this.instance.KairosObj.AUX[index_a].name = name
								updateBasicVariables(this.instance)
							}
							break
						//case /^FXINPUTS\./i.test(returningData):
						//	this.instance.KairosObj.INPUTS.push({ shortcut: returningData, name: returningData })
						//	break
						case /^MATTES\./i.test(returningData):
							// this.instance.KairosObj.INPUTS.push({
							// 	shortcut: returningData,
							// 	name: returningData,
							// })
							break
						//case /^MEDIA\.stills\./i.test(returningData):
						//	this.instance.KairosObj.MEDIA_STILLS.push(returningData)
						//	break

						default:
							this.instance.log('error', 'No Case provided for: ' + returningData)
					}
				}
			}
			return whatTodo
		}

		// ToDo: It should operate call back function with each transitions
		this.sockets.main.on('data', async (data: Buffer) => {
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
					this.instance.updateInstance(await processData([], this.listQueue[0]))
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
					this.instance.updateInstance(await processData(message, this.listQueue[0]))
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
				this.instance.updateInstance(await processData(message, ''))
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
			// if (message != '\r\n') this.instance.log('debug', `Sending command: ${message}`)
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
