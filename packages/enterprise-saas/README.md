# DevX Enterprise SaaS Infrastructure

Production-grade SaaS infrastructure package for building secure, scalable, multi-tenant applications.

## Overview

This package provides enterprise-ready capabilities for SaaS platforms:

- **Security**: API key management, RBAC, request signing, rate limiting
- **Multi-tenancy**: Tenant lifecycle management, isolation, feature flags
- **Billing & Quotas**: Usage tracking, quota enforcement, subscription management
- **Audit Logging**: Security-sensitive operation tracking, compliance
- **Monitoring**: Structured logging, metrics collection, health checks

## Architecture Principles

### Security by Design (Defense in Depth)

- **API Key Management**: Secure generation with HMAC-SHA256 hashing, rotation support
- **Request Signing**: HMAC signatures with timestamp validation to prevent replay attacks
- **RBAC**: Role-based access control with granular permissions
- **Input Validation**: Comprehensive validation using Zod schemas
- **Rate Limiting**: Sliding window algorithm to prevent abuse

### Multi-Tenancy & Isolation

- **Tenant Context**: Request-scoped tenant isolation
- **Data Segregation**: Tenant-scoped data access enforced at all layers
- **Resource Quotas**: Per-tenant limits on API calls, tokens, storage, users
- **Feature Flags**: Tenant-specific feature enablement

### Scalability & High Availability

- **Stateless Design**: All services designed for horizontal scaling
- **Efficient Data Structures**: In-memory caching with TTL for performance
- **Async Operations**: Non-blocking operations throughout
- **Resource Pooling**: Prepared for connection pooling and caching layers

### Operational Excellence

- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Metrics Collection**: Counters, gauges, histograms, timers
- **Health Checks**: Liveness and readiness endpoints
- **Audit Trail**: Complete audit log for all security-sensitive operations

## Modules

### Security (`@devx/enterprise-saas/security`)

```typescript
import {
	ApiKeyManager,
	RBACManager,
	RequestSigner,
	RateLimiter,
	InputValidator,
	PermissionScope,
	Role,
} from "@devx/enterprise-saas/security"

// API Key Management
const keyManager = new ApiKeyManager()
const { apiKey, plainKey } = keyManager.generateApiKey({
	name: "Production API Key",
	scopes: [PermissionScope.CODE_READ, PermissionScope.CODE_WRITE],
	tenantId: "tenant-123",
	userId: "user-456",
	expiresInDays: 90,
})

// RBAC
const rbac = new RBACManager()
rbac.enforcePermission(authContext, PermissionScope.CODE_WRITE, "file.ts")

// Rate Limiting
const limiter = new RateLimiter()
const result = limiter.consume("user-123", {
	windowMs: 60000, // 1 minute
	maxRequests: 100,
})

// Request Signing
const signer = new RequestSigner()
const signature = signer.signRequest(payload, { secret: apiKey.keyHash })
const verification = signer.verifySignature(payload, signature, { secret: apiKey.keyHash })
```

### Tenant Management (`@devx/enterprise-saas/tenant`)

```typescript
import { TenantManager, TenantContextManager, SubscriptionTier, TenantStatus } from "@devx/enterprise-saas/tenant"

// Create tenant (onboarding)
const tenantManager = new TenantManager()
const tenant = tenantManager.createTenant({
	name: "Acme Corporation",
	primaryContactEmail: "admin@acme.com",
	tier: SubscriptionTier.PROFESSIONAL,
	organizationName: "Acme Corp",
})

// Upgrade tier
const upgradedTenant = tenantManager.upgradeTier(tenant, SubscriptionTier.ENTERPRISE)

// Tenant context isolation
const contextManager = new TenantContextManager()
await contextManager.withContext(tenant, async (context) => {
	// All operations within this scope are tenant-scoped
	console.log(`Operating in tenant: ${context.tenantId}`)
})
```

### Billing & Quotas (`@devx/enterprise-saas/billing`)

