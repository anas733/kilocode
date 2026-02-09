// kilocode_change - new file
/**
 * Rate limiting implementation with sliding window
 */

export interface RateLimitRule {
	windowMs: number // Time window in milliseconds
	maxRequests: number // Maximum requests in the window
	burstSize?: number // Allow burst of requests
}

export interface RateLimitResult {
	allowed: boolean
	limit: number
	remaining: number
	resetAt: Date
	retryAfterMs?: number
}

/**
 * Rate Limiter
 * Implements sliding window rate limiting for API requests
 */
export class RateLimiter {
	private requestLog: Map<string, number[]> = new Map()

	/**
	 * Check if a request should be allowed
	 */
	checkLimit(key: string, rule: RateLimitRule): RateLimitResult {
		const now = Date.now()
		const windowStart = now - rule.windowMs

		// Get request timestamps for this key
		let timestamps = this.requestLog.get(key) || []

		// Remove timestamps outside the window
		timestamps = timestamps.filter((ts) => ts > windowStart)

		// Update the log
		this.requestLog.set(key, timestamps)

		// Check if limit exceeded
		const requestCount = timestamps.length
		const allowed = requestCount < rule.maxRequests

		// Calculate reset time (end of current window)
		const oldestTimestamp = timestamps[0] || now
		const resetAt = new Date(oldestTimestamp + rule.windowMs)

		// Calculate retry after (if limit exceeded)
		let retryAfterMs: number | undefined
		if (!allowed && timestamps.length > 0 && timestamps[0]) {
			retryAfterMs = Math.max(0, timestamps[0] + rule.windowMs - now)
		}

		return {
			allowed,
			limit: rule.maxRequests,
			remaining: Math.max(0, rule.maxRequests - requestCount),
			resetAt,
			retryAfterMs,
		}
	}

	/**
	 * Record a request
	 */
	recordRequest(key: string): void {
		const now = Date.now()
		const timestamps = this.requestLog.get(key) || []
		timestamps.push(now)
		this.requestLog.set(key, timestamps)
	}

	/**
	 * Check and record a request in one operation
	 */
	consume(key: string, rule: RateLimitRule): RateLimitResult {
		const result = this.checkLimit(key, rule)
		if (result.allowed) {
			this.recordRequest(key)
		}
		return result
	}

	/**
	 * Reset rate limit for a key
	 */
	reset(key: string): void {
		this.requestLog.delete(key)
	}

	/**
	 * Clear old entries (cleanup)
	 */
	cleanup(olderThanMs: number = 24 * 60 * 60 * 1000): void {
		const cutoff = Date.now() - olderThanMs

		for (const [key, timestamps] of this.requestLog.entries()) {
			const filtered = timestamps.filter((ts) => ts > cutoff)
			if (filtered.length === 0) {
				this.requestLog.delete(key)
			} else {
				this.requestLog.set(key, filtered)
			}
		}
	}

	/**
	 * Get current status for a key
	 */
	getStatus(
		key: string,
		rule: RateLimitRule,
	): {
		requestCount: number
		limit: number
		remaining: number
	} {
		const now = Date.now()
		const windowStart = now - rule.windowMs

		const timestamps = this.requestLog.get(key) || []
		const validTimestamps = timestamps.filter((ts) => ts > windowStart)
		const requestCount = validTimestamps.length

		return {
			requestCount,
			limit: rule.maxRequests,
			remaining: Math.max(0, rule.maxRequests - requestCount),
		}
	}
}

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededError extends Error {
	constructor(
		public retryAfterMs: number,
		public limit: number,
	) {
		super(`Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)} seconds.`)
		this.name = "RateLimitExceededError"
	}
}
