import { InstanceStatus, TCPHelper } from '@companion-module/base'
import type KairosInstance from './index.js'
import { FeedbackId } from './feedback.js'
import { updateFlags } from './utils.js'
import { updateBasicVariables } from './variables.js'

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
	private keepAliveInterval: NodeJS.Timeout | undefined
	private lastErrorMessage: string | null = null
	private recvRemain = ''
	private listQueue: string[] = [] // queue of outstanding command of list or info

	constructor(instance: KairosInstance, host: string, tcpPort: number) {
		this.instance = instance
		this.tcpHost = host
		this.tcpPort = tcpPort

		this.init()
	}

	/**
	 * @description Close connection on instance disable/removal
	 */
	public readonly destroy = (): void => {
		if (this.sockets.main) this.sockets.main.destroy()
		this.stopKeepAlive()
	}

	private readonly stopKeepAlive = (): void => {
		if (this.keepAliveInterval != undefined) clearInterval(this.keepAliveInterval)
		this.keepAliveInterval = undefined
	}

	/**
	 * @description Create a TCP connection to Kairos
	 */
	public readonly init = (): void => {
		if (this.tcpHost === undefined || this.tcpPort === undefined) {
			this.instance.log(
				'warn',
				`Unable to connect to Kairos, please configure a host and port in the instance configuration`,
			)
			return
		}

		this.sockets.main = new TCPHelper(this.tcpHost, this.tcpPort)

		this.sockets.main.on('status_change', (status: InstanceStatus, message: string | undefined) => {
			this.instance.connectionStatus.set('tcp', status, message ?? null)
			if (status !== InstanceStatus.Ok) this.stopKeepAlive()
		})

		// TCPHelper retries every few seconds, so only log an error when it differs from the last one
		this.sockets.main.on('error', (err: Error) => {
			if (err.message === this.lastErrorMessage) return
			this.lastErrorMessage = err.message
			this.instance.log('error', `TCP connection error: ${err.message}`)
		})

		const fetchStills = () => {
			this.instance.KairosObj.MEDIA_STILLS.length = 0
			this.sendCommand('list:MEDIA.stills')
		}

		const subscribeToData = () => {
			this.sendCommand('subscribe:AUDIOMIXER.mute')

			this.instance.KairosObj.PLAYERS.forEach((element) => {
				this.sendCommand(`subscribe:${element.player}.repeat`)
			})
			this.instance.KairosObj.AUDIO_CHANNELS.forEach((element) => {
				this.sendCommand(`subscribe:AUDIOMIXER.${element.channel}.mute`)
			})
		}
		this.sockets.main.on('connect', () => {
			this.instance.log('debug', 'Connected to mixer')
			this.lastErrorMessage = null
			this.stopKeepAlive()
			this.keepAliveInterval = setInterval(keepAlive, 4500) //session expires at 5 seconds
			fetchStills()
			subscribeToData()
			this.instance.updateInstance(updateFlags.All)
		})

		const keepAlive = () => {
			this.sendCommand('')
		}

		const processData = (data: Array<string>): number => {
			let whatTodo = updateFlags.All
			if (data.find((element) => element === 'APPLICATION:NEW')) {
				this.instance.log('debug', 'Complete refresh of all data')
				subscribeToData()
				this.instance.updateInstance(updateFlags.All)
			} else {
				whatTodo = updateFlags.onlyVariables
				for (const returningData of data) {
					switch (true) {
						case /^$/i.test(returningData):
							break
						case /^OK$/i.test(returningData):
							break
						case /^Error$/i.test(returningData):
							break
						case /\.sourceA/i.test(returningData):
							{
								const index = this.instance.combinedLayerArray.findIndex(
									(x) => x.layerName === returningData.split('=')[0].slice(0, -8),
								)
								if (index != -1) this.instance.combinedLayerArray[index].sourceA = returningData.split('=')[1]
								this.instance.checkFeedbacks(FeedbackId.inputSource)
							}
							break
						case /\.sourceB/i.test(returningData):
							{
								const index = this.instance.combinedLayerArray.findIndex(
									(x) => x.layerName === returningData.split('=')[0].slice(0, -8),
								)
								if (index != -1) this.instance.combinedLayerArray[index].sourceB = returningData.split('=')[1]
								this.instance.checkFeedbacks(FeedbackId.inputSource)
							}
							break
						case /^AUDIOMIXER\.mute/i.test(returningData):
							{
								this.instance.KairosObj.audio_master_mute = parseInt(returningData.split('=')[1])
								this.instance.checkFeedbacks(FeedbackId.audioMuteMaster)
							}
							break
						case /^AUDIOMIXER\.Channel/i.test(returningData):
							{
								const index = parseInt(returningData.slice(returningData.search('.Channel') + 9, -7)) - 1
								this.instance.KairosObj.AUDIO_CHANNELS[index].mute = parseInt(returningData.split('=')[1])
								this.instance.checkFeedbacks(FeedbackId.audioMuteChannel)
							}
							break
						case /\.source=/i.test(returningData):
							{
								const index = this.instance.KairosObj.AUX.findIndex(
									(x) => x.name === returningData.split('=')[0].slice(0, returningData.split('=')[0].search('.source')),
								)
								if (index != -1) this.instance.KairosObj.AUX[index].source = returningData.split('=')[1]
								this.instance.checkFeedbacks(FeedbackId.aux)
							}
							break
						case /\.repeat=/i.test(returningData):
							{
								const index = this.instance.KairosObj.PLAYERS.findIndex(
									(x) => x.player === returningData.split('=')[0].slice(0, -7),
								)
								if (index != -1) this.instance.KairosObj.PLAYERS[index].repeat = parseInt(returningData.split('=')[1])
								updateBasicVariables(this.instance)
							}
							break
						case /\.name=/i.test(returningData): // Name for an input or AUX
							{
								const source = returningData.split('=')[0].slice(0, -5)
								const name = returningData.split('=')[1]
								const index_i = this.instance.KairosObj.INPUTS.findIndex((x) => x.shortcut === source)
								const index_a = this.instance.KairosObj.AUX.findIndex((x) => x.name === source)
								if (index_i != -1) this.instance.KairosObj.INPUTS[index_i].name = name
								else if (index_a != -1) this.instance.KairosObj.AUX[index_a].name = name
							}
							break
						case /^MEDIA\.stills\./i.test(returningData):
							// A folder could be returned here
							if (returningData.search('&#46;rr') !== -1) {
								this.instance.KairosObj.MEDIA_STILLS.push(returningData)
							} else {
								this.sendCommand(`list:${returningData}`)
							}
							break

						default:
							this.instance.log('error', 'No Case provided for: ' + returningData)
					}
				}
			}
			return whatTodo
		}

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
					this.instance.updateInstance(processData([]))
				} else if (str.startsWith('Error\r\n')) {
					// error return
					str = str.substring(7)
				} else {
					const end = str.indexOf('\r\n\r\n')
					if (end < 0) {
						this.recvRemain = str + this.recvRemain
						return
					}
					const message = str.substring(0, end).split('\r\n')
					this.instance.updateInstance(processData(message))
					str = str.substring(end + 4)
				}
				this.listQueue.shift()
			}
			if (str !== '') {
				const message = str.split('\r\n')
				this.instance.updateInstance(processData(message))
			}
		})
	}

	/**
	 * @param command function and any params
	 * @description Check TCP connection status and format command to send to Kairos
	 */
	public readonly sendCommand = (command: string): void => {
		if (this.sockets.main) {
			if (command.startsWith('list:') || command.startsWith('info:')) {
				this.listQueue.push(command.replace(/^(list|info):/, ''))
			}
			const message = `${command}\r\n`

			this.sockets.main.sendAsync(message).catch((err) => {
				if (err) this.instance.log('debug', err.message)
			})
			if (message != '\r\n') this.instance.log('debug', `Sending command: ${message}`)
		}
	}
}
