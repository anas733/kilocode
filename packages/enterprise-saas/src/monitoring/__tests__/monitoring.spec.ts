/**
 * Tests for StructuredLogger, MetricsCollector, and HealthMonitor
 */

import { describe, test, expect, beforeEach, vi } from "vitest"
import { StructuredLogger } from "../StructuredLogger.js"
import { MetricsCollector } from "../MetricsCollector.js"
import { HealthMonitor } from "../HealthMonitor.js"

describe("StructuredLogger", () => {
	let logger: StructuredLogger
	let consoleSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		logger = new StructuredLogger("test-service")
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
	})

	test("should create log entry with correct structure", () => {
		logger.info("Test message", { key: "value" })

		expect(consoleSpy).toHaveBeenCalled()
		const logEntry = JSON.parse(consoleSpy.mock.calls[0][0])

		expect(logEntry.level).toBe("info")
		expect(logEntry.message).toBe("Test message")
		expect(logEntry.service).toBe("test-service")
		expect(logEntry.metadata.key).toBe("value")
		expect(logEntry.timestamp).toBeDefined()
	})

	test("should include context in logs", () => {
		logger.info("Test", {}, { tenantId: "tenant-123", correlationId: "req-abc" })

		const logEntry = JSON.parse(consoleSpy.mock.calls[0][0])
		expect(logEntry.tenantId).toBe("tenant-123")
		expect(logEntry.correlationId).toBe("req-abc")
	})

	test("should create contextual logger with pre-set context", () => {
		const contextLogger = logger.child({
			tenantId: "tenant-123",
			userId: "user-456",
			correlationId: "req-abc",
		})

		contextLogger.info("Test message")

		const logEntry = JSON.parse(consoleSpy.mock.calls[0][0])
		expect(logEntry.tenantId).toBe("tenant-123")
		expect(logEntry.userId).toBe("user-456")
		expect(logEntry.correlationId).toBe("req-abc")
	})

	test("should log errors with stack traces", () => {
		const error = new Error("Test error")
		logger.error("Operation failed", error, { operation: "test" })

		const logEntry = JSON.parse(consoleSpy.mock.calls[0][0])
		expect(logEntry.level).toBe("error")
		expect(logEntry.metadata.error).toBeDefined()
		expect(logEntry.metadata.error.message).toBe("Test error")
		expect(logEntry.metadata.error.stack).toBeDefined()
	})
})

describe("MetricsCollector", () => {
	let metrics: MetricsCollector

	beforeEach(() => {
		metrics = new MetricsCollector()
	})

	test("should record counter metrics", () => {
		metrics.incrementCounter("api.requests", 1, { endpoint: "/api/generate" })
		metrics.incrementCounter("api.requests", 1, { endpoint: "/api/generate" })

		const summary = metrics.getSummary("api.requests")
		expect(summary.count).toBe(2)
		expect(summary.sum).toBe(2)
	})

	test("should record gauge metrics", () => {
		metrics.recordGauge("active.connections", 42)
		metrics.recordGauge("active.connections", 38)

		const summary = metrics.getSummary("active.connections")
		expect(summary.count).toBe(2)
		expect(summary.min).toBe(38)
		expect(summary.max).toBe(42)
	})

	test("should time async functions", async () => {
		const mockAsyncFn = async () => {
			await new Promise((resolve) => setTimeout(resolve, 10))
			return "result"
		}

		const result = await metrics.timeAsync("async.operation", mockAsyncFn)

		expect(result).toBe("result")
		const summary = metrics.getSummary("async.operation")
		expect(summary.count).toBe(1)
		// Timing can vary slightly in CI environments, so check for at least 5ms
		expect(summary.sum).toBeGreaterThanOrEqual(5)
	})
})

describe("HealthMonitor", () => {
	let monitor: HealthMonitor

	beforeEach(() => {
		monitor = new HealthMonitor()
	})

	test("should register and run health checks", async () => {
		monitor.registerCheck("database", async () => ({
			status: "healthy",
			message: "Connected",
			latencyMs: 5,
		}))

		monitor.registerCheck("cache", async () => ({
			status: "healthy",
			message: "Redis OK",
		}))

		const result = await monitor.runHealthChecks()

		expect(result.status).toBe("healthy")
		expect(result.checks.database.status).toBe("healthy")
		expect(result.checks.cache.status).toBe("healthy")
		expect(result.timestamp).toBeDefined()
	})

	test("should report unhealthy status when one check fails", async () => {
		monitor.registerCheck("critical", async () => ({
			status: "unhealthy",
			message: "Database unreachable",
		}))

		monitor.registerCheck("other", async () => ({
			status: "healthy",
		}))

		const result = await monitor.runHealthChecks()
		expect(result.status).toBe("unhealthy")
	})

	test("should return liveness check", async () => {
		const liveness = await monitor.liveness()
		expect(liveness.alive).toBe(true)
	})
})
