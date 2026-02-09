// kilocode_change - new file
/**
 * Billing and quota types
 */

import { z } from "zod"

/**
 * Usage event types for tracking
 */
export enum UsageEventType {
	API_CALL = "api_call",
	TOKEN_USAGE = "token_usage",
	STORAGE_WRITE = "storage_write",
	USER_ADDED = "user_added",
	FEATURE_USE = "feature_use",
}

/**
 * Usage event for billing
 */
export interface UsageEvent {
	id: string
	tenantId: string
	userId?: string
	eventType: UsageEventType
	quantity: number
	metadata: Record<string, unknown>
	timestamp: Date
}

/**
 * Quota enforcement result
 */
export interface QuotaCheckResult {
	allowed: boolean
	quotaType: string
	current: number
	limit: number
	remaining: number
	resetsAt: Date
	overage?: number
}

/**
 * Billing plan
 */
export interface BillingPlan {
	id: string
	name: string
	tier: string
	pricePerMonth: number
	pricePerYear: number
	currency: string
	features: string[]
	quotas: {
		apiCalls: number
		tokens: number
		storage: number
		users: number
	}
}

/**
 * Subscription
 */
export interface Subscription {
	id: string
	tenantId: string
	planId: string
	status: SubscriptionStatus
	currentPeriodStart: Date
	currentPeriodEnd: Date
	cancelAtPeriodEnd: boolean
	billingCycle: "monthly" | "yearly"
	paymentMethod?: string
	createdAt: Date
	updatedAt: Date
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
	ACTIVE = "active",
	PAST_DUE = "past_due",
	CANCELED = "canceled",
	TRIALING = "trialing",
	INCOMPLETE = "incomplete",
}

/**
 * Invoice
 */
export interface Invoice {
	id: string
	tenantId: string
	subscriptionId: string
	amount: number
	currency: string
	status: InvoiceStatus
	dueDate: Date
	paidAt?: Date
	createdAt: Date
}

/**
 * Invoice status
 */
export enum InvoiceStatus {
	DRAFT = "draft",
	OPEN = "open",
	PAID = "paid",
	VOID = "void",
	UNCOLLECTIBLE = "uncollectible",
}

/**
 * Schema for recording usage
 */
export const RecordUsageSchema = z.object({
	eventType: z.nativeEnum(UsageEventType),
	quantity: z.number().positive(),
	metadata: z.record(z.unknown()).optional(),
})

export type RecordUsageInput = z.infer<typeof RecordUsageSchema>
