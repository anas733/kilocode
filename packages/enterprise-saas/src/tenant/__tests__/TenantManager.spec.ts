// kilocode_change - new file
/**
 * Tests for TenantManager
 */

import { describe, test, expect } from "vitest"
import { TenantManager } from "../TenantManager"
import { SubscriptionTier, TenantStatus } from "../types"

describe("TenantManager", () => {
	const manager = new TenantManager()

	describe("createTenant", () => {
		test("should create a new tenant with trial status", () => {
			const input = {
				name: "Acme Corp",
				primaryContactEmail: "admin@acme.com",
				tier: SubscriptionTier.STARTER,
			}

			const tenant = manager.createTenant(input)

			expect(tenant.id).toBeDefined()
			expect(tenant.name).toBe(input.name)
			expect(tenant.status).toBe(TenantStatus.TRIAL)
			expect(tenant.tier).toBe(SubscriptionTier.STARTER)
			expect(tenant.trialEndsAt).toBeDefined()
			expect(tenant.quotas).toBeDefined()
			expect(tenant.quotas.currentApiCalls).toBe(0)
		})

		test("should set quotas based on tier", () => {
			const input = {
				name: "Enterprise Corp",
				primaryContactEmail: "admin@enterprise.com",
				tier: SubscriptionTier.ENTERPRISE,
			}

			const tenant = manager.createTenant(input)

			expect(tenant.quotas.maxApiCallsPerMonth).toBe(1_000_000)
			expect(tenant.quotas.maxTokensPerMonth).toBe(100_000_000)
		})
	})

	describe("upgradeTier", () => {
		test("should upgrade tenant to higher tier", () => {
			const input = {
				name: "Growing Corp",
				primaryContactEmail: "admin@growing.com",
				tier: SubscriptionTier.FREE,
			}

			let tenant = manager.createTenant(input)
			tenant = manager.upgradeTier(tenant, SubscriptionTier.PROFESSIONAL)

			expect(tenant.tier).toBe(SubscriptionTier.PROFESSIONAL)
			expect(tenant.status).toBe(TenantStatus.ACTIVE)
			expect(tenant.trialEndsAt).toBeUndefined()
			expect(tenant.quotas.maxApiCallsPerMonth).toBe(100_000)
		})
	})

	describe("suspendTenant", () => {
		test("should suspend tenant with reason", () => {
			const input = {
				name: "Suspended Corp",
				primaryContactEmail: "admin@suspended.com",
				tier: SubscriptionTier.STARTER,
			}

			let tenant = manager.createTenant(input)
			tenant = manager.suspendTenant(tenant, "Payment failed")

			expect(tenant.status).toBe(TenantStatus.SUSPENDED)
			expect(tenant.metadata.suspensionReason).toBe("Payment failed")
		})
	})
})
