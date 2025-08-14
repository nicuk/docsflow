import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  forcedReflows: number
  layoutThrashing: number
  longTasks: number
  memoryUsage: number
}

export function usePerformanceMonitoring() {
  const metricsRef = useRef<PerformanceMetrics>({
    forcedReflows: 0,
    layoutThrashing: 0,
    longTasks: 0,
    memoryUsage: 0
  })

  useEffect(() => {
    // Monitor forced reflows
    const originalGetComputedStyle = window.getComputedStyle
    let reflowCount = 0

    window.getComputedStyle = function(element: Element, pseudoElt?: string | null) {
      reflowCount++
      // Disabled excessive logging - only track metrics silently
      if (reflowCount > 100) { // Increased threshold to reduce noise
        metricsRef.current.forcedReflows++
      }
      return originalGetComputedStyle.call(this, element, pseudoElt)
    }

    // Monitor long tasks
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn('⚠️ Long task detected:', {
            duration: entry.duration,
            name: entry.name,
            startTime: entry.startTime
          })
          metricsRef.current.longTasks++
        }
      }
    })

    observer.observe({ entryTypes: ['longtask'] })

    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        metricsRef.current.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
      }
    }, 5000)

    return () => {
      window.getComputedStyle = originalGetComputedStyle
      observer.disconnect()
      clearInterval(memoryInterval)
    }
  }, [])

  const getMetrics = () => metricsRef.current

  const logMetrics = () => {
    const metrics = getMetrics()
    console.log('📊 Performance Metrics:', {
      forcedReflows: metrics.forcedReflows,
      longTasks: metrics.longTasks,
      memoryUsage: `${metrics.memoryUsage.toFixed(2)} MB`
    })
  }

  return { getMetrics, logMetrics }
}

// Utility function to batch DOM operations
export function batchDOMOperations(operations: (() => void)[]) {
  requestAnimationFrame(() => {
    operations.forEach(operation => operation())
  })
}

// Utility function to debounce expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
} 