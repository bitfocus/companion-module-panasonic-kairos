import KairosInstance from '.'
import { InstanceStatus } from '@companion-module/base'
// import { FeedbackId } from './feedback'
import { createInputWithName, updateFlags } from './utils'
const isReachable = require('is-reachable')

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
		// // Load players
		// this.instance.KairosObj.PLAYERS = [
		// 	{ player: 'RR1', repeat: 0 },
		// 	{ player: 'RR2', repeat: 0 },
		// 	{ player: 'RR3', repeat: 0 },
		// 	{ player: 'RR4', repeat: 0 },
		// 	{ player: 'RR5', repeat: 0 },
		// 	{ player: 'RR6', repeat: 0 },
		// 	{ player: 'RR7', repeat: 0 },
		// 	{ player: 'RR8', repeat: 0 },
		// 	{ player: 'CP1', repeat: 0 },
		// 	{ player: 'CP2', repeat: 0 },
		// 	{ player: 'AP1', repeat: 0 },
		// 	{ player: 'AP2', repeat: 0 },
		// 	{ player: 'AP3', repeat: 0 },
		// 	{ player: 'AP4', repeat: 0 },
		// 	{ player: 'AP5', repeat: 0 },
		// 	{ player: 'AP6', repeat: 0 },
		// 	{ player: 'AP7', repeat: 0 },
		// 	{ player: 'AP8', repeat: 0 },
		// 	{ player: 'AP9', repeat: 0 },
		// 	{ player: 'AP10', repeat: 0 },
		// 	{ player: 'AP11', repeat: 0 },
		// 	{ player: 'AP12', repeat: 0 },
		// 	{ player: 'AP13', repeat: 0 },
		// 	{ player: 'AP14', repeat: 0 },
		// 	{ player: 'AP15', repeat: 0 },
		// 	{ player: 'AP16', repeat: 0 },
		// ]
		// // Load audio channels
		// this.instance.KairosObj.AUDIO_CHANNELS = [
		// 	{ channel: 'Channel 1', mute: 0 },
		// 	{ channel: 'Channel 2', mute: 0 },
		// 	{ channel: 'Channel 3', mute: 0 },
		// 	{ channel: 'Channel 4', mute: 0 },
		// 	{ channel: 'Channel 5', mute: 0 },
		// 	{ channel: 'Channel 6', mute: 0 },
		// 	{ channel: 'Channel 7', mute: 0 },
		// 	{ channel: 'Channel 8', mute: 0 },
		// 	{ channel: 'Channel 9', mute: 0 },
		// 	{ channel: 'Channel 10', mute: 0 },
		// 	{ channel: 'Channel 11', mute: 0 },
		// 	{ channel: 'Channel 12', mute: 0 },
		// 	{ channel: 'Channel 13', mute: 0 },
		// 	{ channel: 'Channel 14', mute: 0 },
		// 	{ channel: 'Channel 15', mute: 0 },
		// 	{ channel: 'Channel 16', mute: 0 },
		// ]
		/**
		 * Pulls the current state of the switcher
		 */
		// first clear the arrays
		this.instance.KairosObj.SCENES = []

		let pullScenes = async (scenesToConvert: any) => {
			try {
				// you have a group of scenes go get the children
				for (let index = 0; index < scenesToConvert.length; index++) {
					let sceneName = scenesToConvert[index]
					// Check for each scene if it is a group of scenes
					this.sendCommand(`${sceneName}`).then(async (response) => {
						let resultCheckSceneGroup = JSON.parse(response)

						if (resultCheckSceneGroup['type'] == 'mixer::SceneGroup') {
							pullScenes(resultCheckSceneGroup['children'])
							return
						}

						sceneName = sceneName.slice(0, -1)
						let scene: any = { name: sceneName }

						this.sendCommand(`${sceneName}/Layers`)
							.then((response) => {
								let sceneLayers = JSON.parse(response)
								scene.layers = Array.isArray(sceneLayers['children']) ? (sceneLayers['children'] as string[]) : []

								return this.sendCommand(`${sceneName}/Macros`)
							})
							.then((response) => {
								let sceneMacros = JSON.parse(response)
								scene.macros = Array.isArray(sceneMacros['children']) ? (sceneMacros['children'] as string[]) : []

								return this.sendCommand(`${sceneName}/Snapshots`)
							})
							.then((response) => {
								let sceneSnapshots = JSON.parse(response)
								scene.snapshots = Array.isArray(sceneSnapshots['children'])
									? (sceneSnapshots['children'] as string[])
									: []

								return this.sendCommand(`${sceneName}/Transitions`)
							})
							.then((response) => {
								let sceneTransitions = JSON.parse(response)
								scene.transitions = Array.isArray(sceneTransitions['children'])
									? (sceneTransitions['children'] as string[])
									: []

								this.instance.KairosObj.SCENES.push(scene)
							})
							.catch((error) => {
								console.error('Error:', error)
							})
					})
				}

				this.instance.log('debug', 'Scenes pulled')
				// clear arrays
				this.instance.combinedLayerArray = []
				this.instance.KairosObj.SCENES_MACROS = []
				this.instance.KairosObj.SNAPSHOTS = []
			} catch (error: any) {
				this.instance.log('error', 'Error pulling scenes : ' + error.message)
			}
		}

		// get all scenes in the Kairos switcher
		let fetchScenes = await this.sendCommand('/v1.0/Mixer/Scenes')
		let convertedFetchScenes = JSON.parse(fetchScenes)
		if (convertedFetchScenes['type'] == 'mixer::SceneGroup') {
			await pullScenes(convertedFetchScenes['children'])
			this.instance.log('debug', JSON.stringify(this.instance.KairosObj.SCENES))
		}

		const addInternalSources = () => {
			this.instance.KairosObj.INPUTS.push(createInputWithName('Black'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('White'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('ColorBar'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('ColorCircle'))
		}

		const basicRequest = async () => {
			let fetchScenes = await this.sendCommand('/v1.0/Mixer/Scenes')
			let convertedFetchScenes = JSON.parse(fetchScenes)
			if (convertedFetchScenes['type'] == 'mixer::SceneGroup') {
				await pullScenes(convertedFetchScenes['children'])
			}
		}
		//check server
		await isReachable(this.host).then(async (reachable: boolean) => {
			if (!reachable) {
				this.instance.updateStatus(InstanceStatus.ConnectionFailure, 'Server not reachable')
			} else {
				this.instance.updateStatus(InstanceStatus.Ok, 'Server reachable')

				this.pullerInterval = setInterval(basicRequest, 5000) //Change pulling Time?
			}
		})
		addInternalSources()
		// this.instance.updateInstance(updateFlags.All as number)
		return Promise.resolve()
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
		if (command !== '/scenes' && command !== '/aux' && command !== '/macros' && command !== '/multiviewers')
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
