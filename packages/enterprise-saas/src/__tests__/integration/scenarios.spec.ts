/**
 * Scenario-based functional tests
 * Tests complete tenant lifecycle and multi-tenant isolation
 */

import { describe, test, expect, beforeEach } from "vitest"
import { TenantManager } from "../../tenant/TenantManager.js"
import { ApiKeyManager } from "../../security/ApiKeyManager.js"
import { QuotaEnforcer } from "../../billing/QuotaEnforcer.js"
import { UsageTracker } from "../../billing/UsageTracker.js"
import { AuditLogger } from "../../audit/AuditLogger.js"
import { TenantContextManager } from "../../tenant/TenantContextManager.js"
import { SubscriptionTier, TenantStatus } from "../../tenant/types.js"
import { UsageEventType } from "../../billing/types.js"
import { AuditCategory, AuditSeverity } from "../../audit/types.js"
import { PermissionScope } from "../../security/types.js"

describe("Complete Tenant Lifecycle", () => {
	let tenantManager: TenantManager
	let keyManager: ApiKeyManager
	let auditLogger: AuditLogger

	beforeEach(() => {
		tenantManager = new TenantManager()
		keyManager = new ApiKeyManager()
		auditLogger = new AuditLogger()
	})

	test("should handle complete tenant onboarding flow", () => {
		// Step 1: Create tenant (onboarding)
		const tenant = tenantManager.createTenant({
			name: "Startup Inc",
			primaryContactEmail: "admin@startup.com",
			tier: SubscriptionTier.FREE,
			organizationName: "Startup Incorporated",
		})

		expect(tenant.status).toBe(TenantStatus.TRIAL)
		expect(tenant.trialEndsAt).toBeDefined()
		expect(tenant.quotas.maxApiCallsPerMonth).toBe(1000) // FREE tier

		// Step 2: Generate API key for tenant
		const { apiKey, plainKey } = keyManager.generateApiKey({
			name: "Initial API Key",
			scopes: [PermissionScope.CODE_READ],
			tenantId: tenant.id,
			userId: "admin-user",
		})

		expect(plainKey).toMatch(/^kilo_/)
		expect(apiKey.tenantId).toBe(tenant.id)

		// Step 3: Log onboarding
		auditLogger.log({
			tenantId: tenant.id,
			userId: "admin-user",
			category: AuditCategory.TENANT_MANAGEMENT,
			action: "tenant.created",
			severity: AuditSeverity.INFO,
			description: "New tenant onboarded",
			success: true,
		})

		const auditEvents = auditLogger.getRecentEvents(tenant.id, 10)
		expect(auditEvents.length).toBeGreaterThan(0)
	})

	test("should handle tenant upgrade from FREE to PROFESSIONAL", () => {
		// Create FREE tenant
		let tenant = tenantManager.createTenant({
			name: "Growing Corp",
			primaryContactEmail: "admin@growing.com",
			tier: SubscriptionTier.FREE,
		})

		expect(tenant.quotas.maxApiCallsPerMonth).toBe(1000)

		// Upgrade to PROFESSIONAL
		tenant = tenantManager.upgradeTier(tenant, SubscriptionTier.PROFESSIONAL)

		expect(tenant.tier).toBe(SubscriptionTier.PROFESSIONAL)
		expect(tenant.status).toBe(TenantStatus.ACTIVE)
		expect(tenant.quotas.maxApiCallsPerMonth).toBe(100_000)
		expect(tenant.trialEndsAt).toBeUndefined()
		expect(tenant.features.codeReview).toBe(true)
		expect(tenant.features.customModels).toBe(true)
	})

	test("should handle tenant suspension and reactivation", () => {
		let tenant = tenantManager.createTenant({
			name: "Test Corp",
			primaryContactEmail: "admin@test.com",
			tier: SubscriptionTier.STARTER,
		})

		// Suspend tenant
		tenant = tenantManager.suspendTenant(tenant, "Payment failed")

		expect(tenant.status).toBe(TenantStatus.SUSPENDED)
		expect(tenant.metadata.suspensionReason).toBe("Payment failed")
		expect(tenant.metadata.suspendedAt).toBeDefined()

		// Reactivate
		tenant = tenantManager.reactivateTenant(tenant)

		expect(tenant.status).toBe(TenantStatus.ACTIVE)
		expect(tenant.metadata.reactivatedAt).toBeDefined()
	})

	test("should handle tenant deletion (soft delete)", () => {
		let tenant = tenantManager.createTenant({
			name: "Closing Corp",
			primaryContactEmail: "admin@closing.com",
			tier: SubscriptionTier.STARTER,
		})

		// Mark for deletion
		tenant = tenantManager.markForDeletion(tenant)

		expect(tenant.status).toBe(TenantStatus.PENDING_DELETION)
		expect(tenant.deletedAt).toBeDefined()
		expect(tenant.metadata.markedForDeletionAt).toBeDefined()
	})
})

