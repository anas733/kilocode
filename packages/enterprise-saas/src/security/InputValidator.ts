// kilocode_change - new file
/**
 * Input validation and sanitization framework
 */

import { z, ZodSchema } from "zod"

/**
 * Input Validator
 * Provides validation and sanitization for all external inputs
 */
export class InputValidator {
	/**
	 * Validate input against a Zod schema
	 */
	validate<T>(
		schema: ZodSchema<T>,
		input: unknown,
	): { success: true; data: T } | { success: false; errors: string[] } {
		const result = schema.safeParse(input)

		if (result.success) {
			return { success: true, data: result.data }
		}

		const errors = result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`)

		return { success: false, errors }
	}

	/**
	 * Sanitize string input (remove dangerous characters)
	 */
	sanitizeString(input: string): string {
		// Remove null bytes
		let sanitized = input.replace(/\0/g, "")

		// Trim whitespace
		sanitized = sanitized.trim()

		return sanitized
	}

	/**
	 * Sanitize HTML input (strip tags)
	 */
	sanitizeHtml(input: string): string {
		// Basic HTML tag removal (for production, use a library like DOMPurify)
		return input.replace(/<[^>]*>/g, "")
	}

	/**
	 * Validate and sanitize file path
	 */
	sanitizeFilePath(input: string): string {
		// Remove directory traversal attempts
		let sanitized = input.replace(/\.\./g, "")

		// Remove null bytes
		sanitized = sanitized.replace(/\0/g, "")

		// Normalize slashes
		sanitized = sanitized.replace(/\\/g, "/")

		// Remove leading slashes (prevent absolute paths)
		sanitized = sanitized.replace(/^\/+/, "")

		return sanitized
	}

	/**
	 * Validate email format
	 */
	isValidEmail(email: string): boolean {
		const emailSchema = z.string().email()
		return emailSchema.safeParse(email).success
	}

	/**
	 * Validate URL format
	 */
	isValidUrl(url: string): boolean {
		const urlSchema = z.string().url()
		return urlSchema.safeParse(url).success
	}

	/**
	 * Check if input contains SQL injection patterns
	 */
	containsSqlInjection(input: string): boolean {
		const sqlPatterns = [
			/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
			/(;|--|\/\*|\*\/|xp_|sp_)/gi,
		]

		return sqlPatterns.some((pattern) => pattern.test(input))
	}

	/**
	 * Check if input contains XSS patterns
	 */
	containsXss(input: string): boolean {
		const xssPatterns = [/<script/gi, /javascript:/gi, /onerror=/gi, /onload=/gi, /<iframe/gi]

		return xssPatterns.some((pattern) => pattern.test(input))
	}

	/**
	 * Validate and enforce input length limits
	 */
	enforceMaxLength(input: string, maxLength: number, fieldName: string): void {
		if (input.length > maxLength) {
			throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength} characters`)
		}
	}
}

/**
 * Validation error
 */
export class ValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "ValidationError"
	}
}
