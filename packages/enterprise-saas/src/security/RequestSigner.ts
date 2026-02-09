// kilocode_change - new file
/**
 * Request signing and verification for API security
 */

import crypto from "crypto"
import type { RequestSignature } from "./types.js"

export interface SignatureOptions {
	secret: string
	algorithm?: "HMAC-SHA256" | "RSA-SHA256"
	maxAgeMs?: number
}

/**
 * Request Signer
 * Implements request signing to prevent replay attacks and ensure integrity
 */
export class RequestSigner {
	private readonly defaultMaxAge = 5 * 60 * 1000 // 5 minutes

	/**
	 * Sign a request payload
	 */
	signRequest(payload: string, options: SignatureOptions): RequestSignature {
		const timestamp = Date.now()
		const nonce = crypto.randomBytes(16).toString("hex")
		const algorithm = options.algorithm || "HMAC-SHA256"

		// Create signature string: timestamp|nonce|payload
		const signatureString = `${timestamp}|${nonce}|${payload}`

		let signature: string
		if (algorithm === "HMAC-SHA256") {
			signature = crypto.createHmac("sha256", options.secret).update(signatureString).digest("hex")
		} else {
			// RSA-SHA256 - for future implementation
			throw new Error("RSA-SHA256 not yet implemented")
		}

		return {
			timestamp,
			nonce,
			signature,
			algorithm,
		}
	}

	/**
	 * Verify a request signature
	 */
	verifySignature(
		payload: string,
		signature: RequestSignature,
		options: SignatureOptions,
	): {
		valid: boolean
		error?: string
	} {
		// Check timestamp (prevent replay attacks)
		const maxAge = options.maxAgeMs || this.defaultMaxAge
		const age = Date.now() - signature.timestamp
		if (age > maxAge) {
			return { valid: false, error: "Signature expired" }
		}

		// Don't allow future timestamps (clock skew tolerance: 1 minute)
		if (signature.timestamp > Date.now() + 60000) {
			return { valid: false, error: "Invalid timestamp" }
		}

		// Recompute signature
		const signatureString = `${signature.timestamp}|${signature.nonce}|${payload}`

		let expectedSignature: string
		if (signature.algorithm === "HMAC-SHA256") {
			expectedSignature = crypto.createHmac("sha256", options.secret).update(signatureString).digest("hex")
		} else {
			return { valid: false, error: "Unsupported algorithm" }
		}

		// Constant-time comparison
		const isValid = crypto.timingSafeEqual(Buffer.from(signature.signature), Buffer.from(expectedSignature))

		if (!isValid) {
			return { valid: false, error: "Invalid signature" }
		}

		return { valid: true }
	}

	/**
	 * Generate a nonce for request deduplication
	 */
	generateNonce(): string {
		return crypto.randomBytes(16).toString("hex")
	}
}
