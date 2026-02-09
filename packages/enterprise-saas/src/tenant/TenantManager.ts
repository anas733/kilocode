// kilocode_change - new file
/**
 * Tenant lifecycle management
 */

import { nanoid } from "nanoid"
import type { Tenant, CreateTenantInput, UpdateTenantInput, TenantQuotas } from "./types.js"
import { TenantStatus, SubscriptionTier, TierQuotas } from "./types.js"

/**
 * Tenant Manager
 * Manages tenant lifecycle: onboarding, suspension, offboarding
 */
export class TenantManager {
	/**
	 * Create a new tenant (onboarding)
	 */
	createTenant(input: CreateTenantInput): Tenant {
		const now = new Date()
		const tenantId = nanoid(16)

		// Calculate quota reset date (end of current month)
		const quotaResetDate = this.getNextMonthStart(now)

		// Initialize quotas based on tier
		const tierQuotas = TierQuotas[input.tier]
		const quotas: TenantQuotas = {
			...tierQuotas,
			currentApiCalls: 0,
			currentTokens: 0,
			currentStorageMb: 0,
			currentUsers: 0,
			currentSeats: 0,
			quotaResetDate,
		}

		// Set trial period for new tenants (14 days)
		const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

		const tenant: Tenant = {
			id: tenantId,
			name: input.name,
			status: TenantStatus.TRIAL,
			tier: input.tier,
			primaryContactEmail: input.primaryContactEmail,
			billingEmail: input.billingEmail,
			organizationName: input.organizationName,
			industry: input.industry,
			size: input.size,
			subscriptionStartDate: now,
			trialEndsAt,
			features: this.getDefaultFeatures(input.tier),
			quotas,
			metadata: input.metadata || {},
			createdAt: now,
			updatedAt: now,
		}

		return tenant
	}

	/**
	 * Update tenant information
	 */
	updateTenant(existing: Tenant, updates: UpdateTenantInput): Tenant {
		const now = new Date()

		return {
			...existing,
			...updates,
			updatedAt: now,
		}
	}

	/**
	 * Suspend a tenant
	 */
	suspendTenant(tenant: Tenant, reason: string): Tenant {
		const now = new Date()

		return {
			...tenant,
			status: TenantStatus.SUSPENDED,
			metadata: {
				...tenant.metadata,
				suspensionReason: reason,
				suspendedAt: now.toISOString(),
			},
			updatedAt: now,
		}
	}

	/**
	 * Reactivate a suspended tenant
	 */
	reactivateTenant(tenant: Tenant): Tenant {
		const now = new Date()

		return {
			...tenant,
			status: TenantStatus.ACTIVE,
			metadata: {
				...tenant.metadata,
				reactivatedAt: now.toISOString(),
			},
			updatedAt: now,
		}
	}

	/**
	 * Mark tenant for deletion (soft delete)
	 */
	markForDeletion(tenant: Tenant): Tenant {
		const now = new Date()

		return {
			...tenant,
			status: TenantStatus.PENDING_DELETION,
			deletedAt: now,
			metadata: {
				...tenant.metadata,
				markedForDeletionAt: now.toISOString(),
			},
			updatedAt: now,
		}
	}

	/**
	 * Upgrade tenant tier
	 */
	upgradeTier(tenant: Tenant, newTier: SubscriptionTier): Tenant {
		const now = new Date()

		// Update quotas based on new tier
		const tierQuotas = TierQuotas[newTier]
		const quotas: TenantQuotas = {
			...tierQuotas,
			currentApiCalls: tenant.quotas.currentApiCalls,
			currentTokens: tenant.quotas.currentTokens,
			currentStorageMb: tenant.quotas.currentStorageMb,
			currentUsers: tenant.quotas.currentUsers,
			currentSeats: tenant.quotas.currentSeats || 0,
			quotaResetDate: tenant.quotas.quotaResetDate,
		}

		return {
			...tenant,
			tier: newTier,
			quotas,
			features: this.getDefaultFeatures(newTier),
			status: TenantStatus.ACTIVE,
			trialEndsAt: undefined, // Clear trial status
			metadata: {
				...tenant.metadata,
				previousTier: tenant.tier,
				upgradedAt: now.toISOString(),
			},
			updatedAt: now,
		}
	}

	/**
	 * Check if tenant trial has expired
	 */
	isTrialExpired(tenant: Tenant): boolean {
		if (!tenant.trialEndsAt) {
			return false
		}
		return new Date() > tenant.trialEndsAt
	}

	/**
	 * Reset monthly quotas
	 */
	resetQuotas(tenant: Tenant): Tenant {
		const now = new Date()
		const nextResetDate = this.getNextMonthStart(now)

		return {
			...tenant,
			quotas: {
				...tenant.quotas,
				currentApiCalls: 0,
				currentTokens: 0,
				quotaResetDate: nextResetDate,
			},
			updatedAt: now,
		}
	}

	/**
	 * Get default features for a tier
	 */
	private getDefaultFeatures(tier: SubscriptionTier): Record<string, boolean> {
		const features: Record<string, boolean> = {
			codeGeneration: true,
			codeReview: false,
			customModels: false,
			prioritySupport: false,
			ssoIntegration: false,
			auditLogs: false,
			apiAccess: false,
		}

		switch (tier) {
			case SubscriptionTier.ENTERPRISE:
				features.ssoIntegration = true
				features.auditLogs = true
			// fallthrough
			case SubscriptionTier.PROFESSIONAL:
				features.customModels = true
				features.prioritySupport = true
				features.apiAccess = true
			// fallthrough
			case SubscriptionTier.STARTER:
				features.codeReview = true
			// fallthrough
			case SubscriptionTier.FREE:
			// Free features already set
		}

		return features
	}

	/**
	 * Get the first day of next month
	 */
	private getNextMonthStart(date: Date): Date {
		const nextMonth = new Date(date)
		nextMonth.setMonth(nextMonth.getMonth() + 1)
		nextMonth.setDate(1)
		nextMonth.setHours(0, 0, 0, 0)
		return nextMonth
	}
}
