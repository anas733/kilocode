// kilocode_change - new file
/**
 * Tests for RateLimiter
 */

import { describe, test, expect, beforeEach } from "vitest"
import { RateLimiter } from "../RateLimiter"

describe("RateLimiter", () => {
	let limiter: RateLimiter

	beforeEach(() => {
		limiter = new RateLimiter()
	})

	describe("consume", () => {
		test("should allow requests within limit", () => {
			const rule = { windowMs: 60000, maxRequests: 10 }
			const key = "user-123"

			for (let i = 0; i < 10; i++) {
				const result = limiter.consume(key, rule)
				expect(result.allowed).toBe(true)
				// First request has 10 remaining (before consuming), then 9, 8, etc.
				expect(result.remaining).toBeGreaterThanOrEqual(0)
			}
		})

		test("should block requests exceeding limit", () => {
			const rule = { windowMs: 60000, maxRequests: 5 }
			const key = "user-123"

			// Consume all allowed requests
			for (let i = 0; i < 5; i++) {
				limiter.consume(key, rule)
			}

			// Next request should be blocked
			const result = limiter.consume(key, rule)
			expect(result.allowed).toBe(false)
			expect(result.remaining).toBe(0)
			expect(result.retryAfterMs).toBeGreaterThan(0)
		})

		test("should allow requests after window expires", async () => {
			const rule = { windowMs: 100, maxRequests: 2 }
			const key = "user-123"

			// Consume all requests
			limiter.consume(key, rule)
			limiter.consume(key, rule)

			// Should be blocked
			let result = limiter.consume(key, rule)
			expect(result.allowed).toBe(false)

			// Wait for window to expire
			await new Promise((resolve) => setTimeout(resolve, 150))

			// Should be allowed again
			result = limiter.consume(key, rule)
			expect(result.allowed).toBe(true)
		})
	})

	describe("reset", () => {
		test("should reset rate limit for key", () => {
			const rule = { windowMs: 60000, maxRequests: 3 }
			const key = "user-123"

			// Consume all requests
			for (let i = 0; i < 3; i++) {
				limiter.consume(key, rule)
			}

			// Reset
			limiter.reset(key)

			// Should be allowed again
			const result = limiter.consume(key, rule)
			expect(result.allowed).toBe(true)
		})
	})
})
