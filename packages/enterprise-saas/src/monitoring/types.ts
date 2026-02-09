// kilocode_change - new file
/**
 * Monitoring and observability types
 */

/**
 * Log level
 */
export enum LogLevel {
	DEBUG = "debug",
	INFO = "info",
	WARN = "warn",
	ERROR = "error",
	FATAL = "fatal",
}

/**
 * Structured log entry
 */
export interface LogEntry {
	timestamp: Date
	level: LogLevel
	message: string
	tenantId?: string
	userId?: string
	correlationId?: string
	sessionId?: string
	service: string
	metadata: Record<string, unknown>
	error?: {
		name: string
		message: string
		stack?: string
	}
}

/**
 * Metric types
 */
export enum MetricType {
	COUNTER = "counter",
	GAUGE = "gauge",
	HISTOGRAM = "histogram",
	TIMER = "timer",
}

/**
 * Metric
 */
export interface Metric {
	name: string
	type: MetricType
	value: number
	tags: Record<string, string>
	timestamp: Date
}

/**
 * Health check status
 */
export enum HealthStatus {
	HEALTHY = "healthy",
	DEGRADED = "degraded",
	UNHEALTHY = "unhealthy",
}

/**
 * Health check result
 */
export interface HealthCheckResult {
	status: HealthStatus
	checks: {
		[key: string]: {
			status: HealthStatus
			message?: string
			latencyMs?: number
		}
	}
	timestamp: Date
}

/**
 * Trace span
 */
export interface TraceSpan {
	traceId: string
	spanId: string
	parentSpanId?: string
	name: string
	startTime: Date
	endTime?: Date
	duration?: number
	tags: Record<string, string>
	logs: Array<{
		timestamp: Date
		message: string
		fields?: Record<string, unknown>
	}>
	error?: boolean
}
