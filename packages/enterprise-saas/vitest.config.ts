// kilocode_change - new file
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["**/*.spec.ts", "**/*.test.ts", "**/node_modules/**", "**/dist/**"],
		},
	},
})
