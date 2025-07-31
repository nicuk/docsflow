interface AuditLogEntry {
  timestamp: string;
  action: string;
  actor: {
    type: 'platform_admin' | 'tenant_admin' | 'user';
    email: string;
    tenantId?: string;
  };
  target: {
    type: 'tenant' | 'user' | 'document' | 'settings';
    id: string;
    tenantId?: string;
  };
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class AuditLogger {
  private logs: AuditLogEntry[] = [];

  /**
   * Log an audit event
   */
  log(entry: Omit<AuditLogEntry, 'timestamp'>) {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    this.logs.push(auditEntry);

    // In production, send to logging service (e.g., Datadog, CloudWatch, etc.)
    this.sendToLoggingService(auditEntry);

    // For critical events, send alerts
    if (entry.severity === 'critical') {
      this.sendAlert(auditEntry);
    }
  }

  /**
   * Log platform admin actions
   */
  logPlatformAdminAction(
    action: string,
    adminEmail: string,
    target: AuditLogEntry['target'],
    details: Record<string, any> = {},
    severity: AuditLogEntry['severity'] = 'medium'
  ) {
    this.log({
      action,
      actor: {
        type: 'platform_admin',
        email: adminEmail
      },
      target,
      details,
      severity
    });
  }

  /**
   * Log tenant admin actions
   */
  logTenantAdminAction(
    action: string,
    adminEmail: string,
    tenantId: string,
    target: AuditLogEntry['target'],
    details: Record<string, any> = {},
    severity: AuditLogEntry['severity'] = 'low'
  ) {
    this.log({
      action,
      actor: {
        type: 'tenant_admin',
        email: adminEmail,
        tenantId
      },
      target: {
        ...target,
        tenantId
      },
      details,
      severity
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    action: string,
    details: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) {
    this.log({
      action,
      actor: {
        type: 'user',
        email: 'unknown'
      },
      target: {
        type: 'settings',
        id: 'security'
      },
      details,
      ipAddress,
      userAgent,
      severity: 'high'
    });
  }

  /**
   * Get audit logs (for admin dashboard)
   */
  getLogs(filters?: {
    tenantId?: string;
    actorType?: AuditLogEntry['actor']['type'];
    severity?: AuditLogEntry['severity'];
    limit?: number;
  }): AuditLogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters?.tenantId) {
      filteredLogs = filteredLogs.filter(log => 
        log.actor.tenantId === filters.tenantId || 
        log.target.tenantId === filters.tenantId
      );
    }

    if (filters?.actorType) {
      filteredLogs = filteredLogs.filter(log => log.actor.type === filters.actorType);
    }

    if (filters?.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  /**
   * Send to external logging service
   */
  private sendToLoggingService(entry: AuditLogEntry) {
    // In production, integrate with your logging service
    console.log('📋 AUDIT LOG:', JSON.stringify(entry, null, 2));
  }

  /**
   * Send critical alerts
   */
  private sendAlert(entry: AuditLogEntry) {
    // In production, send to alerting service (PagerDuty, Slack, etc.)
    console.log('🚨 CRITICAL AUDIT ALERT:', JSON.stringify(entry, null, 2));
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Common audit actions
export const AUDIT_ACTIONS = {
  // Platform Admin Actions
  PLATFORM_ADMIN_LOGIN: 'platform_admin_login',
  PLATFORM_ADMIN_LOGOUT: 'platform_admin_logout',
  TENANT_CREATED: 'tenant_created',
  TENANT_DELETED: 'tenant_deleted',
  TENANT_SUSPENDED: 'tenant_suspended',
  
  // Tenant Admin Actions
  TENANT_SETTINGS_UPDATED: 'tenant_settings_updated',
  USER_INVITED: 'user_invited',
  USER_REMOVED: 'user_removed',
  USER_ROLE_CHANGED: 'user_role_changed',
  
  // Security Events
  FAILED_LOGIN_ATTEMPT: 'failed_login_attempt',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'unauthorized_access_attempt'
} as const;