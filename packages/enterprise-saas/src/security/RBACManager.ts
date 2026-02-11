// kilocode_change - new file
/**
 * Role-Based Access Control (RBAC) implementation
 */

import type { AuthContext, PermissionScope, Role } from "./types.js"
import { RolePermissions } from "./types.js"

/**
 * RBAC Manager
 * Implements role-based access control with permission checking
 */
export class RBACManager {
	/**
	 * Check if a user has a specific permission
	 */
	hasPermission(authContext: AuthContext, permission: PermissionScope): boolean {
		return authContext.permissions.includes(permission)
	}

	/**
	 * Check if a user has any of the specified permissions
	 */
	hasAnyPermission(authContext: AuthContext, permissions: PermissionScope[]): boolean {
		return permissions.some((permission) => authContext.permissions.includes(permission))
	}

	/**
	 * Check if a user has all of the specified permissions
	 */
	hasAllPermissions(authContext: AuthContext, permissions: PermissionScope[]): boolean {
		return permissions.every((permission) => authContext.permissions.includes(permission))
	}

	/**
	 * Check if a user has a specific role
	 */
	hasRole(authContext: AuthContext, role: Role): boolean {
		return authContext.roles.includes(role)
	}

	/**
	 * Check if a user has any of the specified roles
	 */
	hasAnyRole(authContext: AuthContext, roles: Role[]): boolean {
		return roles.some((role) => authContext.roles.includes(role))
	}

	/**
	 * Get all permissions for given roles
	 */
	getPermissionsForRoles(roles: Role[]): PermissionScope[] {
		const permissions = new Set<PermissionScope>()

		for (const role of roles) {
			const rolePerms = RolePermissions[role] || []
			rolePerms.forEach((perm: PermissionScope) => permissions.add(perm))
		}

		return Array.from(permissions)
	}

	/**
	 * Check if user can access a resource owned by a tenant
	 */
	canAccessTenant(authContext: AuthContext, targetTenantId: string): boolean {
		// Super admins can access any tenant
		if (this.hasRole(authContext, "super_admin" as Role)) {
			return true
		}

		// Users can only access their own tenant
		return authContext.tenantId === targetTenantId
	}

	/**
	 * Enforce permission check (throws error if denied)
	 */
	enforcePermission(authContext: AuthContext, permission: PermissionScope, resourceDescription?: string): void {
		if (!this.hasPermission(authContext, permission)) {
			throw new PermissionDeniedError(
				`Permission denied: ${permission}${resourceDescription ? ` for ${resourceDescription}` : ""}`,
			)
		}
	}

	/**
	 * Enforce tenant access check (throws error if denied)
	 */
	enforceTenantAccess(authContext: AuthContext, targetTenantId: string, resourceDescription?: string): void {
		if (!this.canAccessTenant(authContext, targetTenantId)) {
			throw new PermissionDeniedError(
				`Tenant access denied${resourceDescription ? ` for ${resourceDescription}` : ""}`,
			)
		}
	}
}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "PermissionDeniedError"
	}
}
