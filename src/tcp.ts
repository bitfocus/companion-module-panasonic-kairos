import tcp from '../../../tcp'
import KairosInstance from '.'

// OK, Warning, Error, Unknown
type TCPStatus = 0 | 1 | 2 | null

interface TCPSockets {
	main: tcp | null
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
	private nListCmd = 0 // number of outstanding command of list or info
	private nCommand = 0 // number of outstanding command
	private processCallback: ((data: Array<string>) => void) | null = null
	private waitListCallback: (() => void) | null = null
	private waitCommandCallback: (() => void) | null = null

	constructor(instance: KairosInstance) {
		this.instance = instance
		this.tcpHost = instance.config.host
		this.tcpPort = instance.config.port

		// Want to Keep this as reminder for sorting key pair array's
		// inputs.sort(function(a, b) {
		// 	let keyA = a.input,	keyB = b.input
		// 	if (keyA < keyB) return -1;
		// 	if (keyA > keyB) return 1;
		// 	return 0;
		// })
		this.instance.combinedLayerArray = []
		this.instance.combinedTransitionsArray = []
		this.instance.combinedSnapshotsArray = []

		this.instance.KairosObj = {
			audio_master_mute: 0,
			INPUTS: [],
			MEDIA_STILLS: [],
			SCENES: [{ scene: '', snapshots: [], layers: [], transitions: [] }],
			SNAPSHOTS: [],
			AUX: [{ aux: '', liveSource: '', available: 0 }],
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

		this.sockets.main = new tcp(this.tcpHost, this.tcpPort)

		this.sockets.main.on('status_change', (status: TCPStatus, message: string) => {
			let state: 0 | 1 | 2 | null = this.instance.STATUS_UNKNOWN
			if (status === 0) state = this.instance.STATUS_OK
			if (status === 1) state = this.instance.STATUS_WARNING
			if (status === 2) state = this.instance.STATUS_ERROR

			this.instance.status(state, message)
			this.instance.connected = status === 0
		})

		this.sockets.main.on('error', (err: Error) => {
			this.instance.status(this.instance.STATUS_ERROR, err.message)
		})
		// Helpers
		const addInternalSourceGroup = () => {
			this.instance.KairosObj.INPUTS.push({ shortcut: 'Environment.InternalSourceGroup.MV1', name: 'MV1' })
			this.instance.KairosObj.INPUTS.push({ shortcut: 'Environment.InternalSourceGroup.MV2', name: 'MV2' })
			this.instance.KairosObj.INPUTS.push({ shortcut: 'BLACK', name: 'BLACK' })
			this.instance.KairosObj.INPUTS.push({ shortcut: 'WHITE', name: 'WHITE' })
			this.instance.KairosObj.INPUTS.push({ shortcut: 'Environment.InternalSourceGroup.ColorBar', name: 'ColorBar' })
			this.instance.KairosObj.INPUTS.push({
				shortcut: 'Environment.InternalSourceGroup.ColorCircle',
				name: 'ColorCircle',
			})
		}
		const addScene = (scene: string) => {
			if (scene !== '')
				this.instance.KairosObj.SCENES.push({
					scene: scene,
					snapshots: [],
					layers: [],
					transitions: [],
				})
			this.instance.KairosObj.INPUTS.push({ shortcut: scene, name: scene })
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
					// receive top hierarchy
					data.forEach((element) => {
						this.sendCommand(`list:${element}`)
					})

					// ToDo: It should manage third level or more
					this.processCallback = (data: Array<string>) => {
						// receive second hierarchy
						const layers = data.find((element) => element.endsWith('.Layers'))
						if (layers) {
							addScene(layers.substring(0, layers.length - 7))
						} else {
							data.forEach((element) => {
								addScene(element)
							})
						}
					}

					listFinish().then(() => {
						this.processCallback = null
						resolve('fetch ready')
					})
				}
			})
		}
		const fetchFixedItems = () => {
			return new Promise((resolve) => {
				this.sendCommand('list:AUX')
				this.sendCommand('list:MACROS')
				this.sendCommand('list:Mixer.MV-Presets')
				this.sendCommand('list:Mixer.Inputs')
				this.sendCommand('list:Mixer.RamRecorders')
				this.sendCommand('list:Mixer.ClipPlayers')
				this.sendCommand('list:Mixer.GfxChannels')
				this.sendCommand('list:Mixer.SourceGroup.FxInputs')
				this.sendCommand('list:Mixer.SourceGroup.ColorMattes')
				this.sendCommand('list:MEDIA.stills')
				addInternalSourceGroup()
				listFinish().then(() => resolve('fetch ready'))
			})
		}
		const fetchVariableItems = () => {
			return new Promise((resolve) => {
				// Fetch all snapshots per scene
				for (const item of this.instance.KairosObj.SCENES) {
					if (item.scene !== '') {
						this.sendCommand(`list:${item.scene}.Snapshots`)
					}
				}
				// Fetch all layer per scene
				for (const item of this.instance.KairosObj.SCENES) {
					if (item.scene !== '') {
						this.sendCommand(`list:${item.scene}.Layers`)
					}
				}
				// Fetch all transitions per scene
				for (const item of this.instance.KairosObj.SCENES) {
					if (item.scene !== '') {
						this.sendCommand(`list:${item.scene}.Transitions`)
					}
				}

				listFinish().then(() => {
					// Fetch all input names
					for (const INPUT of this.instance.KairosObj.INPUTS) {
						if (INPUT.shortcut !== '') {
							this.sendCommand(`${INPUT.shortcut}.name`)
						}
					}

					// Fetch all live sources for AUX
					for (const iterator of this.instance.KairosObj.AUX) {
						if (iterator.aux !== '') {
							this.sendCommand(`${iterator.aux}.source`)
						}
					}

					// Get live source for each layer
					for (const LAYER of this.instance.combinedLayerArray) {
						this.sendCommand(`${LAYER.name}.sourceA`)
					}
					// Get live source for each layer
					for (const LAYER of this.instance.combinedLayerArray) {
						this.sendCommand(`${LAYER.name}.sourceB`)
					}
					// Check if AUX is available
					for (const iterator of this.instance.KairosObj.AUX) {
						if (iterator.aux !== '') {
							this.sendCommand(`${iterator.aux}.available`)
						}
					}
					// Get PVW enabled or not
					for (const LAYER of this.instance.combinedLayerArray) {
						this.sendCommand(`${LAYER.name}.preset_enabled`)
					}
					commandFinish().then(() => resolve('fetch ready'))
				})
			})
		}

		const subscribeToData = () => {
			return new Promise((resolve) => {
				this.sendCommand('subscribe:Mixer.AudioMixers.AudioMixer.mute')
				// Get all transitions together
				for (const SCENE of this.instance.KairosObj.SCENES) {
					this.instance.combinedTransitionsArray = this.instance.combinedTransitionsArray.concat(SCENE.transitions)
				}
				// Get all Snapshots together
				for (const SCENE of this.instance.KairosObj.SCENES) {
					this.instance.combinedSnapshotsArray = this.instance.combinedSnapshotsArray.concat(SCENE.snapshots)
				}

				this.instance.KairosObj.PLAYERS.forEach((element) => {
					this.sendCommand(`subscribe:${element.player}.repeat`)
				})
				this.instance.KairosObj.AUDIO_CHANNELS.forEach((element) => {
					this.sendCommand(`subscribe:Mixer.AudioMixers.AudioMixer.${element.channel}.mute`)
				})
				this.instance.KairosObj.AUX.forEach((element) => {
					this.sendCommand(`subscribe:${element.aux}.source`)
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
			this.instance.status(1)
			this.instance.log('debug', 'Connected to mixer')
			await fetchScenes()
				.then(() => fetchFixedItems())
				.then(() => fetchVariableItems())
				.then(() => subscribeToData())
				.then(() => this.instance.status(0))
				.then(() => this.instance.updateInstance())
				.then(() => (this.keepAliveInterval = setInterval(keepAlive, 4500))) //session expires at 5 seconds
				.then(() => console.log('OBJ', this.instance.KairosObj))
		})

		let keepAlive = () => {
			this.sendCommand('')
		}

		/**
		 * Processing here
		 */

		const processData = (data: Array<string>) => {
			if (this.processCallback) {
				this.processCallback(data)
			} else if (data.find((element) => element === 'IP1')) {
				//This is an input list
				data.forEach((element) => {
					if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
				})
			} else if (data.find((element) => element === 'GFX1')) {
				//This is an input list
				data.forEach((element) => {
					if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
				})
			} else if (data.find((element) => element === 'RR1')) {
				//This is an input list
				data.forEach((element) => {
					if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
				})
			} else if (data.find((element) => element === 'CP1')) {
				//This is an input list
				data.forEach((element) => {
					if (element !== '') this.instance.KairosObj.INPUTS.push({ shortcut: element, name: element })
				})
			} else if (data.find((element) => element === 'IP-AUX1')) {
				//This is an AUX list
				this.instance.KairosObj.AUX.length = 0
				data.forEach((element) => {
					if (element !== '') this.instance.KairosObj.AUX.push({ aux: element, liveSource: '', available: 1 })
				})
			} else {
				// Do a switch block to go fast through the rest of the data
				for (const returningData of data) {
					switch (true) {
						case /^$/i.test(returningData):
							break
						case /OK/i.test(returningData):
							this.instance.log('debug', 'Command succeeded')
							break
						case /Error/i.test(returningData):
							this.instance.log('debug', 'Command failed')
							break
						case /\.sourceA/i.test(returningData):
							{
								let index = this.instance.combinedLayerArray.findIndex(
									(x) => x.name === returningData.split('=')[0].slice(0, -8)
								)
								if (index != -1) this.instance.combinedLayerArray[index].sourceA = returningData.split('=')[1]
								this.instance.variables?.updateVariables()
								this.instance.checkFeedbacks('inputSource')
							}
							break
						case /\.sourceB/i.test(returningData):
							{
								let index = this.instance.combinedLayerArray.findIndex(
									(x) => x.name === returningData.split('=')[0].slice(0, -8)
								)
								if (index != -1) this.instance.combinedLayerArray[index].sourceB = returningData.split('=')[1]
								this.instance.variables?.updateVariables()
								this.instance.checkFeedbacks('inputSource')
							}
							break
						case /^Mixer\.AudioMixers\.AudioMixer\.mute/i.test(returningData): // This is an Audio Master Mixer stuff
						case /^AUDIOMIXER\.mute/i.test(returningData): // This is an Audio Master Mixer stuff
							{
								this.instance.KairosObj.audio_master_mute = parseInt(returningData.split('=')[1])
								this.instance.checkFeedbacks('audioMuteMaster')
								this.instance.variables?.updateVariables()
							}
							break
						case /^Mixer\.AudioMixers\.AudioMixer\.Channel/i.test(returningData): // This is an Audio channel Mixer stuff
						case /^AUDIOMIXER\.Channel/i.test(returningData): // This is an Audio channel Mixer stuff
							{
								let index = parseInt(returningData.slice(returningData.search('.Channel') + 9, -7)) - 1
								this.instance.KairosObj.AUDIO_CHANNELS[index].mute = parseInt(returningData.split('=')[1])
								this.instance.checkFeedbacks('audioMuteChannel')
								this.instance.variables?.updateVariables()
							}
							break
						case /\.source=/i.test(returningData): // This is an AUX source
							{
								let index = this.instance.KairosObj.AUX.findIndex(
									(x) => x.aux === returningData.split('=')[0].slice(0, returningData.split('=')[0].search('.source'))
								)
								if (index != -1) this.instance.KairosObj.AUX[index].liveSource = returningData.split('=')[1]
								this.instance.checkFeedbacks('aux')
								this.instance.variables?.updateVariables()
							}
							break
						case /^MACROS\./i.test(returningData): // This is an MACRO
							{
								this.instance.KairosObj.MACROS.push(returningData)
							}
							break
						case /\.available=/i.test(returningData): // This is an AUX available check
							{
								let index = this.instance.KairosObj.AUX.findIndex(
									(x) => x.aux === returningData.split('=')[0].slice(0, -10)
								)
								if (index != -1) this.instance.KairosObj.AUX[index].available = parseInt(returningData.split('=')[1])
								this.instance.variables?.updateVariables()
							}
							break
						case /\.repeat=/i.test(returningData): // //This is an PLAYER repeat check
							{
								let index = this.instance.KairosObj.PLAYERS.findIndex(
									(x) => x.player === returningData.split('=')[0].slice(0, 7)
								)
								if (index != -1) this.instance.KairosObj.PLAYERS[index].repeat = parseInt(returningData.split('=')[1])
								this.instance.variables?.updateVariables()
							}
							break
						case /^Mixer\.MV-Presets/i.test(returningData): // This is an MV Preset list
						case /^MVPRESETS\./i.test(returningData): // This is an MV Preset list
							this.instance.KairosObj.MV_PRESETS.push(returningData)
							break
						case /\.Snapshots./i.test(returningData): // This is a Snapshot
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
						case /\.Layers\./i.test(returningData): // This is a Layer list
							{
								this.instance.combinedLayerArray.push({
									name: returningData,
									sourceA: '',
									sourceB: '',
									preset_enabled: 0,
								})
								let sceneName = returningData.slice(0, returningData.search('.Layers.'))
								let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
								if (index != -1)
									this.instance.KairosObj.SCENES[index].layers.push({ layer: returningData, sourceA: '', sourceB: '' })
							}
							break
						case /\.Transitions\./i.test(returningData): // This is an Transition list, SCENES.Main.Transitions.BgdMix
							{
								let sceneName = returningData.slice(0, returningData.search('.Transitions.'))
								let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
								if (index != -1) this.instance.KairosObj.SCENES[index].transitions.push(returningData)
							}
							break
						case /\.name=/i.test(returningData): // This is an name for an Input (BE AWARE THIS CAN CHANGE IN THE FUTURE)
							{
								let input = returningData.split('=')[0].slice(0, -5)
								let name = returningData.split('=')[1]
								let index = this.instance.KairosObj.INPUTS.findIndex((x) => x.shortcut === input)
								if (index != -1) this.instance.KairosObj.INPUTS[index].name = name
							}
							break
						case /^Mixer\.SourceGroup\.FxInputs/i.test(returningData):
						case /^FXINPUTS\./i.test(returningData):
							this.instance.KairosObj.INPUTS.push({ shortcut: returningData, name: returningData })
							break
						case /^Mixer\.SourceGroup\.ColorMattes/i.test(returningData):
						case /^MATTES\./i.test(returningData):
							this.instance.KairosObj.INPUTS.push({ shortcut: returningData, name: returningData })
							break
						case /^MEDIA\.stills\./i.test(returningData):
							this.instance.KairosObj.MEDIA_STILLS.push(returningData)
							break

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
			while (this.nListCmd > 0) {
				if (str.startsWith('\r\n')) {
					// empty list
					str = str.substring(2)
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
					console.log(message)
					processData(message)
					str = str.substring(end + 4)
				}
				this.nListCmd--
				if (this.nListCmd === 0 && this.waitListCallback) {
					const callback = this.waitListCallback
					this.waitListCallback = null
					callback()
				}
			}
			if (str !== '') {
				const message = str.split('\r\n')
				console.log(message)
				processData(message)
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
		// @ts-expect-error Types doesn't include 'connected' property
		if (this.sockets.main && this.sockets.main.connected) {
			if (command.startsWith('list:') || command.startsWith('info:')) {
				this.nListCmd++
			} else if (command !== '') {
				this.nCommand++
			}
			const message = `${command}\r\n`
			if (message != '\r\n') console.log('send:' + message.trim())

			this.sockets.main.write(message, (err) => {
				if (err) this.instance.log('debug', err.message)
			})
			if (message != '\r\n') this.instance.log('debug', `Sending command: ${message}`)
		}
	}

	/**
	 * @description Check for config changes and start new connections/polling if needed
	 */
	public readonly update = (): void => {
		const hostCheck = this.instance.config.host !== this.tcpHost || this.instance.config.port !== this.tcpPort

		if (hostCheck) {
			this.tcpHost = this.instance.config.host
			this.tcpPort = this.instance.config.port
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
