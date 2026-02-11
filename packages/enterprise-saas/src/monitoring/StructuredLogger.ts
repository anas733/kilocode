// kilocode_change - new file
/**
 * Structured logging with correlation IDs
 */

import type { LogEntry, LogLevel } from "./types.js"

/**
 * Structured Logger
 * Provides structured logging with correlation IDs for distributed tracing
 */
export class StructuredLogger {
	private serviceName: string
	private minLevel: LogLevel

	constructor(serviceName: string, minLevel: LogLevel = "info" as LogLevel) {
		this.serviceName = serviceName
		this.minLevel = minLevel
	}

	/**
	 * Log a message
	 */
	log(
		level: LogLevel,
		message: string,
		metadata?: Record<string, unknown>,
		context?: {
			tenantId?: string
			userId?: string
			correlationId?: string
			sessionId?: string
		},
	): LogEntry {
		// Check log level
		if (!this.shouldLog(level)) {
			return this.createLogEntry(level, message, metadata, context)
		}

		const entry = this.createLogEntry(level, message, metadata, context)

		// In production, this would:
		// - Write to console with structured format (JSON)
		// - Send to log aggregation service (DataDog, CloudWatch, etc.)
		// - Store in persistent log storage

		console.log(JSON.stringify(entry))

		return entry
	}

	/**
	 * Debug log
	 */
	debug(
		message: string,
		metadata?: Record<string, unknown>,
		context?: {
			tenantId?: string
			userId?: string
			correlationId?: string
		},
	): void {
		this.log("debug" as LogLevel, message, metadata, context)
	}

	/**
	 * Info log
	 */
	info(
		message: string,
		metadata?: Record<string, unknown>,
		context?: {
			tenantId?: string
			userId?: string
			correlationId?: string
		},
	): void {
		this.log("info" as LogLevel, message, metadata, context)
	}

	/**
	 * Warning log
	 */
	warn(
		message: string,
		metadata?: Record<string, unknown>,
		context?: {
			tenantId?: string
			userId?: string
			correlationId?: string
		},
	): void {
		this.log("warn" as LogLevel, message, metadata, context)
	}

	/**
	 * Error log
	 */
	error(
		message: string,
		error?: Error,
		metadata?: Record<string, unknown>,
		context?: {
			tenantId?: string
			userId?: string
			correlationId?: string
		},
	): void {
		const enrichedMetadata = {
			...metadata,
			...(error && {
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack,
				},
			}),
		}

		this.log("error" as LogLevel, message, enrichedMetadata, context)
	}

	/**
	 * Fatal log (for critical errors)
	 */
	fatal(
		message: string,
		error?: Error,
		metadata?: Record<string, unknown>,
		context?: {
			tenantId?: string
			userId?: string
			correlationId?: string
		},
	): void {
		const enrichedMetadata = {
			...metadata,
			...(error && {
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack,
				},
			}),
		}

		this.log("fatal" as LogLevel, message, enrichedMetadata, context)
	}

	/**
	 * Create a child logger with additional context
	 */
	child(context: {
		tenantId?: string
		userId?: string
		correlationId?: string
		sessionId?: string
	}): ContextualLogger {
		return new ContextualLogger(this, context)
	}

	/**
	 * Check if a log level should be logged
	 */
	private shouldLog(level: LogLevel): boolean {
		const levels: LogLevel[] = [
			"debug" as LogLevel,
			"info" as LogLevel,
			"warn" as LogLevel,
			"error" as LogLevel,
			"fatal" as LogLevel,
		]
		const minIndex = levels.indexOf(this.minLevel)
		const currentIndex = levels.indexOf(level)
		return currentIndex >= minIndex
	}

	/**
	 * Create a log entry
	 */
	private createLogEntry(
		level: LogLevel,
		message: string,
		metadata?: Record<string, unknown>,
		context?: {
			tenantId?: string
			userId?: string
			correlationId?: string
			sessionId?: string
		},
	): LogEntry {
		return {
			timestamp: new Date(),
			level,
			message,
			tenantId: context?.tenantId,
			userId: context?.userId,
			correlationId: context?.correlationId,
			sessionId: context?.sessionId,
			service: this.serviceName,
			metadata: metadata || {},
		}
	}
}

/**
 * Contextual logger with pre-set context
 */
export class ContextualLogger {
	constructor(
		private logger: StructuredLogger,
		private context: {
			tenantId?: string
			userId?: string
			correlationId?: string
			sessionId?: string
		},
	) {}

	debug(message: string, metadata?: Record<string, unknown>): void {
		this.logger.debug(message, metadata, this.context)
	}

	info(message: string, metadata?: Record<string, unknown>): void {
		this.logger.info(message, metadata, this.context)
	}

	warn(message: string, metadata?: Record<string, unknown>): void {
		this.logger.warn(message, metadata, this.context)
	}

	error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
		this.logger.error(message, error, metadata, this.context)
	}

	fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void {
		this.logger.fatal(message, error, metadata, this.context)
	}
}
