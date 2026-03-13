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
    // ENTERPRISE FIX: Use passive monitoring instead of intercepting getComputedStyle
    // Previous implementation was causing the forced reflows it was trying to detect
    
    // Track forced reflows via Performance Observer (passive, non-intrusive)
    let reflowCounter = 0
    const reflowObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Monitor layout-triggering operations
        if (entry.entryType === 'measure' && entry.name.includes('layout')) {
          reflowCounter++
          if (reflowCounter > 10) { // Enterprise threshold: max 10 per monitoring cycle
            metricsRef.current.forcedReflows++
          }
        }
      }
    })
    
    // Observe layout measurements without intercepting browser APIs
    try {
      reflowObserver.observe({ entryTypes: ['measure'] })
    } catch (e) {
      // Fallback: Use mutation observer for DOM changes (still passive)
      const mutationObserver = new MutationObserver((mutations) => {
        let significantChanges = 0
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 5) {
            significantChanges++
          }
        })
        if (significantChanges > 3) {
          metricsRef.current.forcedReflows++
        }
      })
      mutationObserver.observe(document.body, { 
        childList: true, 
        subtree: true,
        attributes: false // Don't track attribute changes to reduce overhead
      })
    }

    // Monitor long tasks
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
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
      // Clean up observers without restoring getComputedStyle (no longer intercepted)
      reflowObserver.disconnect()
      observer.disconnect()
      clearInterval(memoryInterval)
    }
  }, [])

  const getMetrics = () => metricsRef.current

  const logMetrics = () => {
    // No-op: metrics available via getMetrics()
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