// kilocode_change - new file
/**
 * Audit logger for security-sensitive operations
 */

import { nanoid } from "nanoid"
import type { AuditEvent, CreateAuditEventInput, AuditQueryFilters } from "./types.js"
import { AuditCategory } from "./types.js"

/**
 * Audit Logger
 * Records security-sensitive operations for compliance and forensics
 */
export class AuditLogger {
	private events: AuditEvent[] = []

	/**
	 * Log an audit event
	 */
	log(input: CreateAuditEventInput): AuditEvent {
		const event: AuditEvent = {
			id: nanoid(16),
			timestamp: new Date(),
			tenantId: input.tenantId,
			userId: input.userId,
			userEmail: input.userEmail,
			ipAddress: input.ipAddress,
			userAgent: input.userAgent,
			category: input.category,
			action: input.action,
			severity: input.severity,
			resourceType: input.resourceType,
			resourceId: input.resourceId,
			resourceName: input.resourceName,
			description: input.description,
			metadata: input.metadata || {},
			success: input.success,
			errorMessage: input.errorMessage,
			correlationId: input.correlationId,
			sessionId: input.sessionId,
		}

		this.events.push(event)

		// In production, this would also:
		// - Write to persistent storage (database, log aggregation)
		// - Send to SIEM system
		// - Trigger alerts for critical events

		return event
	}

	/**
	 * Query audit logs
	 */
	query(
		filters: AuditQueryFilters,
		limit: number = 100,
		offset: number = 0,
	): {
		events: AuditEvent[]
		total: number
		hasMore: boolean
	} {
		let filtered = this.events

		// Apply filters
		if (filters.tenantId) {
			filtered = filtered.filter((e) => e.tenantId === filters.tenantId)
		}
		if (filters.userId) {
			filtered = filtered.filter((e) => e.userId === filters.userId)
		}
		if (filters.category) {
			filtered = filtered.filter((e) => e.category === filters.category)
		}
		if (filters.severity) {
			filtered = filtered.filter((e) => e.severity === filters.severity)
		}
		if (filters.startDate) {
			filtered = filtered.filter((e) => e.timestamp >= filters.startDate!)
		}
		if (filters.endDate) {
			filtered = filtered.filter((e) => e.timestamp <= filters.endDate!)
		}
		if (filters.resourceType) {
			filtered = filtered.filter((e) => e.resourceType === filters.resourceType)
		}
		if (filters.resourceId) {
			filtered = filtered.filter((e) => e.resourceId === filters.resourceId)
		}
		if (filters.action) {
			filtered = filtered.filter((e) => e.action === filters.action)
		}
		if (filters.success !== undefined) {
			filtered = filtered.filter((e) => e.success === filters.success)
		}

		// Sort by timestamp (newest first)
		filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

		const total = filtered.length
		const events = filtered.slice(offset, offset + limit)
		const hasMore = offset + limit < total

		return { events, total, hasMore }
	}

	/**
	 * Get recent events for a tenant
	 */
	getRecentEvents(tenantId: string, limit: number = 100): AuditEvent[] {
		return this.query({ tenantId }, limit).events
	}

	/**
	 * Get security-related events
	 */
	getSecurityEvents(tenantId: string, hours: number = 24): AuditEvent[] {
		const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)

		return this.query(
			{
				tenantId,
				category: AuditCategory.SECURITY,
				startDate,
			},
			1000,
		).events
	}

	/**
	 * Get failed events (potential security issues)
	 */
	getFailedEvents(tenantId: string, hours: number = 24): AuditEvent[] {
		const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)

		return this.query(
			{
				tenantId,
				success: false,
				startDate,
			},
			1000,
		).events
	}

	/**
	 * Export audit logs for compliance
	 */
	exportLogs(filters: AuditQueryFilters): AuditEvent[] {
		return this.query(filters, Number.MAX_SAFE_INTEGER).events
	}

	/**
	 * Clear old events (retention policy)
	 */
	applyRetentionPolicy(retentionDays: number): void {
		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

		this.events = this.events.filter((event) => event.timestamp >= cutoffDate)
	}

	/**
	 * Get event count by category
	 */
	getEventCountByCategory(tenantId: string, startDate: Date, endDate: Date): Record<string, number> {
		const events = this.query({ tenantId, startDate, endDate }, Number.MAX_SAFE_INTEGER).events

		const counts: Record<string, number> = {}
		for (const event of events) {
			counts[event.category] = (counts[event.category] || 0) + 1
		}

		return counts
	}

	/**
	 * Detect suspicious patterns (multiple failed logins, etc.)
	 */
	detectSuspiciousActivity(
		tenantId: string,
		userId: string,
		hours: number = 1,
	): {
		isSuspicious: boolean
		reason?: string
		events: AuditEvent[]
	} {
		const startDate = new Date(Date.now() - hours * 60 * 60 * 1000)
		const events = this.query({ tenantId, userId, success: false, startDate }, 1000).events

		// Check for multiple failed login attempts
		const failedLogins = events.filter((e) => e.action.includes("login_failed"))
		if (failedLogins.length >= 5) {
			return {
				isSuspicious: true,
				reason: `Multiple failed login attempts (${failedLogins.length}) in ${hours} hour(s)`,
				events: failedLogins,
			}
		}

		// Check for rapid permission denials
		const permissionDenials = events.filter((e) => e.action.includes("permission_denied"))
		if (permissionDenials.length >= 10) {
			return {
				isSuspicious: true,
				reason: `Multiple permission denials (${permissionDenials.length}) in ${hours} hour(s)`,
				events: permissionDenials,
			}
		}

		return {
			isSuspicious: false,
			events: [],
		}
	}
}
