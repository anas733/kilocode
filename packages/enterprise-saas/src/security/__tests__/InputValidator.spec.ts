/**
 * Tests for InputValidator
 */

import { describe, test, expect } from "vitest"
import { InputValidator, ValidationError } from "../../security/InputValidator.js"
import { z } from "zod"

describe("InputValidator", () => {
	let validator: InputValidator

	beforeAll(() => {
		validator = new InputValidator()
	})

	describe("validate", () => {
		test("should validate valid input against schema", () => {
			const schema = z.object({
				name: z.string().min(1),
				age: z.number().positive(),
			})

			const result = validator.validate(schema, { name: "John", age: 30 })

			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.name).toBe("John")
				expect(result.data.age).toBe(30)
			}
		})

		test("should reject invalid input", () => {
			const schema = z.object({
				email: z.string().email(),
			})

			const result = validator.validate(schema, { email: "not-an-email" })

			expect(result.success).toBe(false)
			if (!result.success) {
				expect(result.errors.length).toBeGreaterThan(0)
				expect(result.errors[0]).toContain("email")
			}
		})
	})

	describe("sanitizeString", () => {
		test("should remove null bytes", () => {
			const input = "test\0string"
			const sanitized = validator.sanitizeString(input)

			expect(sanitized).toBe("teststring")
		})

		test("should trim whitespace", () => {
			const input = "  test string  "
			const sanitized = validator.sanitizeString(input)

			expect(sanitized).toBe("test string")
		})
	})

	describe("sanitizeHtml", () => {
		test("should remove HTML tags", () => {
			const input = "<script>alert('xss')</script>Hello <b>World</b>"
			const sanitized = validator.sanitizeHtml(input)

			expect(sanitized).toBe("alert('xss')Hello World")
			expect(sanitized).not.toContain("<")
			expect(sanitized).not.toContain(">")
		})
	})

	describe("sanitizeFilePath", () => {
		test("should remove directory traversal attempts", () => {
			const input = "../../../etc/passwd"
			const sanitized = validator.sanitizeFilePath(input)

			expect(sanitized).not.toContain("..")
		})

		test("should remove null bytes from paths", () => {
			const input = "file\0.txt"
			const sanitized = validator.sanitizeFilePath(input)

			expect(sanitized).toBe("file.txt")
		})

		test("should normalize slashes", () => {
			const input = "path\\to\\file"
			const sanitized = validator.sanitizeFilePath(input)

			expect(sanitized).toBe("path/to/file")
		})

		test("should remove leading slashes", () => {
			const input = "/absolute/path/file.txt"
			const sanitized = validator.sanitizeFilePath(input)

			expect(sanitized).toBe("absolute/path/file.txt")
		})
	})

	describe("isValidEmail", () => {
		test("should validate correct email addresses", () => {
			expect(validator.isValidEmail("user@example.com")).toBe(true)
			expect(validator.isValidEmail("test.user+tag@domain.co.uk")).toBe(true)
		})

		test("should reject invalid email addresses", () => {
			expect(validator.isValidEmail("not-an-email")).toBe(false)
			expect(validator.isValidEmail("@example.com")).toBe(false)
			expect(validator.isValidEmail("user@")).toBe(false)
		})
	})

	describe("isValidUrl", () => {
		test("should validate correct URLs", () => {
			expect(validator.isValidUrl("https://example.com")).toBe(true)
			expect(validator.isValidUrl("http://localhost:3000/path")).toBe(true)
		})

		test("should reject invalid URLs", () => {
			expect(validator.isValidUrl("not-a-url")).toBe(false)
			// Note: ftp:// is a valid URL scheme, so we test with truly invalid
			expect(validator.isValidUrl("://invalid")).toBe(false)
		})
	})

	describe("containsSqlInjection", () => {
		test("should detect SQL injection patterns", () => {
			expect(validator.containsSqlInjection("SELECT * FROM users")).toBe(true)
			expect(validator.containsSqlInjection("'; DROP TABLE users;--")).toBe(true)
			expect(validator.containsSqlInjection("name'); DROP TABLE--")).toBe(true)
		})

		test("should allow normal text", () => {
			expect(validator.containsSqlInjection("Normal text")).toBe(false)
			expect(validator.containsSqlInjection("user input")).toBe(false)
		})
	})

	describe("containsXss", () => {
		test("should detect XSS patterns", () => {
			expect(validator.containsXss("<script>alert('xss')</script>")).toBe(true)
			expect(validator.containsXss("javascript:void(0)")).toBe(true)
			expect(validator.containsXss("<img onerror='alert(1)'>")).toBe(true)
			expect(validator.containsXss("<iframe src='evil.com'>")).toBe(true)
		})

		test("should allow normal HTML-like text", () => {
			expect(validator.containsXss("My favorite color is <3")).toBe(false)
		})
	})

	describe("enforceMaxLength", () => {
		test("should allow strings within limit", () => {
			expect(() => {
				validator.enforceMaxLength("short", 10, "field")
			}).not.toThrow()
		})

		test("should throw error for strings exceeding limit", () => {
			expect(() => {
				validator.enforceMaxLength("this is a very long string", 10, "field")
			}).toThrow(ValidationError)
		})
	})
})
