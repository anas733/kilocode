// kilocode_change - new file
/**
 * Tenant types and interfaces
 */

import { z } from "zod"

/**
 * Tenant subscription tier
 */
export enum SubscriptionTier {
	FREE = "free",
	STARTER = "starter",
	PROFESSIONAL = "professional",
	ENTERPRISE = "enterprise",
}

/**
 * Tenant status
 */
export enum TenantStatus {
	ACTIVE = "active",
	SUSPENDED = "suspended",
	TRIAL = "trial",
	CHURNED = "churned",
	PENDING_DELETION = "pending_deletion",
}

/**
 * Tenant configuration
 */
export interface Tenant {
	id: string
	name: string
	status: TenantStatus
	tier: SubscriptionTier

	// Contact information
	primaryContactEmail: string
	billingEmail?: string

	// Organizational data
	organizationName?: string
	industry?: string
	size?: string

	// Subscription details
	subscriptionStartDate: Date
	subscriptionEndDate?: Date
	trialEndsAt?: Date

	// Feature flags
	features: Record<string, boolean>

	// Quotas and limits
	quotas: TenantQuotas

	// Metadata
	metadata: Record<string, unknown>
	createdAt: Date
	updatedAt: Date
	deletedAt?: Date
}

/**
 * Tenant quotas
 */
export interface TenantQuotas {
	// API limits
	maxApiCallsPerMonth: number
	currentApiCalls: number

	// Token limits
	maxTokensPerMonth: number
	currentTokens: number

	// Storage limits
	maxStorageMb: number
	currentStorageMb: number

	// User limits
	maxUsers: number
	currentUsers: number

	// Seat limits (for team plans)
	maxSeats?: number
	currentSeats?: number

	// Reset date
	quotaResetDate: Date
}

/**
 * Tenant context for request processing
 */
export interface TenantContext {
	tenantId: string
	tenant: Tenant
	correlationId: string
}

/**
 * Schema for creating a new tenant
 */
export const CreateTenantSchema = z.object({
	name: z.string().min(1).max(100),
	primaryContactEmail: z.string().email(),
	billingEmail: z.string().email().optional(),
	organizationName: z.string().min(1).max(200).optional(),
	tier: z.nativeEnum(SubscriptionTier),
	industry: z.string().optional(),
	size: z.string().optional(),
	metadata: z.record(z.unknown()).optional(),
})

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>

/**
 * Schema for updating a tenant
 */
export const UpdateTenantSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	status: z.nativeEnum(TenantStatus).optional(),
	primaryContactEmail: z.string().email().optional(),
	billingEmail: z.string().email().optional(),
	organizationName: z.string().min(1).max(200).optional(),
	industry: z.string().optional(),
	size: z.string().optional(),
	features: z.record(z.boolean()).optional(),
	metadata: z.record(z.unknown()).optional(),
})

export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>

/**
 * Tier-based quota configuration
 */
export const TierQuotas: Record<
	SubscriptionTier,
	Omit<
		TenantQuotas,
		"currentApiCalls" | "currentTokens" | "currentStorageMb" | "currentUsers" | "currentSeats" | "quotaResetDate"
	>
> = {
	[SubscriptionTier.FREE]: {
		maxApiCallsPerMonth: 1000,
		maxTokensPerMonth: 100_000,
		maxStorageMb: 100,
		maxUsers: 1,
	},
	[SubscriptionTier.STARTER]: {
		maxApiCallsPerMonth: 10_000,
		maxTokensPerMonth: 1_000_000,
		maxStorageMb: 500,
		maxUsers: 5,
		maxSeats: 5,
	},
	[SubscriptionTier.PROFESSIONAL]: {
		maxApiCallsPerMonth: 100_000,
		maxTokensPerMonth: 10_000_000,
		maxStorageMb: 2000,
		maxUsers: 20,
		maxSeats: 20,
	},
	[SubscriptionTier.ENTERPRISE]: {
		maxApiCallsPerMonth: 1_000_000,
		maxTokensPerMonth: 100_000_000,
		maxStorageMb: 10000,
		maxUsers: 1000,
		maxSeats: 1000,
	},
}
