// kilocode_change - new file
/**
 * Audit logging types
 */

import { z } from "zod"

/**
 * Audit event severity
 */
export enum AuditSeverity {
	INFO = "info",
	WARNING = "warning",
	ERROR = "error",
	CRITICAL = "critical",
}

/**
 * Audit event categories
 */
export enum AuditCategory {
	AUTHENTICATION = "authentication",
	AUTHORIZATION = "authorization",
	DATA_ACCESS = "data_access",
	DATA_MODIFICATION = "data_modification",
	CONFIGURATION_CHANGE = "configuration_change",
	USER_MANAGEMENT = "user_management",
	TENANT_MANAGEMENT = "tenant_management",
	BILLING = "billing",
	SECURITY = "security",
	SYSTEM = "system",
}

/**
 * Audit event
 */
export interface AuditEvent {
	id: string
	timestamp: Date

	// Actor information
	tenantId: string
	userId?: string
	userEmail?: string
	ipAddress?: string
	userAgent?: string

	// Event details
	category: AuditCategory
	action: string
	severity: AuditSeverity

	// Resource information
	resourceType?: string
	resourceId?: string
	resourceName?: string

	// Additional context
	description: string
	metadata: Record<string, unknown>

	// Status
	success: boolean
	errorMessage?: string

	// Correlation
	correlationId?: string
	sessionId?: string
}

/**
 * Audit query filters
 */
export interface AuditQueryFilters {
	tenantId?: string
	userId?: string
	category?: AuditCategory
	severity?: AuditSeverity
	startDate?: Date
	endDate?: Date
	resourceType?: string
	resourceId?: string
	action?: string
	success?: boolean
}

/**
 * Schema for creating audit event
 */
export const CreateAuditEventSchema = z.object({
	tenantId: z.string(),
	userId: z.string().optional(),
	userEmail: z.string().email().optional(),
	ipAddress: z.string().optional(),
	userAgent: z.string().optional(),
	category: z.nativeEnum(AuditCategory),
	action: z.string().min(1),
	severity: z.nativeEnum(AuditSeverity).default(AuditSeverity.INFO),
	resourceType: z.string().optional(),
	resourceId: z.string().optional(),
	resourceName: z.string().optional(),
	description: z.string().min(1),
	metadata: z.record(z.unknown()).optional(),
	success: z.boolean().default(true),
	errorMessage: z.string().optional(),
	correlationId: z.string().optional(),
	sessionId: z.string().optional(),
})

export type CreateAuditEventInput = z.infer<typeof CreateAuditEventSchema>

/**
 * Common audit actions
 */
export const AuditActions = {
	// Authentication
	LOGIN: "auth.login",
	LOGOUT: "auth.logout",
	LOGIN_FAILED: "auth.login_failed",
	PASSWORD_CHANGED: "auth.password_changed",
	MFA_ENABLED: "auth.mfa_enabled",
	MFA_DISABLED: "auth.mfa_disabled",

	// Authorization
	PERMISSION_GRANTED: "authz.permission_granted",
	PERMISSION_DENIED: "authz.permission_denied",
	ROLE_ASSIGNED: "authz.role_assigned",
	ROLE_REVOKED: "authz.role_revoked",

	// API Keys
	API_KEY_CREATED: "api_key.created",
	API_KEY_ROTATED: "api_key.rotated",
	API_KEY_REVOKED: "api_key.revoked",
	API_KEY_USED: "api_key.used",

	// Data
	DATA_EXPORTED: "data.exported",
	DATA_DELETED: "data.deleted",
	DATA_ACCESSED: "data.accessed",

	// Tenant
	TENANT_CREATED: "tenant.created",
	TENANT_UPDATED: "tenant.updated",
	TENANT_SUSPENDED: "tenant.suspended",
	TENANT_DELETED: "tenant.deleted",

	// Users
	USER_CREATED: "user.created",
	USER_UPDATED: "user.updated",
	USER_DELETED: "user.deleted",
	USER_INVITED: "user.invited",

	// Billing
	SUBSCRIPTION_CREATED: "billing.subscription_created",
	SUBSCRIPTION_UPDATED: "billing.subscription_updated",
	SUBSCRIPTION_CANCELED: "billing.subscription_canceled",
	PAYMENT_PROCESSED: "billing.payment_processed",
	QUOTA_EXCEEDED: "billing.quota_exceeded",

	// Security
	RATE_LIMIT_EXCEEDED: "security.rate_limit_exceeded",
	SUSPICIOUS_ACTIVITY: "security.suspicious_activity",
	IP_BLOCKED: "security.ip_blocked",

	// Configuration
	SETTING_CHANGED: "config.setting_changed",
	FEATURE_FLAG_TOGGLED: "config.feature_flag_toggled",
} as const
