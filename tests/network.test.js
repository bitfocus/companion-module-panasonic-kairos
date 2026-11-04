// Jest 27's sandbox predates Node's fetch globals. Use the runtime implementations.
const vm = require('vm')
global.fetch = vm.runInThisContext('fetch')
global.Headers = vm.runInThisContext('Headers')
const http = require('http')
const net = require('net')
const { REST } = require('../dist/rest')
const { TCP } = require('../dist/tcp')
const { getActions } = require('../dist/actions')
const { getConfigFields } = require('../dist/config')

const waitFor = async (predicate) => {
	const end = Date.now() + 12000
	while (!predicate()) {
		if (Date.now() > end) throw new Error('Timed out waiting for Kairos traffic')
		await new Promise((resolve) => setTimeout(resolve, 25))
	}
}
const fixture = () => ({
	KairosObj: {
		INPUTS: [],
		SCENES: [],
		AUX: [],
		MACROS: [],
		SCENES_MACROS: [],
		SNAPSHOTS: [],
		MULTIVIEWERS: [],
		PLAYERS: [],
		AUDIO_CHANNELS: [],
		MEDIA_STILLS: [],
	},
	combinedLayerArray: [],
	log: jest.fn(),
	updateStatus: jest.fn(),
	updateInstance: jest.fn(),
	checkFeedbacks: jest.fn(),
	setVariableDefinitions: jest.fn(),
	setVariableValues: jest.fn(),
})

test('REST authenticates, polls state, sends action PATCH, and stops polling on destroy', async () => {
	const requests = []
	const server = http.createServer((req, res) => {
		let body = ''
		req.on('data', (data) => {
			body += data
		})
		req.on('end', () => {
			requests.push({ path: req.url, method: req.method, auth: req.headers.authorization, body })
			res.setHeader('Content-Type', 'application/json')
			res.end(
				req.url === '/scenes'
					? JSON.stringify([
							{
								name: 'Scene',
								uuid: 'scene',
								actions: [],
								layers: [{ name: 'Layer', uuid: 'layer', sourceA: 'Black', sources: ['Camera'] }],
							},
					  ])
					: '[]'
			)
		})
	})
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
	const instance = fixture()
	instance.config = {
		host: '127.0.0.1',
		restPort: server.address().port,
		username: 'Kairos',
		password: 'test:password',
	}
	const rest = new REST(
		instance,
		instance.config.host,
		instance.config.restPort,
		instance.config.username,
		instance.config.password
	)
	try {
		await waitFor(() => instance.combinedLayerArray.length === 1 && requests.some((r) => r.path === '/aux'))
		expect(instance.KairosObj.INPUTS.some((input) => input.name === 'Camera')).toBe(true)
		const actions = getActions(instance)
		// API 1.15 receives host-prepared options. These dropdowns do not enable variable parsing.
		actions.setSource.callback({ options: { layer: '/scene/layer', sourceAB: 'sourceA', source: 'Camera' } })
		await waitFor(() => requests.some((r) => r.method === 'PATCH'))
		expect(requests.find((r) => r.method === 'PATCH')).toEqual({
			path: '/scenes/scene/layer',
			method: 'PATCH',
			auth: `Basic ${Buffer.from('Kairos:test:password').toString('base64')}`,
			body: '{"sourceA":"Camera"}',
		})
		expect(requests.every((r) => r.auth === `Basic ${Buffer.from('Kairos:test:password').toString('base64')}`)).toBe(
			true
		)
		await waitFor(() => requests.filter((r) => r.path === '/scenes').length >= 2)
		rest.destroy()
		await new Promise((resolve) => setTimeout(resolve, 100))
		const count = requests.length
		await new Promise((resolve) => setTimeout(resolve, 5100))
		expect(requests).toHaveLength(count)
	} finally {
		rest.destroy()
		server.closeAllConnections?.()
		await new Promise((resolve) => server.close(resolve))
	}
}, 20000)

test('TCP frames commands and resubscribes after transport reconnect', async () => {
	const sockets = new Set()
	const received = []
	let connections = 0
	const server = net.createServer((socket) => {
		connections++
		sockets.add(socket)
		socket.on('close', () => sockets.delete(socket))
		socket.on('data', (data) => received.push(data.toString()))
	})
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
	// Stable code allocates another keepalive timer on reconnect. Track timers for test cleanup.
	const timers = []
	const original = global.setInterval
	const spy = jest.spyOn(global, 'setInterval').mockImplementation((...args) => {
		const timer = original(...args)
		timers.push(timer)
		return timer
	})
	const tcp = new TCP(fixture(), '127.0.0.1', server.address().port)
	try {
		await waitFor(() => received.join('').includes('subscribe:AUDIOMIXER.mute\r\n'))
		tcp.sendCommand('set:RR1.repeat=1')
		await waitFor(() => received.join('').includes('set:RR1.repeat=1\r\n'))
		for (const socket of sockets) socket.destroy()
		await waitFor(() => connections >= 2 && received.join('').split('list:MEDIA.stills\r\n').length >= 3)
	} finally {
		tcp.destroy()
		spy.mockRestore()
		for (const timer of timers) clearInterval(timer)
		for (const socket of sockets) socket.destroy()
		await new Promise((resolve) => server.close(resolve))
	}
}, 20000)

test('config and action text retain the stable variable-option contract', () => {
	const fields = getConfigFields()
	expect(fields.map((field) => field.id)).toEqual(['info', 'host', 'tcpPort', 'restPort', 'username', 'password'])
	const actions = getActions(fixture())
	const textOptions = Object.values(actions)
		.flatMap((action) => action.options)
		.filter((option) => option.type === 'textinput')
	expect(textOptions).toHaveLength(1)
	expect(textOptions[0]).toMatchObject({ id: 'functionID', default: '' })
	expect(textOptions[0].useVariables).toBeUndefined()
})
