// kilocode_change - new file
/**
 * Tenant context propagation for request isolation
 */

import type { Tenant, TenantContext } from "./types.js"
import { nanoid } from "nanoid"

/**
 * Tenant Context Manager
 * Ensures tenant isolation across all operations
 */
export class TenantContextManager {
	private currentContext: TenantContext | null = null

	/**
	 * Create a new tenant context for request processing
	 */
	createContext(tenant: Tenant): TenantContext {
		const context: TenantContext = {
			tenantId: tenant.id,
			tenant,
			correlationId: nanoid(16),
		}

		this.currentContext = context
		return context
	}

	/**
	 * Get current tenant context
	 */
	getCurrentContext(): TenantContext | null {
		return this.currentContext
	}

	/**
	 * Clear current context
	 */
	clearContext(): void {
		this.currentContext = null
	}

	/**
	 * Execute a function within a tenant context
	 */
	async withContext<T>(tenant: Tenant, fn: (context: TenantContext) => Promise<T>): Promise<T> {
		const context = this.createContext(tenant)
		try {
			return await fn(context)
		} finally {
			this.clearContext()
		}
	}

	/**
	 * Ensure a tenant context exists (throws if not)
	 */
	requireContext(): TenantContext {
		if (!this.currentContext) {
			throw new Error("No tenant context available")
		}
		return this.currentContext
	}

	/**
	 * Validate that the current context matches the expected tenant
	 */
	validateTenant(expectedTenantId: string): void {
		const context = this.requireContext()
		if (context.tenantId !== expectedTenantId) {
			throw new TenantMismatchError(
				`Expected tenant ${expectedTenantId}, but current context is ${context.tenantId}`,
			)
		}
	}
}

/**
 * Tenant mismatch error
 */
export class TenantMismatchError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "TenantMismatchError"
	}
}
