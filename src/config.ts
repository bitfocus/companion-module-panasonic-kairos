import { SomeCompanionConfigField } from '../../../instance_skel_types'

export interface Config {
	label: string
	host: string
	port: number
	username: string
	password: string
}

export const getConfigFields = (): SomeCompanionConfigField[] => {
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Startup warning',
			value:
				'First startup of this module can take up to a minute to process all data. <br />' +
				'Please be patient for all commands to be finished, the status will turn OK/Green when ready',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target host',
			width: 6,
			default: '192.168.10.10',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 6,
			default: 3005,
			min: 1,
			max: 65535,
			step: 1,
		},
	]
}
