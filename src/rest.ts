import type KairosInstance from './index.js'
import { InstanceStatus } from '@companion-module/base'
import isReachable from 'is-reachable'
import { FeedbackId } from './feedback.js'
import { createInputWithName, updateFlags } from './utils.js'

export class REST {
	private readonly instance: KairosInstance
	private pullerInterval: NodeJS.Timeout | undefined
	private reachableRetryTimer: NodeJS.Timeout | undefined
	private destroyed = false
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
		/**
		 * Pulls the current state of the switcher
		 */
		let pullScenes = async () => {
			if (this.destroyed) return
			try {
				/**
				 * Pulls the macro's
				 */
				let pullMacros = async () => {
					try {
						let macroResult = await this.sendCommand('/macros')
						if (this.destroyed) return
						let convertedMacros = JSON.parse(macroResult)
						this.instance.KairosObj.MACROS = convertedMacros
					} catch (error: any) {
						this.instance.log('error', 'Error pulling macros : ' + error.message)
					}
				}
				pullMacros()

				let pullMultiviewers = async () => {
					try {
						let multiviewerResult = await this.sendCommand('/multiviewers')
						if (this.destroyed) return
						let convertedMultiviewers = JSON.parse(multiviewerResult)
						this.instance.KairosObj.MULTIVIEWERS = convertedMultiviewers
					} catch (error: any) {
						this.instance.log('error', 'Error pulling multiviewers : ' + error.message)
					}
				}
				pullMultiviewers()

				let sceneResult = await this.sendCommand('/scenes')
				if (this.destroyed) return
				let convertedScenes = JSON.parse(sceneResult)
				this.instance.KairosObj.SCENES = convertedScenes

				// clear arrays
				this.instance.combinedLayerArray = []
				this.instance.KairosObj.SCENES_MACROS = []
				this.instance.KairosObj.SNAPSHOTS = []

				// Load inputs, macros and snapshots from scenes into Kairos
				this.instance.KairosObj.SCENES.forEach((scene: any) => {
					if (scene.macros) {
						if (scene.macros.lenght != this.instance.KairosObj.SCENES_MACROS.length) {
							scene.macros.forEach(
								(macro: { color: string; name: string; state: string; uuid: string; scene: string; path: string }) => {
									macro.name = scene.path ? `${scene.path}${scene.name}-${macro.name}` : `${scene.name}-${macro.name}`
									// macro.scene = scene.path ? scene.path + scene.name : scene.name
									macro.scene = scene.name
									this.instance.KairosObj.SCENES_MACROS.push(macro)
								}
							)
						}
					}
					if (scene.snapshots) {
						scene.snapshots.forEach((snapshot: any) => {
							snapshot.scene = scene.name
							this.instance.KairosObj.SNAPSHOTS.push(snapshot)
						})
					}
					if (!scene.layers) return
					scene.layers.forEach((layer: any) => {
						this.instance.combinedLayerArray.push({
							path: scene.path,
							sceneName: scene.name,
							layerName: layer.name,
							sourceA: layer.sourceA,
							sourceB: layer.sourceB,
							uuid: `/${scene.uuid}/${layer.uuid}`,
						})
						if (!layer.sources) return
						layer.sources.forEach((source: any) => {
							if (this.instance.KairosObj.INPUTS.findIndex((x) => x.name == source) == -1)
								this.instance.KairosObj.INPUTS.push(createInputWithName(source))
						})
					})
				})

				let auxResult = await this.sendCommand('/aux')
				if (this.destroyed) return
				let convertedAux = JSON.parse(auxResult)
				this.instance.KairosObj.AUX = convertedAux

				// Load inputs from aux into Kairos
				this.instance.KairosObj.AUX.forEach((aux: any) => {
					if (!aux.sources) return
					aux.sources.forEach((source: any) => {
						if (this.instance.KairosObj.INPUTS.findIndex((x) => x.name == source) == -1)
							this.instance.KairosObj.INPUTS.push(createInputWithName(source))
					})
				})

				this.instance.checkFeedbacks(FeedbackId.aux)
				this.instance.checkFeedbacks(FeedbackId.inputSource)
				this.instance.updateInstance(updateFlags.All as number)
			} catch (error: any) {
				this.instance.log('error', 'Error pulling auxes and scenes : ' + error.message)
			}
		}

		const addInternalSources = () => {
			this.instance.KairosObj.INPUTS.push(createInputWithName('Black'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('White'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('ColorBar'))
			this.instance.KairosObj.INPUTS.push(createInputWithName('ColorCircle'))
		}
		/**
		 * Starts polling once the server is reachable, checking again every few seconds until it is
		 */
		const startPulling = async (): Promise<void> => {
			const reachable = await isReachable(`${this.host}:${this.restPort}`).catch(() => false)
			if (this.destroyed) return
			if (!reachable) {
				this.instance.updateStatus(InstanceStatus.ConnectionFailure, 'Server not reachable')
				this.reachableRetryTimer = setTimeout(() => void startPulling(), 5000)
				return
			}
			this.reachableRetryTimer = undefined
			this.instance.updateStatus(InstanceStatus.Ok, 'Server reachable')
			void pullScenes()
			this.pullerInterval = setInterval(() => void pullScenes(), 5000) //Change pulling Time?
		}
		//check server
		await startPulling()
		if (this.destroyed) return
		addInternalSources()
		this.instance.updateInstance(updateFlags.All as number)
	}

	/**
	 * @description Close connection on instance disable/removal
	 */
	public readonly destroy = (): void => {
		this.destroyed = true
		if (this.pullerInterval != undefined) clearInterval(this.pullerInterval)
		if (this.reachableRetryTimer != undefined) clearTimeout(this.reachableRetryTimer)
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
			if (!this.destroyed) this.instance.updateStatus(InstanceStatus.Ok)
			return result
		} catch (error) {
			if (!this.destroyed) this.instance.updateStatus(InstanceStatus.UnknownError, 'Error sending command')
			return (error as Error).message
		}
	}
}
