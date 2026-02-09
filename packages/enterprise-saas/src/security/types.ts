// kilocode_change - new file
/**
 * Security types and interfaces for enterprise SaaS
 */

import { z } from "zod"

/**
 * Authentication context for requests
 */
export interface AuthContext {
	userId: string
	tenantId: string
	roles: string[]
	permissions: string[]
	sessionId: string
	expiresAt: Date
}

/**
 * API key with metadata
 */
export interface ApiKey {
	id: string
	tenantId: string
	name: string
	keyHash: string
	prefix: string
	scopes: string[]
	rateLimit?: number
	expiresAt?: Date
	lastUsedAt?: Date
	createdAt: Date
	createdBy: string
	isActive: boolean
}

/**
 * API request signature
 */
export interface RequestSignature {
	timestamp: number
	nonce: string
	signature: string
	algorithm: "HMAC-SHA256" | "RSA-SHA256"
}

/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
	AUTH_SUCCESS = "auth.success",
	AUTH_FAILURE = "auth.failure",
	API_KEY_CREATED = "api_key.created",
	API_KEY_REVOKED = "api_key.revoked",
	PERMISSION_DENIED = "permission.denied",
	RATE_LIMIT_EXCEEDED = "rate_limit.exceeded",
	SUSPICIOUS_ACTIVITY = "suspicious.activity",
	DATA_EXPORT = "data.export",
	TENANT_SUSPENDED = "tenant.suspended",
	TENANT_DELETED = "tenant.deleted",
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	requestsPerMinute: number
	requestsPerHour: number
	requestsPerDay: number
	burstSize: number
	enforceAtClientSide: boolean
}

/**
 * Schema for API key creation
 */
export const CreateApiKeySchema = z.object({
	name: z.string().min(1).max(100),
	scopes: z.array(z.string()).min(1),
	expiresInDays: z.number().int().positive().optional(),
	rateLimit: z.number().int().positive().optional(),
})

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>

/**
 * Schema for authentication request
 */
export const AuthRequestSchema = z.object({
	apiKey: z.string().min(1),
	signature: z.object({
		timestamp: z.number(),
		nonce: z.string(),
		signature: z.string(),
		algorithm: z.enum(["HMAC-SHA256", "RSA-SHA256"]),
	}),
})

export type AuthRequest = z.infer<typeof AuthRequestSchema>

/**
 * Permission scopes
 */
export enum PermissionScope {
	// Code generation
	CODE_READ = "code:read",
	CODE_WRITE = "code:write",
	CODE_EXECUTE = "code:execute",

	// API access
	API_READ = "api:read",
	API_WRITE = "api:write",

	// Admin
	TENANT_MANAGE = "tenant:manage",
	USER_MANAGE = "user:manage",
	BILLING_MANAGE = "billing:manage",
	AUDIT_READ = "audit:read",

	// Data
	DATA_EXPORT = "data:export",
	DATA_DELETE = "data:delete",
}

/**
 * Role definitions
 */
export enum Role {
	SUPER_ADMIN = "super_admin",
	TENANT_ADMIN = "tenant_admin",
	DEVELOPER = "developer",
	VIEWER = "viewer",
}

/**
 * Role to permissions mapping
 */
export const RolePermissions: Record<Role, PermissionScope[]> = {
	[Role.SUPER_ADMIN]: Object.values(PermissionScope),
	[Role.TENANT_ADMIN]: [
		PermissionScope.CODE_READ,
		PermissionScope.CODE_WRITE,
		PermissionScope.CODE_EXECUTE,
		PermissionScope.API_READ,
		PermissionScope.API_WRITE,
		PermissionScope.USER_MANAGE,
		PermissionScope.BILLING_MANAGE,
		PermissionScope.AUDIT_READ,
		PermissionScope.DATA_EXPORT,
	],
	[Role.DEVELOPER]: [
		PermissionScope.CODE_READ,
		PermissionScope.CODE_WRITE,
		PermissionScope.CODE_EXECUTE,
		PermissionScope.API_READ,
		PermissionScope.API_WRITE,
	],
	[Role.VIEWER]: [PermissionScope.CODE_READ, PermissionScope.API_READ],
}
