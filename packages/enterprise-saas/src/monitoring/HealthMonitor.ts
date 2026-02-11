// kilocode_change - new file
/**
 * Health check monitoring
 */

import type { HealthCheckResult, HealthStatus } from "./types.js"

export type HealthCheck = () => Promise<{ status: HealthStatus; message?: string; latencyMs?: number }>

/**
 * Health Monitor
 * Monitors system health and provides health check endpoints
 */
export class HealthMonitor {
	private checks: Map<string, HealthCheck> = new Map()

	/**
	 * Register a health check
	 */
	registerCheck(name: string, check: HealthCheck): void {
		this.checks.set(name, check)
	}

	/**
	 * Run all health checks
	 */
	async runHealthChecks(): Promise<HealthCheckResult> {
		const results: HealthCheckResult["checks"] = {}
		let overallStatus: HealthStatus = "healthy" as HealthStatus

		for (const [name, check] of this.checks.entries()) {
			try {
				const result = await check()
				results[name] = result

				// Determine overall status
				if (result.status === ("unhealthy" as HealthStatus)) {
					overallStatus = "unhealthy" as HealthStatus
				} else if (
					result.status === ("degraded" as HealthStatus) &&
					overallStatus !== ("unhealthy" as HealthStatus)
				) {
					overallStatus = "degraded" as HealthStatus
				}
			} catch (error) {
				results[name] = {
					status: "unhealthy" as HealthStatus,
					message: error instanceof Error ? error.message : "Unknown error",
				}
				overallStatus = "unhealthy" as HealthStatus
			}
		}

		return {
			status: overallStatus,
			checks: results,
			timestamp: new Date(),
		}
	}

	/**
	 * Get a simple liveness check (is the service running?)
	 */
	async liveness(): Promise<{ alive: boolean }> {
		return { alive: true }
	}

	/**
	 * Get a readiness check (is the service ready to accept traffic?)
	 */
	async readiness(): Promise<HealthCheckResult> {
		return this.runHealthChecks()
	}
}

/**
 * Create common health checks
 */
export const CommonHealthChecks = {
	/**
	 * Check memory usage
	 */
	memory: (): Promise<{ status: HealthStatus; message?: string }> => {
		const usage = process.memoryUsage()
		const heapUsedMb = Math.round(usage.heapUsed / 1024 / 1024)
		const heapTotalMb = Math.round(usage.heapTotal / 1024 / 1024)
		const percentUsed = (heapUsedMb / heapTotalMb) * 100

		if (percentUsed > 90) {
			return Promise.resolve({
				status: "unhealthy" as HealthStatus,
				message: `High memory usage: ${heapUsedMb}MB / ${heapTotalMb}MB (${percentUsed.toFixed(1)}%)`,
			})
		} else if (percentUsed > 75) {
			return Promise.resolve({
				status: "degraded" as HealthStatus,
				message: `Elevated memory usage: ${heapUsedMb}MB / ${heapTotalMb}MB (${percentUsed.toFixed(1)}%)`,
			})
		}

		return Promise.resolve({
			status: "healthy" as HealthStatus,
			message: `Memory usage: ${heapUsedMb}MB / ${heapTotalMb}MB (${percentUsed.toFixed(1)}%)`,
		})
	},

	/**
	 * Check uptime
	 */
	uptime: (): Promise<{ status: HealthStatus; message?: string }> => {
		return Promise.resolve({
			status: "healthy" as HealthStatus,
			message: `Uptime: ${Math.floor(process.uptime())} seconds`,
		})
	},
}
