// kilocode_change - new file
/**
 * Metrics collection and reporting
 */

import type { Metric, MetricType } from "./types.js"

/**
 * Metrics Collector
 * Collects and reports metrics for monitoring
 */
export class MetricsCollector {
	private metrics: Map<string, Metric[]> = new Map()

	/**
	 * Record a counter metric
	 */
	incrementCounter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
		this.recordMetric({
			name,
			type: "counter" as MetricType,
			value,
			tags,
			timestamp: new Date(),
		})
	}

	/**
	 * Record a gauge metric
	 */
	recordGauge(name: string, value: number, tags: Record<string, string> = {}): void {
		this.recordMetric({
			name,
			type: "gauge" as MetricType,
			value,
			tags,
			timestamp: new Date(),
		})
	}

	/**
	 * Record a histogram metric
	 */
	recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
		this.recordMetric({
			name,
			type: "histogram" as MetricType,
			value,
			tags,
			timestamp: new Date(),
		})
	}

	/**
	 * Time a function execution
	 */
	async timeAsync<T>(name: string, fn: () => Promise<T>, tags: Record<string, string> = {}): Promise<T> {
		const start = Date.now()
		try {
			const result = await fn()
			const duration = Date.now() - start
			this.recordTimer(name, duration, tags)
			return result
		} catch (error) {
			const duration = Date.now() - start
			this.recordTimer(name, duration, { ...tags, error: "true" })
			throw error
		}
	}

	/**
	 * Time a synchronous function execution
	 */
	time<T>(name: string, fn: () => T, tags: Record<string, string> = {}): T {
		const start = Date.now()
		try {
			const result = fn()
			const duration = Date.now() - start
			this.recordTimer(name, duration, tags)
			return result
		} catch (error) {
			const duration = Date.now() - start
			this.recordTimer(name, duration, { ...tags, error: "true" })
			throw error
		}
	}

	/**
	 * Record a timer metric
	 */
	private recordTimer(name: string, durationMs: number, tags: Record<string, string> = {}): void {
		this.recordMetric({
			name,
			type: "timer" as MetricType,
			value: durationMs,
			tags,
			timestamp: new Date(),
		})
	}

	/**
	 * Record a metric
	 */
	private recordMetric(metric: Metric): void {
		const metrics = this.metrics.get(metric.name) || []
		metrics.push(metric)
		this.metrics.set(metric.name, metrics)

		// In production, this would:
		// - Send to metrics aggregation service (DataDog, Prometheus, CloudWatch)
		// - Buffer and batch for efficient transmission
	}

	/**
	 * Get metrics summary
	 */
	getSummary(
		metricName: string,
		since?: Date,
	): {
		count: number
		sum: number
		avg: number
		min: number
		max: number
	} {
		const metrics = this.metrics.get(metricName) || []
		const filtered = since ? metrics.filter((m) => m.timestamp >= since) : metrics

		if (filtered.length === 0) {
			return { count: 0, sum: 0, avg: 0, min: 0, max: 0 }
		}

		const values = filtered.map((m) => m.value)
		const sum = values.reduce((a, b) => a + b, 0)
		const avg = sum / values.length
		const min = Math.min(...values)
		const max = Math.max(...values)

		return { count: filtered.length, sum, avg, min, max }
	}

	/**
	 * Clear old metrics
	 */
	cleanup(olderThanMs: number = 60 * 60 * 1000): void {
		const cutoff = new Date(Date.now() - olderThanMs)

		for (const [name, metrics] of this.metrics.entries()) {
			const filtered = metrics.filter((m) => m.timestamp >= cutoff)
			if (filtered.length === 0) {
				this.metrics.delete(name)
			} else {
				this.metrics.set(name, filtered)
			}
		}
	}
}
