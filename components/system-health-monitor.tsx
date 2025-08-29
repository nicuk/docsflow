'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface CircuitBreakerMetrics {
  totalCalls: number;
  failures: number;
  successes: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  state: 'closed' | 'open' | 'half_open';
}

interface DegradationStatus {
  currentLevel: number;
  triggeredServices: string[];
  activatedAt: number;
  reason: string;
  uptime: number;
  affectedOperations: string[];
}

interface SystemHealth {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  activeIssues: string[];
  recommendations: string[];
}

interface HealthData {
  timestamp: string;
  circuitBreakers: Record<string, CircuitBreakerMetrics>;
  degradation: DegradationStatus;
  systemHealth: SystemHealth;
}

export function SystemHealthMonitor() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health/circuit-breakers');
      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }
      const data = await response.json();
      setHealthData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const controlCircuitBreaker = async (service: string, action: string) => {
    try {
      const response = await fetch('/api/health/circuit-breakers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, action })
      });
      
      if (response.ok) {
        await fetchHealthData(); // Refresh data
      }
    } catch (err) {
      console.error('Circuit breaker control failed:', err);
    }
  };

  useEffect(() => {
    fetchHealthData();
    const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'closed':
        return 'bg-green-100 text-green-800';
      case 'half_open':
        return 'bg-yellow-100 text-yellow-800';
      case 'open':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !healthData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading System Health...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Health Check Failed
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchHealthData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) return null;

  return (
    <div className="space-y-6">
      {/* Overall System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(healthData.systemHealth.overallStatus)}
            System Health: {healthData.systemHealth.overallStatus.toUpperCase()}
          </CardTitle>
          <CardDescription>
            Last updated: {new Date(healthData.timestamp).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {healthData.systemHealth.activeIssues.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2">Active Issues:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {healthData.systemHealth.activeIssues.map((issue, index) => (
                    <li key={index} className="text-sm text-red-700">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div>
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <ul className="list-disc list-inside space-y-1">
                {healthData.systemHealth.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-700">{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Circuit Breakers */}
      <Card>
        <CardHeader>
          <CardTitle>Circuit Breakers</CardTitle>
          <CardDescription>
            Real-time status of external service circuit breakers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(healthData.circuitBreakers).map(([service, metrics]) => (
              <Card key={service}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    {service.replace('_', ' ').toUpperCase()}
                    <Badge className={getStateColor(metrics.state)}>
                      {metrics.state.replace('_', ' ')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm space-y-1">
                    <div>Total Calls: {metrics.totalCalls}</div>
                    <div>Successes: {metrics.successes}</div>
                    <div>Failures: {metrics.failures}</div>
                    {metrics.failures > 0 && (
                      <div className="text-red-600">
                        Success Rate: {Math.round((metrics.successes / metrics.totalCalls) * 100)}%
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => controlCircuitBreaker(service, 'close')}
                      disabled={metrics.state === 'closed'}
                    >
                      Close
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => controlCircuitBreaker(service, 'open')}
                      disabled={metrics.state === 'open'}
                    >
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Degradation Status */}
      {healthData.degradation.currentLevel > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">System Degradation Active</CardTitle>
            <CardDescription>
              Level {healthData.degradation.currentLevel} - {healthData.degradation.reason}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <h4 className="font-medium mb-2">Affected Operations:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {healthData.degradation.affectedOperations.map((op, index) => (
                    <li key={index} className="text-sm">{op}</li>
                  ))}
                </ul>
              </div>
              
              <div className="text-sm text-gray-600">
                Active for: {Math.round(healthData.degradation.uptime / 1000 / 60)} minutes
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button onClick={fetchHealthData} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>
    </div>
  );
}