```typescript
import { UsageTracker, QuotaEnforcer, UsageEventType } from "@devx/enterprise-saas/billing"

// Track usage
const tracker = new UsageTracker()
tracker.recordUsage("tenant-123", {
	eventType: UsageEventType.API_CALL,
	quantity: 1,
	metadata: { endpoint: "/api/generate" },
})

// Enforce quotas
const enforcer = new QuotaEnforcer()
const quotaCheck = enforcer.checkApiCallQuota(tenant)

if (!quotaCheck.allowed) {
	throw new Error(`Quota exceeded. Resets at ${quotaCheck.resetsAt}`)
}

const updatedTenant = enforcer.consumeApiCallQuota(tenant)
```

### Audit Logging (`@devx/enterprise-saas/audit`)

```typescript
import { AuditLogger, AuditCategory, AuditSeverity, AuditActions } from "@devx/enterprise-saas/audit"

const auditLogger = new AuditLogger()

// Log security-sensitive operation
auditLogger.log({
	tenantId: "tenant-123",
	userId: "user-456",
	userEmail: "user@example.com",
	ipAddress: "192.168.1.1",
	category: AuditCategory.AUTHENTICATION,
	action: AuditActions.LOGIN,
	severity: AuditSeverity.INFO,
	description: "User successfully logged in",
	success: true,
	metadata: { method: "oauth" },
})

// Query audit logs
const { events } = auditLogger.query({
	tenantId: "tenant-123",
	category: AuditCategory.SECURITY,
	startDate: new Date("2024-01-01"),
})

// Detect suspicious activity
const suspicious = auditLogger.detectSuspiciousActivity("tenant-123", "user-456", 1)
```

### Monitoring (`@devx/enterprise-saas/monitoring`)

```typescript
import { StructuredLogger, MetricsCollector, HealthMonitor } from "@devx/enterprise-saas/monitoring"

// Structured logging
const logger = new StructuredLogger("api-service")
const contextualLogger = logger.child({
	tenantId: "tenant-123",
	correlationId: "req-abc-123",
})

contextualLogger.info("Processing request", { endpoint: "/api/generate" })
contextualLogger.error("Request failed", error, { statusCode: 500 })

// Metrics
const metrics = new MetricsCollector()
metrics.incrementCounter("api.requests", 1, { endpoint: "/api/generate", status: "200" })
metrics.recordGauge("active.connections", 42)

await metrics.timeAsync("db.query", async () => {
	return await db.query("SELECT * FROM users")
})

// Health checks
const healthMonitor = new HealthMonitor()
healthMonitor.registerCheck("database", async () => {
	return { status: "healthy", message: "Connected" }
})

const health = await healthMonitor.runHealthChecks()
```

## Security Features

### API Key Security

- **Secure Generation**: Cryptographically secure random keys (32 bytes)
- **One-way Hashing**: SHA-256 hashing for storage (never store plaintext)
- **Constant-time Comparison**: Timing-safe validation to prevent timing attacks
- **Key Rotation**: Support for rotating keys without service disruption
- **Scoped Access**: Fine-grained permissions per key
- **Expiration**: Optional time-based expiration

### Request Security

- **Signature Verification**: HMAC-SHA256 request signing
- **Replay Attack Prevention**: Timestamp validation with configurable window
- **Nonce Support**: Request deduplication
- **Algorithm Flexibility**: Support for multiple signature algorithms

### Access Control

- **RBAC**: Role-based access control with predefined roles
- **Permissions**: Granular permission scopes
- **Tenant Isolation**: Automatic tenant boundary enforcement
- **Least Privilege**: Default deny with explicit grants

## Multi-Tenancy Features

### Tenant Lifecycle

1. **Onboarding**: Create tenant with trial period
2. **Trial**: 14-day trial with full feature access
3. **Activation**: Convert to paid subscription
4. **Suspension**: Temporary suspension for non-payment
5. **Offboarding**: Soft delete with retention period

### Tenant Isolation

- **Request Context**: Tenant ID propagated through all operations
- **Data Isolation**: Tenant-scoped queries enforced
- **Resource Limits**: Per-tenant quotas
- **Feature Flags**: Tenant-specific feature enablement

### Subscription Tiers

- **Free**: Limited quotas for evaluation
- **Starter**: Small teams and projects
- **Professional**: Growing businesses
- **Enterprise**: Large organizations with custom quotas

## Billing & Quotas

### Usage Tracking

- Track API calls, token usage, storage, user additions
- Real-time quota checking
- Historical usage data for billing
- Export capabilities for invoicing

### Quota Enforcement

