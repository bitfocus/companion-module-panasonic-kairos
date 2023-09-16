import KairosInstance from '.'
import { InstanceStatus } from '@companion-module/base'
import { FeedbackId } from './feedback'

enum updateFlags {
	None = 0,
	onlyVariables = 1,
	All = 2,
}

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
		let sceneResult = await this.sendCommand('/scenes')
		try {
			let converted = JSON.parse(sceneResult)
			this.instance.KairosObj.SCENES = converted
		} catch (error) {
			this.instance.log('error', 'Error parsing scenes: ' + error)
		}
		// Load inputs into Kairos
		let inputResult = await this.sendCommand('/inputs')
		try {
			let converted = JSON.parse(inputResult)
			this.instance.KairosObj.INPUTS = converted
		} catch (error) {
			this.instance.log('error', 'Error parsing inputs: ' + error)
		}
		// Load aux into Kairos
		let auxResult = await this.sendCommand('/aux')
		try {
			let converted = JSON.parse(auxResult)
			this.instance.KairosObj.AUX = converted
		} catch (error) {
			this.instance.log('error', 'Error parsing aux: ' + error)
		}
		// Connect the layers to the scenes
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

		// Helpers
		const addInternalSources = async () => {
			this.instance.log('info', 'Adding internal sources')
			let Black = await this.sendCommand('/inputs/black')
			let IP1 = await this.sendCommand('/inputs/IP1')
			let White = await this.sendCommand('/inputs/White')
			let ColorBar = await this.sendCommand('/inputs/COLORBAR')
			let ColorCircle = await this.sendCommand('/inputs/colorcircle')
			this.instance.log('debug', 'Black: ' + Black)
			this.instance.log('debug', 'IP1: ' + IP1)
			this.instance.log('debug', 'White: ' + White)
			this.instance.log('debug', 'ColorBar: ' + ColorBar)
			this.instance.log('debug', 'ColorCircle: ' + ColorCircle)
			// this.instance.KairosObj.INPUTS.push({ shortcut: 'INTSOURCES.MV1', name: 'MV1' })
			// this.instance.KairosObj.INPUTS.push({ shortcut: 'INTSOURCES.MV2', name: 'MV2' })
		}
		addInternalSources()

		// this.instance.updateInstance(updateFlags.All as number)

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
			} catch (error) {
				this.instance.log('error', 'Error parsing scenes: ' + error)
			}
		}
		this.pullerInterval = setInterval(pullScenes, 2000) //Change pulling Time?
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
}
