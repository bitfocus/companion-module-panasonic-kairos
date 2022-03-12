import tcp from '../../../tcp'
import KairosInstance from '.'

// interface MessageBuffer {
//   dataLength: number
//   message: Buffer
// }

// OK, Warning, Error, Unknown
type TCPStatus = 0 | 1 | 2 | null

interface TCPSockets {
  main: tcp | null
  subscribe: tcp | null
}

export class TCP {
  private readonly instance: KairosInstance
  // private messageBuffer: MessageBuffer = {
  //   dataLength: 0,
  //   message: Buffer.from(''),
  // }
  private sockets: TCPSockets = {
    main: null,
    subscribe: null,
  }
  private tcpHost: string
  private tcpPort: number
  private keepAliveInterval: NodeJS.Timer | undefined

  constructor(instance: KairosInstance) {
    this.instance = instance
    this.tcpHost = instance.config.host
    this.tcpPort = instance.config.port

    let inputs = []
    for (let index = 1; index < 49; index++) {
      inputs.push({ input: `IP${index}`, name: '' })
      if (index < 33) inputs.push({ input: `SDI${index}`, name: '' })
      if (index < 7) inputs.push({ input: `STREAM${index}`, name: '' })
    }
    inputs.push({ input: `NDI1`, name: '' })
    inputs.push({ input: `NDI2`, name: '' })
		inputs.sort(function(a, b) {
			let keyA = a.input,	keyB = b.input
			if (keyA < keyB) return -1;
			if (keyA > keyB) return 1;
			return 0;
		})
		
    this.instance.KairosObj = {
      main_background_sourceA: '',
      main_background_sourceB: '',
      audio_master_mute: 0,
      INPUTS: inputs,
      SCENES: [],
      SNAPSHOTS: [],
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
    if (this.sockets.subscribe) this.sockets.subscribe.destroy()
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
    this.sockets.subscribe = new tcp(this.tcpHost, this.tcpPort)

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

    this.sockets.subscribe.on('error', (err: Error) => {
      this.instance.status(this.instance.STATUS_ERROR, err.message)
    })

    function delay(time: number) {
      return new Promise((resolve) => setTimeout(resolve, time))
    }

    this.sockets.subscribe.on('connect', () => {
      this.instance.status(0)
      this.instance.log('debug', 'via subscription')
      this.sendCommandSubscribeChannel('Subscribe:Mixer.AudioMixers.AudioMixer.mute')
      delay(200)
        .then(() => {
          this.instance.KairosObj.PLAYERS.forEach((element) => {
            this.sendCommandSubscribeChannel(`subscribe:${element.player}.repeat`)
          })
        })
        .then(() =>
          delay(200).then(() => {
            this.instance.KairosObj.AUDIO_CHANNELS.forEach((element) => {
              this.sendCommandSubscribeChannel(`subscribe:Mixer.AudioMixers.AudioMixer.${element.channel}.mute`)
            })
          })
        )
        .then(() =>
          delay(200).then(() => this.sendCommandSubscribeChannel('subscribe:SCENES.Main.Layers.Background.sourceA'))
        )
        .then(() =>
          delay(200).then(() => this.sendCommandSubscribeChannel('subscribe:SCENES.Main.Layers.Background.sourceB'))
        )
    })

    let fetchInitialData = () => {
      return new Promise((resolve) => {
        let waitForArray = new Promise((res) => {
          this.instance.KairosObj.INPUTS.forEach((element, index, array) => {
            delay(200).then(() => this.sendCommand(`${element.input}.name`))
            if (index === array.length - 1) res('ready')
          })
        })
        waitForArray
          .then(() => delay(300).then(() => this.sendCommand('list:AUX')))
          .then(() => delay(300).then(() => this.sendCommand('list:SCENES')))
          .then(() => delay(300).then(() => this.sendCommand('list:MACROS')))
          .then(() => delay(300).then(() => this.sendCommand('list:SCENES.Main.Snapshots')))
          .then(() => delay(300).then(() => this.sendCommand('list:Mixer.MV-Presets')))
          .then(() => resolve('Resolving'))
      })
    }

    this.sockets.main.on('connect', () => {
      this.instance.status(0)
      this.instance.log('debug', 'Connected to mixer')
      fetchInitialData().then(() => {
        this.instance.updateInstance()
        this.keepAliveInterval = setInterval(keepAlive, 4500) //session expires at 5 seconds
      })
    })

    let keepAlive = () => {
      this.sendCommand('')
      this.sendCommandSubscribeChannel('')
    }

    this.sockets.main.on('data', (data: Buffer) => {
      //create array from data
      const message = data.toString().trim().split('\r\n')

      if (message.find((element) => element == 'OK')) {
        //Status message
        this.instance.log('debug', 'Command succeeded')
      } else if (message.find((element) => element == 'Error')) {
        //Status message
        this.instance.log('debug', 'Command failed')
      } else if (message.find((element) => element == 'IP1')) {
        //This is an input list
        console.log(message)

        // message.forEach((element) => {
        //   this.instance.KairosObj.INPUTS.push({ input: element, name: '' })
        // })
      } else if (message.find((element) => element.includes('.name='))) {
        //This is an name for an Input (BE AWARE THIS CAN CHANGE IN THE FUTURE)
        message.forEach((res) => {
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
        })
      } else if (message.find((element) => element == 'IP-AUX1')) {
        //This is an AUX list
        this.instance.KairosObj.AUX = message
      } else if (message.find((element) => element.includes('MACROS.'))) {
        //This is an MACRO list
        this.instance.KairosObj.MACROS = message
      } else if (message.find((element) => element.includes('Mixer.MV-Presets.'))) {
        //This is an MV Preset list
        this.instance.KairosObj.MV_PRESETS = message
      } else if (message.find((element) => element.includes('SCENES.Main.Snapshots'))) {
        //This is an SNAPSHOT list
        this.instance.KairosObj.SNAPSHOTS = message
      } else if (message.find((element) => element == 'SCENES.Main')) {
        //This is an SCENES list
        this.instance.KairosObj.SCENES = message
      } else {
        console.log(message)
      }

      // this.instance.log('debug', `Command Response: ${message}`)
    })
    this.sockets.subscribe.on('data', (data: Buffer) => {
      //create array from data
      const message = data.toString().trim().split('\r\n')

      if (message[0].split('=')[0] == 'SCENES.Main.Layers.Background.sourceA') {
        this.instance.KairosObj.main_background_sourceA = message[0].split('=')[1]
        this.instance.variables?.updateVariables()
        this.instance.checkFeedbacks('inputSourceA')
        console.log('Value of Background SourceA', message[0].split('=')[1])
      } else if (message[0].split('=')[0] == 'SCENES.Main.Layers.Background.sourceB') {
        this.instance.KairosObj.main_background_sourceB = message[0].split('=')[1]
        this.instance.variables?.updateVariables()
        this.instance.checkFeedbacks('inputSourceB')
        console.log('Value of Background SourceB', message[0].split('=')[1])
      } else if (message.find((element) => element.includes('Mixer.AudioMixers.AudioMixer.mute'))) {
        //This is an Audio Master Mixer stuff
        this.instance.KairosObj.audio_master_mute = parseInt(message[0].split('=')[1])
        this.instance.checkFeedbacks('audioMuteMaster')
      } else if (message.find((element) => element.includes('Mixer.AudioMixers.AudioMixer.'))) {
        //This is an Audio channel Mixer stuff
        let channelIndex = parseInt(message[0].slice(29, -5)) - 1
        this.instance.KairosObj.AUDIO_CHANNELS[channelIndex].mute = parseInt(message[0].split('=')[1])
        this.instance.checkFeedbacks('audioMuteChannel')
      } else {
        console.log(message)
      }

      // this.instance.log('debug', `Command Response: ${message}`)
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
      if (message != '') console.log(message)

      this.sockets.main.write(message, (err) => {
        if (err) this.instance.log('debug', err.message)
      })
      this.instance.log('debug', `Sending command: ${message}`)
    }
  }
  /**
   * @param command function and any params
   * @description Check TCP connection status and format command to send to Kairos
   */
  public readonly sendCommandSubscribeChannel = (command: string): void => {
    // @ts-expect-error Types doesn't include 'connected' property
    if (this.sockets.subscribe && this.sockets.subscribe.connected) {
      const message = `${command}\r\n`
      if (message != '') console.log(message)

      this.sockets.subscribe.write(message, (err) => {
        if (err) this.instance.log('debug', err.message)
      })
      this.instance.log('debug', `Sending command: ${message}`)
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
