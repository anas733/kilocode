// kilocode_change - new file
/**
 * Tests for ApiKeyManager
 */

import { describe, test, expect } from "vitest"
import { ApiKeyManager } from "../ApiKeyManager"

describe("ApiKeyManager", () => {
	const manager = new ApiKeyManager()

	describe("generateApiKey", () => {
		test("should generate a valid API key", () => {
			const input = {
				name: "Test API Key",
				scopes: ["code:read", "code:write"],
				tenantId: "tenant-123",
				userId: "user-456",
			}

			const { apiKey, plainKey } = manager.generateApiKey(input)

			expect(apiKey).toBeDefined()
			expect(apiKey.id).toBeDefined()
			expect(apiKey.name).toBe(input.name)
			expect(apiKey.scopes).toEqual(input.scopes)
			expect(apiKey.tenantId).toBe(input.tenantId)
			expect(apiKey.isActive).toBe(true)
			expect(plainKey).toMatch(/^kilo_/)
		})

		test("should generate unique keys", () => {
			const input = {
				name: "Test Key",
				scopes: ["code:read"],
				tenantId: "tenant-123",
				userId: "user-456",
			}

			const { plainKey: key1 } = manager.generateApiKey(input)
			const { plainKey: key2 } = manager.generateApiKey(input)

			expect(key1).not.toBe(key2)
		})
	})

	describe("validateKey", () => {
		test("should validate correct key", () => {
			const input = {
				name: "Test Key",
				scopes: ["code:read"],
				tenantId: "tenant-123",
				userId: "user-456",
			}

			const { apiKey, plainKey } = manager.generateApiKey(input)
			const isValid = manager.validateKey(plainKey, apiKey.keyHash)

			expect(isValid).toBe(true)
		})

		test("should reject incorrect key", () => {
			const input = {
				name: "Test Key",
				scopes: ["code:read"],
				tenantId: "tenant-123",
				userId: "user-456",
			}

			const { apiKey } = manager.generateApiKey(input)
			const isValid = manager.validateKey("kilo_wrong_key", apiKey.keyHash)

			expect(isValid).toBe(false)
		})
	})
})
