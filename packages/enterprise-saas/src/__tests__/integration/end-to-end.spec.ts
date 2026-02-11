/**
 * End-to-end integration tests for complete API request flow
 * Tests: Authentication → Authorization → Quota Check → Audit
 */

import { describe, test, expect, beforeEach } from "vitest"
import { ApiKeyManager } from "../../security/ApiKeyManager.js"
import { RBACManager, PermissionDeniedError } from "../../security/RBACManager.js"
import { TenantManager } from "../../tenant/TenantManager.js"
import { QuotaEnforcer } from "../../billing/QuotaEnforcer.js"
import { UsageTracker } from "../../billing/UsageTracker.js"
import { AuditLogger } from "../../audit/AuditLogger.js"
import { RequestSigner } from "../../security/RequestSigner.js"
import { RateLimiter } from "../../security/RateLimiter.js"
import { SubscriptionTier } from "../../tenant/types.js"
import { PermissionScope, Role } from "../../security/types.js"
import { UsageEventType } from "../../billing/types.js"
import { AuditCategory, AuditSeverity } from "../../audit/types.js"
import type { AuthContext } from "../../security/types.js"
import type { Tenant } from "../../tenant/types.js"

describe("End-to-End API Request Flow", () => {
	let keyManager: ApiKeyManager
	let rbacManager: RBACManager
	let tenantManager: TenantManager
	let quotaEnforcer: QuotaEnforcer
	let usageTracker: UsageTracker
	let auditLogger: AuditLogger
	let requestSigner: RequestSigner
	let rateLimiter: RateLimiter

	let tenant: Tenant
	let apiKey: {
		id: string
		name: string
		prefix: string
		keyHash: string
		scopes: PermissionScope[]
		tenantId: string
		userId?: string
		isActive: boolean
		expiresAt?: Date
		createdAt: Date
		lastUsedAt?: Date
	}
	let plainKey: string
	let authContext: AuthContext

	beforeEach(() => {
		// Initialize all services
		keyManager = new ApiKeyManager()
		rbacManager = new RBACManager()
		tenantManager = new TenantManager()
		quotaEnforcer = new QuotaEnforcer()
		usageTracker = new UsageTracker()
		auditLogger = new AuditLogger()
		requestSigner = new RequestSigner()
		rateLimiter = new RateLimiter()

		// Create a test tenant
		tenant = tenantManager.createTenant({
			name: "Test Corp",
			primaryContactEmail: "test@example.com",
			tier: SubscriptionTier.PROFESSIONAL,
		})

		// Generate API key
		const keyResult = keyManager.generateApiKey({
			name: "Test API Key",
			scopes: [PermissionScope.CODE_READ, PermissionScope.CODE_WRITE],
			tenantId: tenant.id,
			userId: "test-user-123",
			expiresInDays: 30,
		})
		apiKey = keyResult.apiKey
		plainKey = keyResult.plainKey

		// Create auth context
		authContext = {
			userId: "test-user-123",
			tenantId: tenant.id,
			roles: [Role.DEVELOPER],
			permissions: rbacManager.getPermissionsForRoles([Role.DEVELOPER]),
			sessionId: "session-123",
			expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
		}
	})

	test("should successfully process a valid authenticated request", () => {
		// Step 1: Validate API key
		const isValid = keyManager.validateKey(plainKey, apiKey.keyHash)
		expect(isValid).toBe(true)
		expect(keyManager.isKeyExpired(apiKey)).toBe(false)

		// Step 2: Check rate limit
		const rateLimitResult = rateLimiter.consume(`tenant:${tenant.id}`, {
			windowMs: 60000,
			maxRequests: 100,
		})
		expect(rateLimitResult.allowed).toBe(true)

		// Step 3: Check permissions
		expect(rbacManager.hasPermission(authContext, PermissionScope.CODE_READ)).toBe(true)

		// Step 4: Check quota
		const quotaCheck = quotaEnforcer.checkApiCallQuota(tenant)
		expect(quotaCheck.allowed).toBe(true)

		// Step 5: Track usage
		const usageEvent = usageTracker.recordUsage(
			tenant.id,
			{
				eventType: UsageEventType.API_CALL,
				quantity: 1,
				metadata: { endpoint: "/api/generate" },
			},
			authContext.userId,
		)
		expect(usageEvent).toBeDefined()

		// Step 6: Consume quota
		const updatedTenant = quotaEnforcer.consumeApiCallQuota(tenant)
		expect(updatedTenant.quotas.currentApiCalls).toBe(1)

		// Step 7: Audit log the operation
		const auditEvent = auditLogger.log({
			tenantId: tenant.id,
			userId: authContext.userId,
			category: AuditCategory.DATA_ACCESS,
			action: "api.request",
			severity: AuditSeverity.INFO,
			description: "Successful API request",
			success: true,
			metadata: { endpoint: "/api/generate" },
		})
		expect(auditEvent).toBeDefined()
		expect(auditEvent.success).toBe(true)
	})

	test("should reject request with invalid API key", () => {
		const invalidKey = "kilo_invalid_key"
		const isValid = keyManager.validateKey(invalidKey, apiKey.keyHash)
		expect(isValid).toBe(false)

		// Log failed authentication
		auditLogger.log({
			tenantId: tenant.id,
			category: AuditCategory.AUTHENTICATION,
			action: "auth.login_failed",
			severity: AuditSeverity.WARNING,
			description: "Invalid API key",
			success: false,
		})

		const failedEvents = auditLogger.getFailedEvents(tenant.id, 1)
		expect(failedEvents.length).toBeGreaterThan(0)
	})

	test("should reject request without required permissions", () => {
		// Create a viewer context (read-only)
		const viewerContext: AuthContext = {
			...authContext,
			roles: [Role.VIEWER],
			permissions: rbacManager.getPermissionsForRoles([Role.VIEWER]),
		}

		// Try to write (should fail)
		expect(() => {
			rbacManager.enforcePermission(viewerContext, PermissionScope.CODE_WRITE, "file.ts")
		}).toThrow(PermissionDeniedError)

		// Log permission denial
		auditLogger.log({
			tenantId: tenant.id,
			userId: viewerContext.userId,
			category: AuditCategory.AUTHORIZATION,
			action: "authz.permission_denied",
			severity: AuditSeverity.WARNING,
			description: "Permission denied for code:write",
			success: false,
		})
	})

	test("should reject request when quota is exceeded", () => {
		// Set quota to limit
		tenant.quotas.currentApiCalls = tenant.quotas.maxApiCallsPerMonth

		const quotaCheck = quotaEnforcer.checkApiCallQuota(tenant)
		expect(quotaCheck.allowed).toBe(false)
		if (quotaCheck.overage) {
			expect(quotaCheck.overage).toBeGreaterThan(0)
		}

		// Log quota exceeded
		auditLogger.log({
			tenantId: tenant.id,
			category: AuditCategory.BILLING,
			action: "billing.quota_exceeded",
			severity: AuditSeverity.WARNING,
			description: `API call quota exceeded: ${quotaCheck.current}/${quotaCheck.limit}`,
			success: false,
		})
	})

	test("should enforce rate limiting", () => {
		const rule = { windowMs: 1000, maxRequests: 5 }
		const key = `tenant:${tenant.id}`

		// Consume all requests
		for (let i = 0; i < 5; i++) {
			const result = rateLimiter.consume(key, rule)
			expect(result.allowed).toBe(true)
		}

		// Next request should be blocked
		const blockedResult = rateLimiter.consume(key, rule)
		expect(blockedResult.allowed).toBe(false)
		expect(blockedResult.retryAfterMs).toBeGreaterThan(0)

		// Log rate limit exceeded
		auditLogger.log({
			tenantId: tenant.id,
			category: AuditCategory.SECURITY,
			action: "security.rate_limit_exceeded",
			severity: AuditSeverity.WARNING,
			description: "Rate limit exceeded",
			success: false,
		})
	})

	test("should verify request signatures", () => {
		const payload = JSON.stringify({ action: "generate_code", file: "test.ts" })

		// Sign the request
		const signature = requestSigner.signRequest(payload, { secret: apiKey.keyHash })
		expect(signature.signature).toBeDefined()
		expect(signature.timestamp).toBeDefined()
		expect(signature.nonce).toBeDefined()

		// Verify the signature
		const verification = requestSigner.verifySignature(payload, signature, { secret: apiKey.keyHash })
		expect(verification.valid).toBe(true)

		// Try with wrong payload
		const wrongPayload = JSON.stringify({ action: "delete_code" })
		const wrongVerification = requestSigner.verifySignature(wrongPayload, signature, { secret: apiKey.keyHash })
		expect(wrongVerification.valid).toBe(false)
		expect(wrongVerification.error).toBe("Invalid signature")
	})

	test("should track complete request lifecycle with correlation", () => {
		const correlationId = "req-abc-123"

		// 1. Authentication
		const authValid = keyManager.validateKey(plainKey, apiKey.keyHash)
		auditLogger.log({
			tenantId: tenant.id,
			userId: authContext.userId,
			category: AuditCategory.AUTHENTICATION,
			action: "auth.api_key_used",
			severity: AuditSeverity.INFO,
			description: "API key validated",
			success: authValid,
			correlationId,
		})

		// 2. Authorization
		const hasPermission = rbacManager.hasPermission(authContext, PermissionScope.CODE_READ)
		auditLogger.log({
			tenantId: tenant.id,
			userId: authContext.userId,
			category: AuditCategory.AUTHORIZATION,
			action: "authz.permission_granted",
			severity: AuditSeverity.INFO,
			description: "Permission granted for code:read",
			success: hasPermission,
			correlationId,
		})

		// 3. Quota check
		const quotaCheck = quotaEnforcer.checkApiCallQuota(tenant)
		auditLogger.log({
			tenantId: tenant.id,
			userId: authContext.userId,
			category: AuditCategory.BILLING,
			action: "billing.quota_checked",
			severity: AuditSeverity.INFO,
			description: `Quota check: ${quotaCheck.remaining} remaining`,
			success: quotaCheck.allowed,
			correlationId,
		})

		// 4. Data access
		auditLogger.log({
			tenantId: tenant.id,
			userId: authContext.userId,
			category: AuditCategory.DATA_ACCESS,
			action: "data.accessed",
			severity: AuditSeverity.INFO,
			description: "Code generation completed",
			success: true,
			correlationId,
		})

		// Verify all events with same correlation ID
		const events = auditLogger.query({ tenantId: tenant.id }).events
		const correlatedEvents = events.filter((e) => e.correlationId === correlationId)
		expect(correlatedEvents.length).toBe(4)
	})
})