describe("Multi-Tenant Isolation", () => {
	let tenantManager: TenantManager
	let contextManager: TenantContextManager
	let _usageTracker: UsageTracker
	let auditLogger: AuditLogger

	beforeEach(() => {
		tenantManager = new TenantManager()
		contextManager = new TenantContextManager()
		_usageTracker = new UsageTracker()
		auditLogger = new AuditLogger()
	})

	test("should isolate usage tracking between tenants", () => {
		const usageTracker = new UsageTracker()

		const tenant1 = tenantManager.createTenant({
			name: "Tenant 1",
			primaryContactEmail: "admin@tenant1.com",
			tier: SubscriptionTier.STARTER,
		})

		const tenant2 = tenantManager.createTenant({
			name: "Tenant 2",
			primaryContactEmail: "admin@tenant2.com",
			tier: SubscriptionTier.STARTER,
		})

		// Record usage for tenant 1
		for (let i = 0; i < 5; i++) {
			usageTracker.recordUsage(tenant1.id, {
				eventType: UsageEventType.API_CALL,
				quantity: 1,
			})
		}

		// Record usage for tenant 2
		for (let i = 0; i < 3; i++) {
			usageTracker.recordUsage(tenant2.id, {
				eventType: UsageEventType.API_CALL,
				quantity: 1,
			})
		}

		// Verify isolation
		const usage1 = usageTracker.getTotalUsage(tenant1.id, UsageEventType.API_CALL, new Date(0), new Date())
		const usage2 = usageTracker.getTotalUsage(tenant2.id, UsageEventType.API_CALL, new Date(0), new Date())

		expect(usage1).toBe(5)
		expect(usage2).toBe(3)
	})

	test("should isolate audit logs between tenants", () => {
		const tenant1 = tenantManager.createTenant({
			name: "Tenant 1",
			primaryContactEmail: "admin@tenant1.com",
			tier: SubscriptionTier.STARTER,
		})

		const tenant2 = tenantManager.createTenant({
			name: "Tenant 2",
			primaryContactEmail: "admin@tenant2.com",
			tier: SubscriptionTier.STARTER,
		})

		// Create events for tenant 1
		for (let i = 0; i < 10; i++) {
			auditLogger.log({
				tenantId: tenant1.id,
				category: AuditCategory.DATA_ACCESS,
				action: "data.read",
				severity: AuditSeverity.INFO,
				description: "Data access",
				success: true,
			})
		}

		// Create events for tenant 2
		for (let i = 0; i < 5; i++) {
			auditLogger.log({
				tenantId: tenant2.id,
				category: AuditCategory.DATA_ACCESS,
				action: "data.read",
				severity: AuditSeverity.INFO,
				description: "Data access",
				success: true,
			})
		}

		// Verify isolation
		const events1 = auditLogger.query({ tenantId: tenant1.id })
		const events2 = auditLogger.query({ tenantId: tenant2.id })

		expect(events1.total).toBe(10)
		expect(events2.total).toBe(5)
		expect(events1.events.every((e) => e.tenantId === tenant1.id)).toBe(true)
		expect(events2.events.every((e) => e.tenantId === tenant2.id)).toBe(true)
	})

	test("should enforce tenant context boundaries", async () => {
		const tenant = tenantManager.createTenant({
			name: "Test Tenant",
			primaryContactEmail: "admin@test.com",
			tier: SubscriptionTier.PROFESSIONAL,
		})

		// Execute within tenant context
		const result = await contextManager.withContext(tenant, async (context) => {
			expect(context.tenantId).toBe(tenant.id)
			expect(context.tenant.id).toBe(tenant.id)
			expect(context.correlationId).toBeDefined()

			// Simulate tenant-scoped operation
			return "operation-result"
		})

		expect(result).toBe("operation-result")

		// Context should be cleared after execution
		const currentContext = contextManager.getCurrentContext()
		expect(currentContext).toBeNull()
	})

	test("should prevent cross-tenant data access", () => {
		const tenant1 = tenantManager.createTenant({
			name: "Tenant 1",
			primaryContactEmail: "admin@tenant1.com",
			tier: SubscriptionTier.STARTER,
		})

		const tenant2 = tenantManager.createTenant({
			name: "Tenant 2",
			primaryContactEmail: "admin@tenant2.com",
			tier: SubscriptionTier.STARTER,
		})

		// Set context for tenant 1
		contextManager.createContext(tenant1)

		// Try to validate access to tenant 2's data (should throw)
		expect(() => {
			contextManager.validateTenant(tenant2.id)
		}).toThrow("Expected tenant")
	})
})

