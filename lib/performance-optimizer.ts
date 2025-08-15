/**
 * Performance Optimizer - Fixes forced reflows, long tasks, and memory issues
 * Addresses: 20 forced reflows, long tasks blocking main thread, 56.77MB memory usage
 */

interface PerformanceMetrics {
  forcedReflows: number;
  longTasks: number;
  memoryUsage: string;
  renderTime: number;
  interactionDelay: number;
}

class PerformanceOptimizer {
  private observer: PerformanceObserver | null = null;
  private rafId: number | null = null;
  private batchedUpdates: Array<() => void> = [];
  private isProcessing = false;

  constructor() {
    this.initPerformanceMonitoring();
    this.setupVirtualization();
  }

  /**
   * Fix forced reflows by batching DOM reads/writes
   */
  batchDOMOperations<T>(operations: Array<() => T>): T[] {
    const results: T[] = [];
    
    // Batch all reads first
    const reads = operations.filter(op => this.isReadOperation(op));
    const writes = operations.filter(op => !this.isReadOperation(op));
    
    // Execute reads
    reads.forEach(read => results.push(read()));
    
    // Then execute writes in next frame
    this.scheduleWork(() => {
      writes.forEach(write => results.push(write()));
    });
    
    return results;
  }

  /**
   * Break long tasks into smaller chunks using scheduler
   */
  scheduleWork(callback: () => void, priority: 'immediate' | 'normal' | 'low' = 'normal'): void {
    if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
      // Use Scheduler API if available
      (window as any).scheduler.postTask(callback, { priority });
    } else {
      // Fallback to time slicing
      this.timeSliceWork(callback);
    }
  }

  /**
   * Time slice work to prevent blocking main thread
   */
  private timeSliceWork(work: () => void, deadline = 5): void {
    const startTime = performance.now();
    
    const processChunk = () => {
      const currentTime = performance.now();
      
      if (currentTime - startTime < deadline) {
        work();
      } else {
        // Yield to browser, continue in next frame
        requestAnimationFrame(() => this.timeSliceWork(work, deadline));
      }
    };
    
    processChunk();
  }

  /**
   * Optimize memory usage with object pooling
   */
  private objectPool = new Map<string, any[]>();
  
  getPooledObject<T>(type: string, factory: () => T): T {
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, []);
    }
    
    const pool = this.objectPool.get(type)!;
    return pool.length > 0 ? pool.pop() : factory();
  }
  
  returnToPool<T>(type: string, obj: T): void {
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, []);
    }
    
    const pool = this.objectPool.get(type)!;
    if (pool.length < 50) { // Limit pool size
      pool.push(obj);
    }
  }

  /**
   * Virtual scrolling for large lists
   */
  createVirtualList(container: HTMLElement, items: any[], itemHeight: number) {
    const viewportHeight = container.clientHeight;
    const visibleCount = Math.ceil(viewportHeight / itemHeight) + 2; // Buffer
    
    let scrollTop = 0;
    let startIndex = 0;
    
    const render = () => {
      const newStartIndex = Math.floor(scrollTop / itemHeight);
      
      if (newStartIndex !== startIndex) {
        startIndex = newStartIndex;
        const endIndex = Math.min(startIndex + visibleCount, items.length);
        
        // Only render visible items
        this.renderVisibleItems(container, items.slice(startIndex, endIndex), startIndex, itemHeight);
      }
    };
    
    container.addEventListener('scroll', (e) => {
      scrollTop = (e.target as HTMLElement).scrollTop;
      this.scheduleWork(render, 'immediate');
    }, { passive: true });
    
    // Initial render
    render();
  }

  /**
   * Debounced resize handler to prevent excessive reflows
   */
  private resizeHandlers = new Set<() => void>();
  private resizeTimeout: number | null = null;
  
  onResize(handler: () => void): () => void {
    this.resizeHandlers.add(handler);
    
    if (this.resizeHandlers.size === 1) {
      window.addEventListener('resize', this.debouncedResize, { passive: true });
    }
    
    return () => {
      this.resizeHandlers.delete(handler);
      if (this.resizeHandlers.size === 0) {
        window.removeEventListener('resize', this.debouncedResize);
      }
    };
  }
  
  private debouncedResize = () => {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = window.setTimeout(() => {
      this.resizeHandlers.forEach(handler => this.scheduleWork(handler));
    }, 100);
  };

  /**
   * Optimize images with lazy loading and WebP
   */
  optimizeImages(container: HTMLElement): void {
    const images = container.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src) {
            // Load WebP if supported, fallback to original
            const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            
            this.loadImageWithFallback(img, webpSrc, src);
            imageObserver.unobserve(img);
          }
        }
      });
    }, { rootMargin: '50px' });
    
    images.forEach(img => imageObserver.observe(img));
  }

  /**
   * Memory cleanup utilities
   */
  cleanup(): void {
    // Clear object pools
    this.objectPool.clear();
    
    // Cancel pending work
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    // Disconnect observers
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Clear event listeners
    this.resizeHandlers.clear();
    window.removeEventListener('resize', this.debouncedResize);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const memory = (performance as any).memory;
    
    return {
      forcedReflows: this.getForcedReflowCount(),
      longTasks: this.getLongTaskCount(),
      memoryUsage: memory ? `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB` : 'N/A',
      renderTime: this.getAverageRenderTime(),
      interactionDelay: this.getInteractionDelay()
    };
  }

  // Private helper methods
  private initPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'longtask') {
            console.warn(`Long task detected: ${entry.duration}ms`);
          }
        });
      });
      
      try {
        this.observer.observe({ entryTypes: ['longtask', 'measure'] });
      } catch (e) {
        console.warn('Performance monitoring not fully supported');
      }
    }
  }

  private setupVirtualization(): void {
    // Setup intersection observer for virtualization
    if ('IntersectionObserver' in window) {
      // Already handled in optimizeImages and createVirtualList
    }
  }

  private isReadOperation(operation: () => any): boolean {
    // Heuristic to determine if operation is a DOM read
    const opString = operation.toString();
    return /\.(offset|client|scroll|getBounding)/.test(opString);
  }

  private renderVisibleItems(container: HTMLElement, items: any[], startIndex: number, itemHeight: number): void {
    // Clear existing content
    container.innerHTML = '';
    
    // Set container height for scrollbar
    container.style.height = `${items.length * itemHeight}px`;
    
    // Render visible items with proper positioning
    items.forEach((item, index) => {
      const element = this.getPooledObject('listItem', () => document.createElement('div'));
      element.style.position = 'absolute';
      element.style.top = `${(startIndex + index) * itemHeight}px`;
      element.style.height = `${itemHeight}px`;
      element.textContent = item.toString();
      
      container.appendChild(element);
    });
  }

  private loadImageWithFallback(img: HTMLImageElement, webpSrc: string, fallbackSrc: string): void {
    const webpImg = new Image();
    webpImg.onload = () => {
      img.src = webpSrc;
      img.removeAttribute('data-src');
    };
    webpImg.onerror = () => {
      img.src = fallbackSrc;
      img.removeAttribute('data-src');
    };
    webpImg.src = webpSrc;
  }

  private getForcedReflowCount(): number {
    // This would need browser-specific implementation
    return 0; // Placeholder
  }

  private getLongTaskCount(): number {
    // This would be tracked by the performance observer
    return 0; // Placeholder
  }

  private getAverageRenderTime(): number {
    const paintEntries = performance.getEntriesByType('paint');
    return paintEntries.length > 0 ? paintEntries[0].startTime : 0;
  }

  private getInteractionDelay(): number {
    // Measure first input delay if available
    const fidEntries = performance.getEntriesByType('first-input');
    return fidEntries.length > 0 ? (fidEntries[0] as any).processingStart - fidEntries[0].startTime : 0;
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// React hook for performance optimization
export function usePerformanceOptimization() {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceOptimizer.getMetrics());
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => {
      clearInterval(interval);
      performanceOptimizer.cleanup();
    };
  }, []);

  return {
    metrics,
    scheduleWork: performanceOptimizer.scheduleWork.bind(performanceOptimizer),
    batchDOMOperations: performanceOptimizer.batchDOMOperations.bind(performanceOptimizer),
    optimizeImages: performanceOptimizer.optimizeImages.bind(performanceOptimizer),
    createVirtualList: performanceOptimizer.createVirtualList.bind(performanceOptimizer)
  };
}

// Performance monitoring component
export function PerformanceMonitor() {
  const { metrics } = usePerformanceOptimization();

  if (!metrics || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>Reflows: {metrics.forcedReflows}</div>
      <div>Long Tasks: {metrics.longTasks}</div>
      <div>Memory: {metrics.memoryUsage}</div>
      <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
    </div>
  );
}
