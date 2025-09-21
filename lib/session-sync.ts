/**
 * SURGICAL FIX: Cross-Tab Session Synchronization
 * 
 * Solves the "Session not shared across tabs" issue identified in tests
 * by implementing proper session broadcasting using BroadcastChannel API
 */

export interface SessionSyncEvent {
  type: 'SESSION_UPDATED' | 'SESSION_EXPIRED' | 'LOGOUT';
  sessionData?: {
    access_token: string;
    expires_at: number;
    user: any;
  };
  timestamp: number;
}

export class SessionSync {
  private static instance: SessionSync;
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(event: SessionSyncEvent) => void> = new Set();
  private isInitialized = false;

  static getInstance(): SessionSync {
    if (!SessionSync.instance) {
      SessionSync.instance = new SessionSync();
    }
    return SessionSync.instance;
  }

  private constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('docsflow-session-sync');
      this.setupEventHandlers();
      this.isInitialized = true;
      console.log('✅ [SESSION-SYNC] Cross-tab session sync initialized');
    }
  }

  private setupEventHandlers() {
    if (!this.channel) return;

    this.channel.addEventListener('message', (event) => {
      const sessionEvent = event.data as SessionSyncEvent;
      console.log(`🔄 [SESSION-SYNC] Received: ${sessionEvent.type}`);
      
      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener(sessionEvent);
        } catch (error) {
          console.error('❌ [SESSION-SYNC] Listener error:', error);
        }
      });
    });
  }

  /**
   * Broadcast session update to all tabs
   */
  broadcastSessionUpdate(sessionData: {
    access_token: string;
    expires_at: number;
    user: any;
  }): void {
    if (!this.channel) return;

    const event: SessionSyncEvent = {
      type: 'SESSION_UPDATED',
      sessionData,
      timestamp: Date.now()
    };

    this.channel.postMessage(event);
    console.log('📡 [SESSION-SYNC] Broadcasted session update');
  }

  /**
   * Broadcast session expiry to all tabs
   */
  broadcastSessionExpired(): void {
    if (!this.channel) return;

    const event: SessionSyncEvent = {
      type: 'SESSION_EXPIRED',
      timestamp: Date.now()
    };

    this.channel.postMessage(event);
    console.log('📡 [SESSION-SYNC] Broadcasted session expiry');
  }

  /**
   * Broadcast logout to all tabs
   */
  broadcastLogout(): void {
    if (!this.channel) return;

    const event: SessionSyncEvent = {
      type: 'LOGOUT',
      timestamp: Date.now()
    };

    this.channel.postMessage(event);
    console.log('📡 [SESSION-SYNC] Broadcasted logout');
  }

  /**
   * Add listener for session sync events
   */
  addListener(listener: (event: SessionSyncEvent) => void): () => void {
    this.listeners.add(listener);
    
    // Return cleanup function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
    console.log('🧹 [SESSION-SYNC] Cleaned up session sync');
  }

  get isActive(): boolean {
    return this.isInitialized && !!this.channel;
  }
}

// Export singleton instance
export const sessionSync = SessionSync.getInstance();
