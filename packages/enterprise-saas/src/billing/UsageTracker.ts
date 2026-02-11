// kilocode_change - new file
/**
 * Usage tracking for billing and analytics
 */

import { nanoid } from "nanoid"
import type { UsageEvent, RecordUsageInput } from "./types.js"
import { UsageEventType } from "./types.js"

/**
 * Usage Tracker
 * Tracks usage events for billing and quota enforcement
 */
export class UsageTracker {
	private events: Map<string, UsageEvent[]> = new Map()

	/**
	 * Record a usage event
	 */
	recordUsage(tenantId: string, input: RecordUsageInput, userId?: string): UsageEvent {
		const event: UsageEvent = {
			id: nanoid(16),
			tenantId,
			userId,
			eventType: input.eventType,
			quantity: input.quantity,
			metadata: input.metadata || {},
			timestamp: new Date(),
		}

		// Store event
		const tenantEvents = this.events.get(tenantId) || []
		tenantEvents.push(event)
		this.events.set(tenantId, tenantEvents)

		return event
	}

	/**
	 * Get usage summary for a tenant in a time period
	 */
	getUsageSummary(
		tenantId: string,
		startDate: Date,
		endDate: Date,
	): Record<
		UsageEventType,
		{
			count: number
			total: number
		}
	> {
		const events = this.events.get(tenantId) || []

		const summary: Record<
			UsageEventType,
			{
				count: number
				total: number
			}
		> = {
			[UsageEventType.API_CALL]: { count: 0, total: 0 },
			[UsageEventType.TOKEN_USAGE]: { count: 0, total: 0 },
			[UsageEventType.STORAGE_WRITE]: { count: 0, total: 0 },
			[UsageEventType.USER_ADDED]: { count: 0, total: 0 },
			[UsageEventType.FEATURE_USE]: { count: 0, total: 0 },
		}

		for (const event of events) {
			if (event.timestamp >= startDate && event.timestamp <= endDate) {
				const eventSummary = summary[event.eventType]
				if (eventSummary) {
					eventSummary.count++
					eventSummary.total += event.quantity
				}
			}
		}

		return summary
	}

	/**
	 * Get total usage for a specific event type
	 */
	getTotalUsage(tenantId: string, eventType: UsageEventType, startDate: Date, endDate: Date): number {
		const events = this.events.get(tenantId) || []

		return events
			.filter(
				(event) => event.eventType === eventType && event.timestamp >= startDate && event.timestamp <= endDate,
			)
			.reduce((total, event) => total + event.quantity, 0)
	}

	/**
	 * Get recent events for a tenant
	 */
	getRecentEvents(tenantId: string, limit: number = 100): UsageEvent[] {
		const events = this.events.get(tenantId) || []
		return events.slice(-limit).reverse()
	}

	/**
	 * Clear old events (for cleanup)
	 */
	clearOldEvents(olderThanDays: number): void {
		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

		for (const [tenantId, events] of this.events.entries()) {
			const filteredEvents = events.filter((event) => event.timestamp >= cutoffDate)
			if (filteredEvents.length === 0) {
				this.events.delete(tenantId)
			} else {
				this.events.set(tenantId, filteredEvents)
			}
		}
	}

	/**
	 * Export usage data for a tenant (for billing or compliance)
	 */
	exportUsageData(tenantId: string, startDate: Date, endDate: Date): UsageEvent[] {
		const events = this.events.get(tenantId) || []
		return events.filter((event) => event.timestamp >= startDate && event.timestamp <= endDate)
	}
}
