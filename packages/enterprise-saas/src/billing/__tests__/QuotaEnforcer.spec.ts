// kilocode_change - new file
/**
 * Tests for QuotaEnforcer
 */

import { describe, test, expect } from "vitest"
import { QuotaEnforcer } from "../QuotaEnforcer"
import { TenantManager } from "../../tenant/TenantManager"
import { SubscriptionTier } from "../../tenant/types"

describe("QuotaEnforcer", () => {
	const enforcer = new QuotaEnforcer()
	const tenantManager = new TenantManager()

	describe("checkApiCallQuota", () => {
		test("should allow API calls within quota", () => {
			const tenant = tenantManager.createTenant({
				name: "Test Tenant",
				primaryContactEmail: "test@example.com",
				tier: SubscriptionTier.STARTER,
			})

			const result = enforcer.checkApiCallQuota(tenant)

			expect(result.allowed).toBe(true)
			expect(result.remaining).toBe(10_000)
		})

		test("should block API calls exceeding quota", () => {
			const tenant = tenantManager.createTenant({
				name: "Test Tenant",
				primaryContactEmail: "test@example.com",
				tier: SubscriptionTier.FREE,
			})

			// Simulate quota usage
			tenant.quotas.currentApiCalls = 1001

			const result = enforcer.checkApiCallQuota(tenant)

			expect(result.allowed).toBe(false)
			expect(result.overage).toBe(1)
		})
	})

	describe("consumeTokenQuota", () => {
		test("should increment token usage", () => {
			const tenant = tenantManager.createTenant({
				name: "Test Tenant",
				primaryContactEmail: "test@example.com",
				tier: SubscriptionTier.STARTER,
			})

			const updatedTenant = enforcer.consumeTokenQuota(tenant, 5000)

			expect(updatedTenant.quotas.currentTokens).toBe(5000)
		})
	})

	describe("isApproachingLimit", () => {
		test("should detect when approaching limit", () => {
			const isApproaching = enforcer.isApproachingLimit(85, 100)
			expect(isApproaching).toBe(true)

			const notApproaching = enforcer.isApproachingLimit(70, 100)
			expect(notApproaching).toBe(false)
		})
	})
})