describe("Quota Management Under Load", () => {
	let tenantManager: TenantManager
	let quotaEnforcer: QuotaEnforcer
	let _usageTracker: UsageTracker

	beforeEach(() => {
		tenantManager = new TenantManager()
		quotaEnforcer = new QuotaEnforcer()
		_usageTracker = new UsageTracker()
	})

	test("should handle quota exhaustion gracefully", () => {
		let tenant = tenantManager.createTenant({
			name: "Heavy User Corp",
			primaryContactEmail: "admin@heavyuser.com",
			tier: SubscriptionTier.FREE, // 1000 API calls
		})

		// Simulate approaching quota
		tenant.quotas.currentApiCalls = 900

		// Check if approaching limit
		const isApproaching = quotaEnforcer.isApproachingLimit(
			tenant.quotas.currentApiCalls,
			tenant.quotas.maxApiCallsPerMonth,
		)
		expect(isApproaching).toBe(true) // 90% used

		// Consume more
		for (let i = 0; i < 100; i++) {
			const quotaCheck = quotaEnforcer.checkApiCallQuota(tenant)
			if (quotaCheck.allowed) {
				tenant = quotaEnforcer.consumeApiCallQuota(tenant)
			}
		}

		// Should now be at limit
		const finalCheck = quotaEnforcer.checkApiCallQuota(tenant)
		expect(finalCheck.allowed).toBe(false)
		expect(finalCheck.current).toBeGreaterThanOrEqual(finalCheck.limit)
	})

	test("should reset quotas and allow new requests", () => {
		let tenant = tenantManager.createTenant({
			name: "Reset Corp",
			primaryContactEmail: "admin@reset.com",
			tier: SubscriptionTier.STARTER,
		})

		// Use up quota
		tenant.quotas.currentApiCalls = tenant.quotas.maxApiCallsPerMonth

		expect(quotaEnforcer.checkApiCallQuota(tenant).allowed).toBe(false)

		// Reset quota (monthly reset)
		tenant = tenantManager.resetQuotas(tenant)

		expect(tenant.quotas.currentApiCalls).toBe(0)
		expect(quotaEnforcer.checkApiCallQuota(tenant).allowed).toBe(true)
	})

	test("should track all quota types independently", () => {
		const tenant = tenantManager.createTenant({
			name: "Multi-Resource Corp",
			primaryContactEmail: "admin@multi.com",
			tier: SubscriptionTier.PROFESSIONAL,
		})

		// Check all quota types
		const allQuotas = quotaEnforcer.getAllQuotaStatuses(tenant)

		expect(allQuotas.apiCalls.allowed).toBe(true)
		expect(allQuotas.tokens.allowed).toBe(true)
		expect(allQuotas.storage.allowed).toBe(true)
		expect(allQuotas.users.allowed).toBe(true)

		expect(allQuotas.apiCalls.limit).toBe(100_000)
		expect(allQuotas.tokens.limit).toBe(10_000_000)
		expect(allQuotas.storage.limit).toBe(2000)
		expect(allQuotas.users.limit).toBe(20)
	})
})
