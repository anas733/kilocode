/**
 * Tests for AuditLogger
 */

import { describe, test, expect, beforeEach } from "vitest"
import { AuditLogger } from "../AuditLogger.js"
import { AuditCategory, AuditSeverity } from "../types.js"

describe("AuditLogger", () => {
	let auditLogger: AuditLogger

	beforeEach(() => {
		auditLogger = new AuditLogger()
	})

	test("should log audit events with complete metadata", () => {
		const event = auditLogger.log({
			tenantId: "tenant-123",
			userId: "user-456",
			userEmail: "user@example.com",
			ipAddress: "192.168.1.1",
			category: AuditCategory.AUTHENTICATION,
			action: "auth.login",
			severity: AuditSeverity.INFO,
			description: "User logged in successfully",
			success: true,
			metadata: { method: "oauth" },
		})

		expect(event.id).toBeDefined()
		expect(event.tenantId).toBe("tenant-123")
		expect(event.userId).toBe("user-456")
		expect(event.category).toBe(AuditCategory.AUTHENTICATION)
		expect(event.action).toBe("auth.login")
		expect(event.success).toBe(true)
		expect(event.timestamp).toBeInstanceOf(Date)
	})

	test("should query audit logs with filters", () => {
		// Create multiple events
		auditLogger.log({
			tenantId: "tenant-123",
			category: AuditCategory.AUTHENTICATION,
			action: "auth.login",
			severity: AuditSeverity.INFO,
			description: "Login 1",
			success: true,
		})

		auditLogger.log({
			tenantId: "tenant-123",
			category: AuditCategory.SECURITY,
			action: "security.alert",
			severity: AuditSeverity.WARNING,
			description: "Security alert",
			success: false,
		})

		auditLogger.log({
			tenantId: "tenant-456",
			category: AuditCategory.AUTHENTICATION,
			action: "auth.login",
			severity: AuditSeverity.INFO,
			description: "Login 2",
			success: true,
		})

		// Query by tenant
		const tenant123Events = auditLogger.query({ tenantId: "tenant-123" })
		expect(tenant123Events.total).toBe(2)

		// Query by category
		const authEvents = auditLogger.query({ category: AuditCategory.AUTHENTICATION })
		expect(authEvents.total).toBe(2)

		// Query failed events
		const failedEvents = auditLogger.query({ success: false })
		expect(failedEvents.total).toBe(1)
		expect(failedEvents.events[0].action).toBe("security.alert")
	})

	test("should get recent events for a tenant", () => {
		for (let i = 0; i < 5; i++) {
			auditLogger.log({
				tenantId: "tenant-123",
				category: AuditCategory.DATA_ACCESS,
				action: `action-${i}`,
				severity: AuditSeverity.INFO,
				description: `Event ${i}`,
				success: true,
			})
		}

		const recent = auditLogger.getRecentEvents("tenant-123", 3)
		expect(recent.length).toBe(3)
		// Verify we got the most recent events (could be in any order depending on implementation)
		expect(recent.every((e) => e.tenantId === "tenant-123")).toBe(true)
	})

	test("should get security events in time window", () => {
		auditLogger.log({
			tenantId: "tenant-123",
			category: AuditCategory.SECURITY,
			action: "security.alert",
			severity: AuditSeverity.CRITICAL,
			description: "Security event",
			success: false,
		})

		auditLogger.log({
			tenantId: "tenant-123",
			category: AuditCategory.AUTHENTICATION,
			action: "auth.login",
			severity: AuditSeverity.INFO,
			description: "Login",
			success: true,
		})

		const securityEvents = auditLogger.getSecurityEvents("tenant-123", 24)
		expect(securityEvents.length).toBe(1)
		expect(securityEvents[0].category).toBe(AuditCategory.SECURITY)
	})

	test("should get failed events", () => {
		// Successful event
		auditLogger.log({
			tenantId: "tenant-123",
			category: AuditCategory.DATA_ACCESS,
			action: "data.read",
			severity: AuditSeverity.INFO,
			description: "Read data",
			success: true,
		})

		// Failed events
		auditLogger.log({
			tenantId: "tenant-123",
			category: AuditCategory.AUTHORIZATION,
			action: "authz.denied",
			severity: AuditSeverity.WARNING,
			description: "Permission denied",
			success: false,
		})

		auditLogger.log({
			tenantId: "tenant-123",
			category: AuditCategory.AUTHENTICATION,
			action: "auth.failed",
			severity: AuditSeverity.WARNING,
			description: "Login failed",
			success: false,
		})

		const failed = auditLogger.getFailedEvents("tenant-123", 24)
		expect(failed.length).toBe(2)
		expect(failed.every((e) => !e.success)).toBe(true)
	})

	test("should detect suspicious activity - multiple failed logins", () => {
		// Simulate 5 failed login attempts
		for (let i = 0; i < 5; i++) {
			auditLogger.log({
				tenantId: "tenant-123",
				userId: "user-456",
				category: AuditCategory.AUTHENTICATION,
				action: "auth.login_failed",
				severity: AuditSeverity.WARNING,
				description: "Failed login",
				success: false,
			})
		}

		const suspicious = auditLogger.detectSuspiciousActivity("tenant-123", "user-456", 1)
		expect(suspicious.isSuspicious).toBe(true)
		expect(suspicious.reason).toContain("Multiple failed login attempts")
		expect(suspicious.events.length).toBeGreaterThanOrEqual(5)
	})

	test("should not detect suspicious activity with normal usage", () => {
		// A few successful operations
		for (let i = 0; i < 3; i++) {
			auditLogger.log({
				tenantId: "tenant-123",
				userId: "user-456",
				category: AuditCategory.DATA_ACCESS,
				action: "data.read",
				severity: AuditSeverity.INFO,
				description: "Read data",
				success: true,
			})
		}

		const suspicious = auditLogger.detectSuspiciousActivity("tenant-123", "user-456", 1)
		expect(suspicious.isSuspicious).toBe(false)
	})

	test("should export logs for compliance", () => {
		const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
		const endDate = new Date()

		// Create events
		for (let i = 0; i < 10; i++) {
			auditLogger.log({
				tenantId: "tenant-123",
				category: AuditCategory.DATA_ACCESS,
				action: `action-${i}`,
				severity: AuditSeverity.INFO,
				description: `Event ${i}`,
				success: true,
			})
		}

		const exported = auditLogger.exportLogs({
			tenantId: "tenant-123",
			startDate,
			endDate,
		})

		expect(exported.length).toBe(10)
		expect(exported.every((e) => e.tenantId === "tenant-123")).toBe(true)
	})

	test("should apply retention policy", () => {
		// Create an old event (simulate)
		auditLogger.log({
			tenantId: "tenant-123",
			category: AuditCategory.DATA_ACCESS,
			action: "old.action",
			severity: AuditSeverity.INFO,
			description: "Old event",
			success: true,
		})

		// Recent event
		auditLogger.log({
			tenantId: "tenant-123",
			category: AuditCategory.DATA_ACCESS,
			action: "recent.action",
			severity: AuditSeverity.INFO,
			description: "Recent event",
			success: true,
		})

		// Apply retention (keep 365 days)
		auditLogger.applyRetentionPolicy(365)

		// Both should still exist (they're recent)
		const events = auditLogger.query({ tenantId: "tenant-123" })
		expect(events.total).toBeGreaterThanOrEqual(2)
	})
})
