// kilocode_change - new file
/**
 * Quota enforcement for tenant limits
 */

import type { Tenant } from "../tenant/types.js"
import type { QuotaCheckResult } from "./types.js"

/**
 * Quota Enforcer
 * Enforces tenant quotas and handles graceful degradation
 */
export class QuotaEnforcer {
	/**
	 * Check if tenant has quota available for API calls
	 */
	checkApiCallQuota(tenant: Tenant): QuotaCheckResult {
		const current = tenant.quotas.currentApiCalls
		const limit = tenant.quotas.maxApiCallsPerMonth
		const remaining = Math.max(0, limit - current)

		return {
			allowed: current < limit,
			quotaType: "api_calls",
			current,
			limit,
			remaining,
			resetsAt: tenant.quotas.quotaResetDate,
			overage: current > limit ? current - limit : undefined,
		}
	}

	/**
	 * Check if tenant has quota available for token usage
	 */
	checkTokenQuota(tenant: Tenant, requestedTokens: number): QuotaCheckResult {
		const current = tenant.quotas.currentTokens
		const limit = tenant.quotas.maxTokensPerMonth
		const remaining = Math.max(0, limit - current)

		return {
			allowed: current + requestedTokens <= limit,
			quotaType: "tokens",
			current,
			limit,
			remaining,
			resetsAt: tenant.quotas.quotaResetDate,
			overage: current + requestedTokens > limit ? current + requestedTokens - limit : undefined,
		}
	}

	/**
	 * Check if tenant has storage quota available
	 */
	checkStorageQuota(tenant: Tenant, requestedMb: number): QuotaCheckResult {
		const current = tenant.quotas.currentStorageMb
		const limit = tenant.quotas.maxStorageMb
		const remaining = Math.max(0, limit - current)

		return {
			allowed: current + requestedMb <= limit,
			quotaType: "storage",
			current,
			limit,
			remaining,
			resetsAt: tenant.quotas.quotaResetDate,
			overage: current + requestedMb > limit ? current + requestedMb - limit : undefined,
		}
	}

	/**
	 * Check if tenant can add more users
	 */
	checkUserQuota(tenant: Tenant): QuotaCheckResult {
		const current = tenant.quotas.currentUsers
		const limit = tenant.quotas.maxUsers
		const remaining = Math.max(0, limit - current)

		return {
			allowed: current < limit,
			quotaType: "users",
			current,
			limit,
			remaining,
			resetsAt: tenant.quotas.quotaResetDate,
			overage: current > limit ? current - limit : undefined,
		}
	}

	/**
	 * Consume API call quota
	 */
	consumeApiCallQuota(tenant: Tenant): Tenant {
		return {
			...tenant,
			quotas: {
				...tenant.quotas,
				currentApiCalls: tenant.quotas.currentApiCalls + 1,
			},
			updatedAt: new Date(),
		}
	}

	/**
	 * Consume token quota
	 */
	consumeTokenQuota(tenant: Tenant, tokens: number): Tenant {
		return {
			...tenant,
			quotas: {
				...tenant.quotas,
				currentTokens: tenant.quotas.currentTokens + tokens,
			},
			updatedAt: new Date(),
		}
	}

	/**
	 * Consume storage quota
	 */
	consumeStorageQuota(tenant: Tenant, mb: number): Tenant {
		return {
			...tenant,
			quotas: {
				...tenant.quotas,
				currentStorageMb: tenant.quotas.currentStorageMb + mb,
			},
			updatedAt: new Date(),
		}
	}

	/**
	 * Get quota usage percentage
	 */
	getUsagePercentage(current: number, limit: number): number {
		if (limit === 0) return 0
		return Math.min(100, (current / limit) * 100)
	}

	/**
	 * Check if tenant is approaching quota limit (>80%)
	 */
	isApproachingLimit(current: number, limit: number): boolean {
		return this.getUsagePercentage(current, limit) > 80
	}

	/**
	 * Get all quota statuses for a tenant
	 */
	getAllQuotaStatuses(tenant: Tenant): {
		apiCalls: QuotaCheckResult
		tokens: QuotaCheckResult
		storage: QuotaCheckResult
		users: QuotaCheckResult
	} {
		return {
			apiCalls: this.checkApiCallQuota(tenant),
			tokens: this.checkTokenQuota(tenant, 0),
			storage: this.checkStorageQuota(tenant, 0),
			users: this.checkUserQuota(tenant),
		}
	}
}

/**
 * Quota exceeded error
 */
export class QuotaExceededError extends Error {
	constructor(
		public quotaType: string,
		public current: number,
		public limit: number,
		public resetsAt: Date,
	) {
		super(
			`Quota exceeded for ${quotaType}. Current: ${current}, Limit: ${limit}. Resets at ${resetsAt.toISOString()}`,
		)
		this.name = "QuotaExceededError"
	}
}
