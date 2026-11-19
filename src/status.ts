import { InstanceStatus } from '@companion-module/base'

export type ConnectionSource = 'tcp' | 'rest'

export interface SourceStatus {
	status: InstanceStatus
	message: string | null
}

const SOURCE_LABELS: Record<ConnectionSource, string> = {
	tcp: 'TCP',
	rest: 'REST',
}

/**
 * Combines the TCP and REST connection states into one status: Ok only when both are up,
 * otherwise the first failure, with a message naming each side that is down
 */
export function combineStatus(sources: Record<ConnectionSource, SourceStatus>): SourceStatus {
	const down = (Object.keys(sources) as ConnectionSource[]).filter((s) => sources[s].status !== InstanceStatus.Ok)
	if (down.length === 0) return { status: InstanceStatus.Ok, message: null }

	const worst = down.find((s) => sources[s].status !== InstanceStatus.Connecting) ?? down[0]
	const message = down.map((s) => `${SOURCE_LABELS[s]}: ${sources[s].message ?? sources[s].status}`).join(', ')
	return { status: sources[worst].status, message }
}

/**
 * Tracks the TCP and REST connections separately and reports a single status when it changes
 */
export class ConnectionStatus {
	private readonly report: (status: InstanceStatus, message: string | null) => void
	private readonly logInfo: (message: string) => void
	private sources: Record<ConnectionSource, SourceStatus> = ConnectionStatus.initialSources()
	private last: SourceStatus | null = null
	private hasFailed = false

	constructor(report: (status: InstanceStatus, message: string | null) => void, logInfo: (message: string) => void) {
		this.report = report
		this.logInfo = logInfo
	}

	private static initialSources(): Record<ConnectionSource, SourceStatus> {
		return {
			tcp: { status: InstanceStatus.Connecting, message: null },
			rest: { status: InstanceStatus.Connecting, message: null },
		}
	}

	public reset(): void {
		this.sources = ConnectionStatus.initialSources()
		this.hasFailed = false
		this.publish()
	}

	public set(source: ConnectionSource, status: InstanceStatus, message: string | null): void {
		const current = this.sources[source].status
		// A reconnect attempt shouldn't replace the failure that caused it, or the status flickers on every retry
		if (
			status === InstanceStatus.Connecting &&
			current !== InstanceStatus.Ok &&
			current !== InstanceStatus.Connecting
		) {
			return
		}
		this.sources[source] = { status, message }
		this.publish()
	}

	private publish(): void {
		const combined = combineStatus(this.sources)
		if (this.last?.status === combined.status && this.last.message === combined.message) return
		this.last = combined
		this.report(combined.status, combined.message)

		if (combined.status === InstanceStatus.Ok) {
			this.logInfo(this.hasFailed ? 'Connection to Kairos restored' : 'Connected to Kairos')
			this.hasFailed = false
		} else if (combined.status !== InstanceStatus.Connecting) {
			this.hasFailed = true
		}
	}
}
