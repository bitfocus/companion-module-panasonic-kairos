import KairosInstance from '.'
import { InstanceStatus } from '@companion-module/base'
import { FeedbackId } from './feedback'
import { createInputWithName, updateFlags } from './utils'

export class REST {
	private readonly instance: KairosInstance
	private pullerInterval: NodeJS.Timer | undefined
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

		this.setupKairos()
	}

	/**
	 * @description Create initial requests to Kairos
	 */
	public readonly setupKairos = async (): Promise<void> => {
		// Load players
		this.instance.KairosObj.PLAYERS = [
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
		]
		// Load audio channels
		this.instance.KairosObj.AUDIO_CHANNELS = [
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
		]
		// Load scenes into Kairos
		try {
			// this.instance.KairosObj.SCENES = []
			let sceneResult = await this.sendCommand('/scenes')
			let converted = JSON.parse(sceneResult)
			this.instance.KairosObj.SCENES = converted
		} catch (error) {
			this.instance.log('error', 'Error parsing scenes: ' + error)
		}
		// Load inputs into Kairos
		try {
			let inputResult = await this.sendCommand('/inputs')
			let converted = JSON.parse(inputResult)
			converted.reverse()
			for (const input of converted) {
				this.instance.KairosObj.INPUTS.unshift(input)
			}
		} catch (error) {
			this.instance.log('error', 'Error parsing inputs: ' + error)
		}
		// Load aux into Kairos
		try {
			// this.instance.KairosObj.AUX = []
			let auxResult = await this.sendCommand('/aux')
			let converted = JSON.parse(auxResult)
			this.instance.KairosObj.AUX = converted
		} catch (error) {
			this.instance.log('error', 'Error parsing aux: ' + error)
		}
		// Connect the layers to the scenes
		// this.instance.combinedLayerArray = []
		this.instance.KairosObj.SCENES.forEach((scene: any) => {
			scene.layers.forEach((layer: any) => {
				this.instance.combinedLayerArray.push({
					name: `/${scene.name}/${layer.name}`,
					sourceA: layer.sourceA,
					sourceB: layer.sourceB,
					uuid: layer.uuid,
				})
			})
		})

		const addInternalSources = () => {
			this.instance.KairosObj.INPUTS.push(createInputWithName('Black'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('White'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('ColorBar'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('ColorCircle'))
		}
		addInternalSources()

		/**
		 * Pulls the current state of the switcher, for now a double function
		 */
		let pullScenes = async () => {
			try {
				let sceneResult = await this.sendCommand('/scenes')
				let converted = JSON.parse(sceneResult)
				this.instance.KairosObj.SCENES = converted
				// Connect the layers to the scenes
				this.instance.combinedLayerArray = []
				this.instance.KairosObj.SCENES.forEach((scene: any) => {
					scene.layers.forEach((layer: any) => {
						this.instance.combinedLayerArray.push({
							name: `/${scene.name}/${layer.name}`,
							sourceA: layer.sourceA,
							sourceB: layer.sourceB,
							uuid: layer.uuid,
						})
					})
				})
				this.instance.checkFeedbacks(FeedbackId.inputSource)
				this.instance.updateInstance(updateFlags.All as number)
			} catch (error: any) {
				this.instance.log('error', 'Error processing scenes: ' + error.message)
			}
		}
		this.pullerInterval = setInterval(pullScenes, 5000) //Change pulling Time?
	}

	/**
	 * @description Close connection on instance disable/removal
	 */
	public readonly destroy = (): void => {
		if (this.pullerInterval != undefined) clearInterval(this.pullerInterval)
	}
	/**
	 * Send rest command to Kairos
	 * @param command
	 * @returns string response
	 */
	public readonly sendCommand = async (command: string): Promise<string> => {
		const formattedRestRequest = `http://${this.host}:${this.restPort}${command}`
		const base64Credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64')
		const headers = new Headers({
			Authorization: `Basic ${base64Credentials}`,
		})
		if (command !== '/scenes') this.instance.log('debug', `Sending command: ${formattedRestRequest}`)
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
}
