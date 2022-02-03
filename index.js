const instance_skel = require('../../instance_skel')
const Client = require('node-rest-client').Client
let debug = () => {}
let log

class instance extends instance_skel {
	/**
	 * Create an instance of the module
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @param {string} id - the instance ID
	 * @param {Object} config - saved user configuration parameters
	 * @since 1.0.0
	 */
	constructor(system, id, config) {
		super(system, id, config)
		this.CHOICES_INPUTS = [
			{
				index: 0,
				name: 'IN1',
				tally: 1,
				uuid: 'e53210f7-2235-5ae3-9c02-4f58d67bf8b8',
			},
			{
				index: 0,
				name: 'IN2',
				tally: 0,
				uuid: 'bc2932d5-bc00-52a3-be8b-753532420c14',
			},
			{
				index: 0,
				name: 'IN3',
				tally: 0,
				uuid: '39ca682a-1adc-573e-a702-a53314dc81dd',
			},
			{
				index: 0,
				name: 'IN4',
				tally: 0,
				uuid: 'efab3a92-1fc5-55ef-bd0c-91b12b17b8e1',
			},
			{
				index: 0,
				name: 'IN5',
				tally: 0,
				uuid: '3b4e76eb-e6a8-5290-828b-e1659cec1dd4',
			},
			{
				index: 0,
				name: 'IN6',
				tally: 0,
				uuid: 'dbd5ae62-5944-5de6-a44f-9afe764e28ff',
			},
			{
				index: 0,
				name: 'IN7',
				tally: 0,
				uuid: 'eb1564a8-c2f2-5c96-8e5e-34a98637c8b5',
			},
			{
				index: 0,
				name: 'IN8',
				tally: 0,
				uuid: '6b977973-ea4a-578b-8324-4248f29f33ea',
			},
			{
				index: 0,
				name: 'IN9',
				tally: 0,
				uuid: 'e41935e9-8dea-5270-b58c-70d35dc5c949',
			},
		]
		this.renameInputList()
		this.actions() // export actions
	}

	updateConfig(config) {
		this.config = config

		this.actions()
	}

	init() {
		this.status(this.STATE_OK)

		debug = this.debug
		log = this.log
	}

	renameInputList() {
		// function to rename on button click
		this.CHOICES_INPUTS = this.CHOICES_INPUTS.map((obj) => {
			obj['label'] = obj['name'] // Assign new key
			obj['id'] = obj['uuid'] // Assign new key
			delete obj['name'] // Delete old key
			delete obj['uuid'] // Delete old key
			return obj
		})
	}

	// Return config fields for web config
	config_fields() {
		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This module supports the Panasonic Kairos switcher',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'IP address of the switcher',
				width: 12,
				default: '192.168.10.10',
				regex: this.REGEX_IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Port for connection',
				width: 12,
				default: '1234',
				regex: this.REGEX_PORT,
			},
		]
	}

	// When module gets deleted
	destroy() {
		debug('destroy')
	}

	actions(system) {
		this.setActions({
			custom: {
				label: 'Custom command to switcher',
				options: [
					{
						type: 'textwithvariables',
						label: 'command',
						id: 'custom',
						default: '',
					},
				],
			},
			inputs: {
				label: 'Get all input names',
			},
			switchMainBgnd: {
				label: 'Switch input',
				options: [
					{
						type: 'dropdown',
						label: 'Source',
						id: 'source',
						choices: [{id: 'sourceA', label: 'sourceA'},{id: 'sourceB', label: 'sourceB'}],
					},
					{
						type: 'dropdown',
						label: 'input',
						id: 'input',
						choices: this.CHOICES_INPUTS,
					},
				],
			},
		})
	}

	action(action) {
		let cmd = ''
		let endPoint, rest_type, jsonPointer
		let opt = action.options
		let port = this.config.port || '1234'
		let username = this.config.username || 'Kairos'
		let password = this.config.password || 'System ID'
		let baseUrl = `http://${this.config.host}:${port}/`

		switch (action.action) {
			case 'custom':
				endPoint = opt.custom
				rest_type = 'GET'
				break
			case 'inputs':
				endPoint = 'inputs'
				rest_type = 'GET'
				break
			case 'switchMainBgnd':
				endPoint = 'scenes/Main/Background'
				jsonPointer = JSON.parse(`{"${opt.source}":"${opt.input}"}`)
				rest_type = 'PATCH'
				break
		}

		if (endPoint != undefined && rest_type != undefined) {
			cmd = baseUrl + endPoint
			console.logJSON.stringify(jsonPointer)
			console.log(cmd)
			let options_auth = { user: username, password: password }
			let client = new Client(options_auth)

			switch (rest_type) {
				case 'GET':
					client
						.get(cmd, (data, response) => {
							this.status(this.STATUS_OK)
							// console.log(response)
						})
						.on('error', (error) => {
							debug('error response:', error)
							this.log('error', `HTTP ${action.action.toUpperCase()} Request failed (${error})`)
							this.status(this.STATUS_ERROR, error)
						})
					break

				case 'PATCH':
					let args = {
						data: jsonPointer,
						headers: { 'Content-Type': 'application/json' },
					}
					client
						.patch(cmd, args, (data, response) => {
							this.status(this.STATUS_OK)
							// console.log(response)
						})
						.on('error', (error) => {
							debug('error response:', error)
							this.log('error', `HTTP ${action.action.toUpperCase()} Request failed (${error})`)
							this.status(this.STATUS_ERROR, error)
						})
					break
			}
		}
	}
}
exports = module.exports = instance
