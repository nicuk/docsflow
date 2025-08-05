'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Activity } from 'lucide-react';

interface SecurityEvent {
  timestamp: string;
  type: 'blocked_attack' | 'rate_limited' | 'suspicious_activity';
  path: string;
  ip: string;
  userAgent: string;
}

export function SecurityMonitor() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    // In a real implementation, this would connect to your logging system
    // For now, we'll simulate some recent events based on the logs you showed
    const recentEvents: SecurityEvent[] = [
      {
        timestamp: new Date().toISOString(),
        type: 'blocked_attack',
        path: '/.env',
        ip: '91.240.118.XXX',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: 'blocked_attack',
        path: '/wp-config.php',
        ip: '91.240.118.XXX',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        type: 'suspicious_activity',
        path: '/admin.html',
        ip: '91.240.118.XXX',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    ];

    setEvents(recentEvents);
    
    // Set threat level based on recent activity
    const recentAttacks = recentEvents.filter(e => 
      e.type === 'blocked_attack' && 
      new Date(e.timestamp).getTime() > Date.now() - 300000 // Last 5 minutes
    );
    
    if (recentAttacks.length > 10) setThreatLevel('high');
    else if (recentAttacks.length > 5) setThreatLevel('medium');
    else setThreatLevel('low');
  }, []);

  const getThreatBadgeColor = () => {
    switch (threatLevel) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'default';
    }
  };

  const getThreatIcon = () => {
    switch (threatLevel) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Activity className="h-4 w-4 text-yellow-500" />;
      default: return <Shield className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getThreatIcon()}
            Security Status
            <Badge variant={getThreatBadgeColor()}>
              {threatLevel.toUpperCase()} THREAT
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {threatLevel === 'high' && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                High security activity detected. Multiple attack attempts blocked in the last 5 minutes.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {events.filter(e => e.type === 'blocked_attack').length}
              </div>
              <div className="text-sm text-muted-foreground">Attacks Blocked</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {events.filter(e => e.type === 'rate_limited').length}
              </div>
              <div className="text-sm text-muted-foreground">Rate Limited</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {new Set(events.map(e => e.ip)).size}
              </div>
              <div className="text-sm text-muted-foreground">Unique IPs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.slice(0, 10).map((event, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    event.type === 'blocked_attack' ? 'destructive' : 
                    event.type === 'rate_limited' ? 'secondary' : 'outline'
                  }>
                    {event.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <code className="text-sm bg-muted px-1 rounded">{event.path}</code>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}