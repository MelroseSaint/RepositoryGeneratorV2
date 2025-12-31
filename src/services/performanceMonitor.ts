export interface PerformanceMetric {
    operation: string;
    duration: number;
    timestamp: string;
    success: boolean;
}

class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];

    start(operation: string): (success?: boolean) => void {
        const startTime = performance.now();
        return (success: boolean = true) => {
            const duration = performance.now() - startTime;
            this.metrics.push({
                operation,
                duration,
                timestamp: new Date().toISOString(),
                success
            });
            console.log(`[Performance] ${operation} took ${duration.toFixed(2)}ms (${success ? 'success' : 'failed'})`);
        };
    }

    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }

    getSummary() {
        const summary: Record<string, { avg: number; count: number; failures: number }> = {};

        this.metrics.forEach(m => {
            if (!summary[m.operation]) {
                summary[m.operation] = { avg: 0, count: 0, failures: 0 };
            }
            const s = summary[m.operation];
            s.avg = (s.avg * s.count + m.duration) / (s.count + 1);
            s.count++;
            if (!m.success) s.failures++;
        });

        return summary;
    }
}

export const performanceMonitor = new PerformanceMonitor();