- **Hard Limits**: Requests blocked when quota exceeded
- **Soft Warnings**: Alerts at 80% usage
- **Graceful Degradation**: Return 429 status with retry-after
- **Automatic Reset**: Monthly quota resets

## Compliance & Audit

### SOC2 Readiness

- Complete audit trail of all operations
- Access logs with IP address tracking
- Security event monitoring
- Data retention policies

### GDPR Compliance

- Data export capabilities
- Tenant data deletion support
- Audit log retention
- User consent tracking

### Audit Features

- **Comprehensive Logging**: All security-sensitive operations logged
- **Immutable Logs**: Append-only audit trail
- **Query Interface**: Search and filter audit events
- **Suspicious Activity Detection**: Automated pattern recognition
- **Compliance Reports**: Export logs for compliance audits

## Best Practices

### Security

1. **Never Log Secrets**: API keys, passwords, tokens should never be logged
2. **Validate All Inputs**: Use InputValidator for all external data
3. **Enforce RBAC**: Always check permissions before operations
4. **Rate Limit**: Apply rate limits to all public endpoints
5. **Audit Security Events**: Log all authentication, authorization events

### Multi-Tenancy

1. **Always Set Context**: Use TenantContextManager for all tenant operations
2. **Validate Tenant Access**: Check tenant ownership before accessing resources
3. **Enforce Quotas**: Check quotas before resource-intensive operations
4. **Isolate Data**: Never query across tenant boundaries

### Monitoring

1. **Use Correlation IDs**: Track requests across services
2. **Structured Logging**: Always use structured logs, not console.log
3. **Monitor Quotas**: Alert when tenants approach limits
4. **Track Metrics**: Measure request latency, error rates, quota usage

## Testing

Run tests:

```bash
cd packages/enterprise-saas
pnpm test
```

Run with coverage:

```bash
pnpm test --coverage
```

## Integration Example

```typescript
import {
	ApiKeyManager,
	RBACManager,
	TenantManager,
	QuotaEnforcer,
	AuditLogger,
	StructuredLogger,
	PermissionScope,
} from "@devx/enterprise-saas"

// Initialize services
const keyManager = new ApiKeyManager()
const rbac = new RBACManager()
const tenantManager = new TenantManager()
const quotaEnforcer = new QuotaEnforcer()
const auditLogger = new AuditLogger()
const logger = new StructuredLogger("api-service")

// Example API endpoint handler
async function handleApiRequest(request: Request) {
	// 1. Authenticate
	const apiKey = request.headers.get("x-api-key")
	if (!apiKey) {
		return new Response("Unauthorized", { status: 401 })
	}

	const keyId = keyManager.extractKeyId(apiKey)
	const storedKey = await db.getApiKey(keyId) // Your DB lookup
	const isValid = keyManager.validateKey(apiKey, storedKey.keyHash)

	if (!isValid) {
		auditLogger.log({
			tenantId: storedKey.tenantId,
			category: "authentication",
			action: "auth.failed",
			severity: "warning",
			description: "Invalid API key",
			success: false,
		})
		return new Response("Unauthorized", { status: 401 })
	}

	// 2. Load tenant
	const tenant = await db.getTenant(storedKey.tenantId)

	// 3. Check quota
	const quotaCheck = quotaEnforcer.checkApiCallQuota(tenant)
	if (!quotaCheck.allowed) {
		return new Response("Quota exceeded", { status: 429 })
	}

	// 4. Check permissions
	const authContext = {
		userId: storedKey.createdBy,
		tenantId: tenant.id,
		roles: ["developer"],
		permissions: storedKey.scopes,
	}

	try {
		rbac.enforcePermission(authContext, PermissionScope.CODE_WRITE)
	} catch (error) {
		return new Response("Forbidden", { status: 403 })
	}

	// 5. Process request
	const updatedTenant = quotaEnforcer.consumeApiCallQuota(tenant)
	await db.updateTenant(updatedTenant)

	// 6. Audit log
	auditLogger.log({
		tenantId: tenant.id,
		userId: authContext.userId,
		category: "data_access",
		action: "api.request",
		severity: "info",
		description: "API request processed",
		success: true,
	})

	return new Response("Success", { status: 200 })
}
```

## License

This package is part of DevX and is licensed under Apache 2.0.
