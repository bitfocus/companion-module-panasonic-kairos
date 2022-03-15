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
      main_background_sourceA: '',
      main_background_sourceB: '',
      audio_master_mute: 0,
      INPUTS: [{ input: '', name: '', live: false }],
      SCENES: [{ scene: '', snapshots: [], layers: [], transitions: [], next_transition: '' }],
      SNAPSHOTS: [],
      AUX: [{ aux: '', liveSource: '', sources: [], available: 0 }],
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

    // The functions socket is primary and controls the module status and startup of activator and xml sockets
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
    const delay = (time: number) => {
      return new Promise((resolve) => setTimeout(resolve, time))
    }

    const sendCommandWithDelay = async (command: string, milisec: number) => {
      // We can await a function that returns a promise
      this.sendCommand(command)
      await delay(milisec)
    }

    let fetchInitialData = (interval: number) => {
      return new Promise((resolve) => {
        delay(10)
          .then(() => this.sendCommand('list:AUX'))
          .then(() => delay(interval).then(() => this.sendCommand('list:Mixer.Inputs')))
          .then(() => delay(interval).then(() => this.sendCommand('list:SCENES')))
          .then(() => delay(interval).then(() => this.sendCommand('list:MACROS')))
          .then(() => delay(interval).then(() => this.sendCommand('list:Mixer.MV-Presets')))
          .then(async () => {
            // Fetch all source options for aux
            for (const item of this.instance.KairosObj.AUX) {
              if (item.aux !== '') await sendCommandWithDelay(`${item.aux}.sourceOptions`, interval)
            }
          })
          .then(async () => {
            // Fetch all input names
            for (const iterator of this.instance.KairosObj.INPUTS) {
              if (iterator.input !== '') await sendCommandWithDelay(`${iterator.input}.name`, 250)
            }
          })
          .then(async () => {
            // Fetch all snapshots per scene
            for (const item of this.instance.KairosObj.SCENES) {
              if (item.scene !== '') await sendCommandWithDelay(`list:${item.scene}.Snapshots`, interval)
            }
          })
          .then(async () => {
            // Fetch all layer per scene
            for (const item of this.instance.KairosObj.SCENES) {
              if (item.scene !== '') await sendCommandWithDelay(`list:${item.scene}.Layers`, interval)
            }
          })
          .then(async () => {
            // Fetch all transitions per scene
            for (const item of this.instance.KairosObj.SCENES) {
              if (item.scene !== '') await sendCommandWithDelay(`list:${item.scene}.Transitions`, interval)
            }
          })
          .then(async () => {
            // Fetch next transition per scene
            for (const item of this.instance.KairosObj.SCENES) {
              if (item.scene !== '') await sendCommandWithDelay(`${item.scene}.next_transition`, interval)
            }
          })
          .then(() =>
            delay(interval).then(async () => {
              for (const iterator of this.instance.KairosObj.AUX) {
                if (iterator.aux !== '') await sendCommandWithDelay(`${iterator.aux}.source`, 250)
              }
            })
          )
          .then(() =>
            delay(interval).then(async () => {
              for (const iterator of this.instance.KairosObj.AUX) {
                if (iterator.aux !== '') await sendCommandWithDelay(`${iterator.aux}.available`, 250)
              }
            })
          )
          .then(() =>
            delay(interval).then(() => {
              for (const SCENE of this.instance.KairosObj.SCENES) {
                this.instance.combinedLayerArray = this.instance.combinedLayerArray.concat(
                  SCENE.layers.map((x) => ({ name: x.layer, sourceA: x.sourceA, sourceB: x.sourceB }))
                )
              }
            })
          )
          .then(() => {
            delay(interval).then(async () => {
              for (const LAYER of this.instance.combinedLayerArray) {
                await sendCommandWithDelay(`${LAYER.name}.sourceA`, 350)
              }
            })
          })
          .then(() => {
            delay(interval).then(async () => {
              for (const LAYER of this.instance.combinedLayerArray) {
                await sendCommandWithDelay(`${LAYER.name}.sourceB`, 350)
              }
            })
          })
          .then(() =>
            delay(200).then(() => {
              for (const iterator of this.instance.KairosObj.SCENES) {
                this.instance.combinedTransitionsArray = this.instance.combinedTransitionsArray.concat(
                  iterator.transitions
                )
              }
            })
          )
          .then(() =>
            delay(200).then(() => {
              for (const iterator of this.instance.KairosObj.SCENES) {
                this.instance.combinedSnapshotsArray = this.instance.combinedSnapshotsArray.concat(iterator.snapshots)
              }
            })
          )
          .then(async () => {
            // Fetch all LayerSourceOptions
            for (const item of this.instance.combinedLayerArray) {
              if (item.name !== '') await sendCommandWithDelay(`${item.name}.sourceOptions`, 350)
            }
          })
          .then(() => delay(interval).then(() => resolve('fetch ready')))
      })
    }

    this.sockets.main.on('connect', () => {
      this.instance.status(1)
      this.instance.log('debug', 'Connected to mixer')
      // 300 milisec is save, if you put it lower it will break
      let interval_subscribe = 150
      let interval_fetching = 300
      fetchInitialData(interval_fetching).then(() => {
        // All data is in, now Subscribe to some stuff
        this.sendCommand('Subscribe:Mixer.AudioMixers.AudioMixer.mute')
        delay(interval_subscribe)
          .then(() => {
            this.instance.KairosObj.PLAYERS.forEach((element) => {
              this.sendCommand(`subscribe:${element.player}.repeat`)
            })
          })
          .then(() =>
            delay(interval_subscribe).then(() => {
              this.instance.KairosObj.AUDIO_CHANNELS.forEach((element) => {
                this.sendCommand(`subscribe:Mixer.AudioMixers.AudioMixer.${element.channel}.mute`)
              })
            })
          )
          .then(() =>
            delay(interval_subscribe).then(() => {
              this.instance.KairosObj.AUX.forEach((element) => {
                this.sendCommand(`subscribe:${element.aux}.source`)
              })
            })
          )
          .then(() =>
            delay(interval_subscribe).then(() => {
              this.instance.KairosObj.SCENES.forEach((element) => {
                this.sendCommand(`subscribe:${element.scene}.next_transition`)
              })
            })
          )
          .then(() => {
            for (const LAYER of this.instance.combinedLayerArray) {
              delay(interval_subscribe).then(() => this.sendCommand(`subscribe:${LAYER.name}.sourceA`))
            }
          })
          .then(() => {
            for (const LAYER of this.instance.combinedLayerArray) {
              delay(interval_subscribe).then(() => this.sendCommand(`subscribe:${LAYER.name}.sourceB`))
            }
          })
          .then(() => delay(interval_subscribe).then(() => this.instance.status(0)))
          .then(() => delay(10).then(() => this.instance.updateInstance()))
          .then(() => (this.keepAliveInterval = setInterval(keepAlive, 4500))) //session expires at 5 seconds
          .then(() => console.log(this.instance.combinedLayerArray))
      })
    })

    let keepAlive = () => {
      this.sendCommand('')
    }

    this.sockets.main.on('data', (data: Buffer) => {
      //create array from data
      const message = data.toString().split('\r\n')
      // console.log('message', message)
      if (message[0] == 'OK') {
        //Status message
        this.instance.log('debug', 'Command succeeded')
      } else if (message[0] == 'Error') {
        //Status message
        this.instance.log('debug', 'Command failed')
      } else if (message[0].split('=')[0].includes('.sourceA')) {
        console.log('layer:', message)
				let firstItem = message[0].split('=')
				let index = this.instance.combinedLayerArray.findIndex((x) => x.name === firstItem[0].slice(0,-8))
				this.instance.combinedLayerArray[index].sourceA = firstItem[1]
        this.instance.variables?.updateVariables()
        // this.instance.checkFeedbacks('inputSource')
      } else if (message[0].split('=')[0].includes('.sourceB')) {
        console.log('layer:', message)
				let firstItem = message[0].split('=')
				let index = this.instance.combinedLayerArray.findIndex((x) => x.name === firstItem[0].slice(0,-8))
				this.instance.combinedLayerArray[index].sourceB = firstItem[1]
        this.instance.variables?.updateVariables()
        // this.instance.checkFeedbacks('inputSource')
      } else if (message[0].includes('Mixer.AudioMixers.AudioMixer.mute')) {
        //This is an Audio Master Mixer stuff
        this.instance.KairosObj.audio_master_mute = parseInt(message[0].split('=')[1])
        this.instance.checkFeedbacks('audioMuteMaster')
        this.instance.variables?.updateVariables()
      } else if (message[0].includes('.source=')) {
        //This is an AUX source
        let split = message[0].split('=')
        let index = this.instance.KairosObj.AUX.findIndex(
          (x) => x.aux === split[0].slice(0, split[0].search('.source'))
        )
        if (index != -1) this.instance.KairosObj.AUX[index].liveSource = split[1]
        this.instance.checkFeedbacks('aux')
        this.instance.variables?.updateVariables()
      } else if (message[0].includes('Mixer.AudioMixers.AudioMixer.')) {
        //This is an Audio channel Mixer stuff
        let channelIndex = parseInt(message[0].slice(29, -5)) - 1
        this.instance.KairosObj.AUDIO_CHANNELS[channelIndex].mute = parseInt(message[0].split('=')[1])
        this.instance.checkFeedbacks('audioMuteChannel')
        this.instance.variables?.updateVariables()
      } else if (message[0].includes('MACROS.')) {
        //This is an MACRO list
        this.instance.KairosObj.MACROS = message.filter(String)
      } else if (message[0].includes('.available=')) {
        //This is an AUX available check
        let split = message[0].split('=')
        let index = this.instance.KairosObj.AUX.findIndex((x) => x.aux === split[0].slice(0, 10))
        if (index != -1) this.instance.KairosObj.AUX[index].available = parseInt(split[1])
        this.instance.variables?.updateVariables()
      } else if (message[0].includes('.repeat=')) {
        //This is an PLAYER repeat check
        let split = message[0].split('=')
        let index = this.instance.KairosObj.PLAYERS.findIndex((x) => x.player === split[0].slice(0, 7))
        if (index != -1) this.instance.KairosObj.PLAYERS[index].repeat = parseInt(split[1])
        this.instance.variables?.updateVariables()
      } else if (message[0].includes('Mixer.MV-Presets.')) {
        //This is an MV Preset list
        this.instance.KairosObj.MV_PRESETS = message.filter(String)
      } else if (message[0].includes('.Snapshots.')) {
        //This is an SNAPSHOT list
        // SCENES.Main.Snapshots.SNP1, extract scene name
        let sceneName = message[0].slice(0, message[0].search('.Snapshots.'))
        let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
        if (index != -1) this.instance.KairosObj.SCENES[index].snapshots = message.filter(String)
      } else if (message[0].search('.sourceOptions') != -1 && message[0].search('Layers') != -1) {
        // SourceOptions for Layers
        // 'SCENES.New Scene-1.Layers.Layer-3.sourceOptions=BLACK,WHITE,Mixer.SourceGroup.ColorMattes.ColA,Mixer.SourceGroup.ColorMattes.ColB,Mixer.SourceGroup.ColorMattes.ColC,Mixer.SourceGroup.FxInputs.FxStream1,IP1,NDI1,STREAM1,STREAM2,'
        let left = message[0].split('=')[0]
        let sourceOptions = message[0].split('=')[1].split(',').filter(String)
        let sceneName = left.slice(0, left.search('.Layers.'))
        let layer = left.slice(0, -14)
        let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
        if (index != -1) {
          let indexLayer = this.instance.KairosObj.SCENES[index].layers.findIndex((s) => s.layer === layer)
          if (indexLayer != -1)
            this.instance.KairosObj.SCENES[index].layers[indexLayer].options = sourceOptions.filter(String)
        }
        for (let index = 0; index < sourceOptions.length; index++) {
          if (this.instance.KairosObj.INPUTS.find((x) => x.input === sourceOptions[index]) === undefined) {
            this.instance.KairosObj.INPUTS.push({
              input: sourceOptions[index],
              name: sourceOptions[index],
              live: false,
            })
          }
        }
      } else if (message[0].includes('.Layers.')) {
        //This is an Layer list
        // SCENES.Main.Layers.Background
        let sceneName = message[0].slice(0, message[0].search('.Layers.'))
        let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
        if (index != -1)
          this.instance.KairosObj.SCENES[index].layers = message
            .filter(String)
            .map((layer) => ({ layer, sourceA: '', sourceB: '', options: [] }))
      } else if (message[0].includes('.next_transition=')) {
        //This is a next transition
        // SCENES.Main.next_transition=SCENES.Main.Transitions.BgdMix
        let split = message[0].split('=')
        let sceneName = split[0].slice(0, message[0].search('.next_transition='))
        let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
        if (index != -1) this.instance.KairosObj.SCENES[index].next_transition = split[1]
      } else if (message[0].includes('.Transitions.')) {
        //This is an Transition list
        // SCENES.Main.Transitions.BgdMix
        let sceneName = message[0].slice(0, message[0].search('.Transitions.'))
        let index = this.instance.KairosObj.SCENES.findIndex((s) => s.scene === sceneName)
        if (index != -1) this.instance.KairosObj.SCENES[index].transitions = message.filter(String)
      } else if (message[0].includes('.name=')) {
        //This is an name for an Input (BE AWARE THIS CAN CHANGE IN THE FUTURE)
        message.forEach((res) => {
          if (res !== '') {
            let input = res.split('=')[0].slice(0, -5)
            let name = res.split('=')[1]
            for (const key in this.instance.KairosObj.INPUTS) {
              if (Object.prototype.hasOwnProperty.call(this.instance.KairosObj.INPUTS, key)) {
                const inputFromArray = this.instance.KairosObj.INPUTS[key]
                if (inputFromArray.input == input) {
                  inputFromArray.name = name
                  break
                }
              }
            }
          }
        })
      } else if (message[0].search('.sourceOptions') != -1 && message[0].search('AUX') != -1) {
        //This is Aux source option
        // Split data for name and options
        let auxSourceOptions = message[0].split('=')
        // aux name/ID is the first part
        let auxName = auxSourceOptions[0].slice(0, -14)
        // When ready remove the first part so you keep only the options
        auxSourceOptions.shift()
        // Then there is only one item in the array
        // let newArray = auxSourceOptions[0].trim().split(',').join('').split('')
        let newArray = auxSourceOptions[0].trim().split(',').filter(String)
        let index = this.instance.KairosObj.AUX.findIndex((x) => x.aux === auxName)
        if (index != -1) this.instance.KairosObj.AUX[index].sources = newArray
        for (let index = 0; index < newArray.length; index++) {
          if (this.instance.KairosObj.INPUTS.find((x) => x.input === newArray[index]) === undefined) {
            this.instance.KairosObj.INPUTS.push({ input: newArray[index], name: newArray[index], live: false })
          }
        }
      } else if (message.find((element) => element == 'IP1')) {
        //This is an input list
        if (message.length > 0) {
          this.instance.KairosObj.INPUTS.length = 0
          message.forEach((element) => {
            if (element !== '') this.instance.KairosObj.INPUTS.push({ input: element, name: element, live: false })
          })
        }
      } else if (message.find((element) => element == 'SCENES.Main')) {
        //This is an SCENES list, only at startup so reset
        this.instance.KairosObj.SCENES.length = 0
        message.forEach((element) => {
          if (element !== '')
            this.instance.KairosObj.SCENES.push({
              scene: element,
              snapshots: [],
              layers: [],
              transitions: [],
              next_transition: '',
            })
        })
      } else if (message.find((element) => element == 'IP-AUX1')) {
        //This is an AUX list
        this.instance.KairosObj.AUX.length = 0
        message.forEach((element) => {
          if (element !== '')
            this.instance.KairosObj.AUX.push({ aux: element, liveSource: '', sources: [], available: 1 })
        })
      } else {
        console.log(message)
      }
    })
  }

  /**
   * @param command function and any params
   * @description Check TCP connection status and format command to send to Kairos
   */
  public readonly sendCommand = (command: string): void => {
    // @ts-expect-error Types doesn't include 'connected' property
    if (this.sockets.main && this.sockets.main.connected) {
      const message = `${command}\r\n`
      if (message != '\r\n') console.log(message)

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
