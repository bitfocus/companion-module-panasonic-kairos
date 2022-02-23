import KairosInstance from '.'
import * as hm from 'typed-rest-client/Handlers'
import * as httpm from 'typed-rest-client/HttpClient'

// interface MessageBuffer {
//   dataLength: number
//   message: Buffer
// }

// OK, Warning, Error, Unknown

export class REST {
  private readonly instance: KairosInstance
  // private messageBuffer: MessageBuffer = {
  //   dataLength: 0,
  //   message: Buffer.from(''),
  // }

  private restHost: string
  private restPort: number
  private username: string
  private password: string
  private httpClient!: httpm.HttpClient
  private baseUrl: string

  constructor(instance: KairosInstance) {
    this.instance = instance
    this.restHost = instance.config.host
    this.restPort = instance.config.port
    this.username = instance.config.username
    this.password = instance.config.password
    this.baseUrl = `http://${this.restHost}:${this.restPort}/`

    if (this.restHost === undefined || this.restPort === undefined) {
      this.instance.log(
        'warn',
        `Unable to connect to the mixer, please configure a host and port in the instance configuration`
      )
      return
    }

    this.init()
  }

  /**
   * @description Close connection on instance disable/removal
   */
  public readonly destroy = (): void => {}

  /**
   * @description Create a TCP connection to vMix and start API polling
   */
  public readonly init = (): void => {
    const basicHandler: hm.BasicCredentialHandler = new hm.BasicCredentialHandler(this.username, this.password)
    this.httpClient = new httpm.HttpClient('vsts-node-api', [basicHandler])
    this.instance.status(0)
  }

  /**
   * @param command function and any params
   * @description Check TCP connection status and format command to send to vMix
   */
  public readonly getCommand = async (command: string): Promise<void> => {
    console.log('Sending:', this.baseUrl + command)
    try {
      const response: httpm.HttpClientResponse = await this.httpClient.get(this.baseUrl + command)
      let body: string = await response.readBody()
      console.log('Body: ' + body + ', Message: ' + response.message)
      this.instance.log('debug', `Sending command: ${command}`)
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * @param command function and any params
   * @description Check TCP connection status and format command to send to vMix
   */
  public readonly patchCommand = async (command: string): Promise<void> => {
    console.log('Sending:', this.baseUrl + command)
    let jsonPointer: string = ''

    try {
      const response: httpm.HttpClientResponse = await this.httpClient.patch(this.baseUrl + command, jsonPointer)
      let body: string = await response.readBody()
      console.log('Body: ' + body + ', Message: ' + response.message)
      this.instance.log('debug', `Sending command: ${command}`)
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * @description Check for config changes and update if so
   */
  public readonly update = (): void => {
    const hostCheck =
      this.instance.config.host !== this.restHost ||
      this.instance.config.port !== this.restPort ||
      this.instance.config.username !== this.username ||
      this.instance.config.password !== this.password

    if (hostCheck) {
      this.restHost = this.instance.config.host
      this.restPort = this.instance.config.port
      this.username = this.instance.config.username
      this.password = this.instance.config.password
      this.baseUrl = `http://${this.restHost}:${this.restPort}/`
      this.init()
    }
  }
}
