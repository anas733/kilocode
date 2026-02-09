// kilocode_change - new file
/**
 * Secure API key management with rotation, hashing, and scope control
 */

import crypto from "crypto"
import { nanoid } from "nanoid"
import type { ApiKey, CreateApiKeyInput } from "./types.js"

/**
 * API Key Manager
 * Handles secure generation, validation, and rotation of API keys
 */
export class ApiKeyManager {
	private readonly keyPrefix = "kilo"
	private readonly hashAlgorithm = "sha256"

	/**
	 * Generate a new API key with metadata
	 */
	generateApiKey(input: CreateApiKeyInput & { tenantId: string; userId: string }): {
		apiKey: ApiKey
		plainKey: string
	} {
		// Generate random key
		const randomBytes = crypto.randomBytes(32)
		const keyId = nanoid(16)
		const keySecret = randomBytes.toString("base64url")

		// Format: kilo_<keyId>_<secret>
		const plainKey = `${this.keyPrefix}_${keyId}_${keySecret}`

		// Hash the key for storage
		const keyHash = this.hashKey(plainKey)

		const now = new Date()
		const expiresAt = input.expiresInDays
			? new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000)
			: undefined

		const apiKey: ApiKey = {
			id: keyId,
			tenantId: input.tenantId,
			name: input.name,
			keyHash,
			prefix: `${this.keyPrefix}_${keyId}`,
			scopes: input.scopes,
			rateLimit: input.rateLimit,
			expiresAt,
			lastUsedAt: undefined,
			createdAt: now,
			createdBy: input.userId,
			isActive: true,
		}

		return { apiKey, plainKey }
	}

	/**
	 * Hash an API key for secure storage
	 */
	hashKey(plainKey: string): string {
		return crypto.createHash(this.hashAlgorithm).update(plainKey).digest("hex")
	}

	/**
	 * Validate an API key against stored hash
	 */
	validateKey(plainKey: string, storedHash: string): boolean {
		const computedHash = this.hashKey(plainKey)
		// Use constant-time comparison to prevent timing attacks
		return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(storedHash))
	}

	/**
	 * Extract key ID from plain key for lookup
	 */
	extractKeyId(plainKey: string): string | null {
		const parts = plainKey.split("_")
		if (parts.length !== 3 || parts[0] !== this.keyPrefix) {
			return null
		}
		return parts[1] || null
	}

	/**
	 * Check if key is expired
	 */
	isKeyExpired(apiKey: ApiKey): boolean {
		if (!apiKey.expiresAt) {
			return false
		}
		return new Date() > apiKey.expiresAt
	}

	/**
	 * Rotate an API key (generate new key, maintain metadata)
	 */
	rotateKey(existingKey: ApiKey, userId: string): { apiKey: ApiKey; plainKey: string } {
		return this.generateApiKey({
			name: existingKey.name,
			scopes: existingKey.scopes,
			rateLimit: existingKey.rateLimit,
			tenantId: existingKey.tenantId,
			userId,
		})
	}
}
