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
}

export class TCP {
  private readonly instance: KairosInstance
  // private messageBuffer: MessageBuffer = {
  //   dataLength: 0,
  //   message: Buffer.from(''),
  // }
  private sockets: TCPSockets = {
    main: null,
  }
  private tcpHost: string
  private tcpPort: number

  constructor(instance: KairosInstance) {
    this.instance = instance
    this.tcpHost = instance.config.host
    this.tcpPort = instance.config.port
    this.instance.KairosObj = {
      main_background_sourceA: '',
      main_background_sourceB: '',
      INPUTS: [],
      SCENES: [],
      AUX: [],
    }

    this.init()
  }

  /**
   * @description Close connection on instance disable/removal
   */
  public readonly destroy = (): void => {
    if (this.sockets.main) {
      this.sockets.main.destroy()
    }
  }

  /**
   * @description Create a TCP connection to Kairos
   */
  public readonly init = (): void => {
    if (this.tcpHost === undefined || this.tcpPort === undefined) {
      this.instance.log(
        'warn',
        `Unable to connect to vMix, please configure a host and port in the instance configuration`
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
      // this.instance.connected = status === 0
    })

    this.sockets.main.on('error', (err: Error) => {
      this.instance.status(this.instance.STATUS_ERROR, err.message)
    })

    function delay(time: number) {
      return new Promise((resolve) => setTimeout(resolve, time))
    }

    this.sockets.main.on('connect', () => {
      this.instance.status(0)
      this.instance.log('debug', 'Connected to mixer')
      delay(200)
        .then(() => delay(200).then(() => this.sendCommand('list:Mixer.Inputs')))
        .then(() => delay(200).then(() => this.sendCommand('list:AUX')))
        .then(() => delay(200).then(() => this.sendCommand('list:SCENES')))
        .then(() => delay(200).then(() => this.sendCommand('subscribe:SCENES.Main.Layers.Background.sourceA')))
        .then(() => delay(200).then(() => this.sendCommand('subscribe:SCENES.Main.Layers.Background.sourceB')))
        .then(() => delay(200).then(() => this.instance.updateInstance()))
    })

    this.sockets.main.on('data', (data: Buffer) => {
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
      } else if (message.find((element) => element == 'OK')) {
        //Status message
        this.instance.log('debug', 'Command succeeded')
      } else if (message.find((element) => element == 'Error')) {
        //Status message
        this.instance.log('debug', 'Command failed')
      } else if (message.find((element) => element == 'IP1')) {
        //This is an input list
        this.instance.KairosObj.INPUTS = message
      } else if (message.find((element) => element == 'IP-AUX1')) {
        //This is an AUX list
        this.instance.KairosObj.AUX = message
      } else if (message.find((element) => element == 'SCENES.Main')) {
        //This is an SCENES list
        this.instance.KairosObj.SCENES = message
      } else {
        console.log(message)
      }
      // console.log(this.KairosObj)

      // this.instance.log('debug', `Command Response: ${message}`)
    })
  }

  /**
   * @param command function and any params
   * @description Check TCP connection status and format command to send to vMix
   */
  public readonly sendCommand = (command: string): void => {
    // @ts-expect-error Types doesn't include 'connected' property
    if (this.sockets.main && this.sockets.main.connected) {
      const message = `${command}\r\n`
      console.log(message)

      this.sockets.main.write(message, (err) => {
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
