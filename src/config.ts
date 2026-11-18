import type { SomeCompanionConfigField } from '@companion-module/base'

export type config = {
	label: string
	host: string
	tcpPort: number
	restPort: number
	username: string
	password: string
}

export const getConfigFields = (): SomeCompanionConfigField[] => {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target host',
			width: 6,
			default: '192.168.10.10',
		},
		{
			type: 'number',
			id: 'tcpPort',
			label: 'TCP Port',
			width: 6,
			default: 3005,
			min: 1,
			max: 65535,
			step: 1,
		},
		{
			type: 'number',
			id: 'restPort',
			label: 'REST API Port',
			width: 6,
			default: 1234,
			min: 1,
			max: 65535,
			step: 1,
		},
		{
			type: 'textinput',
			id: 'username',
			label: 'Username',
			width: 6,
			default: 'Kairos',
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Password',
			width: 6,
			default: '',
		},
	]
}
