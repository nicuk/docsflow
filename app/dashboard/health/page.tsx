'use client';

import { SystemHealthMonitor } from '@/components/system-health-monitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity } from 'lucide-react';
import Link from 'next/link';

export default function SystemHealthPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6" />
              <h1 className="text-2xl font-bold">System Health</h1>
            </div>
            <p className="text-muted-foreground">
              Real-time monitoring of circuit breakers and system degradation
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Health Monitor */}
        <SystemHealthMonitor />

        {/* Usage Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use This Monitor</CardTitle>
            <CardDescription>
              Understanding circuit breakers and degradation levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Circuit Breaker States:</h4>
              <ul className="space-y-1 text-sm">
                <li><span className="font-medium text-green-600">CLOSED:</span> Normal operation - all requests passing through</li>
                <li><span className="font-medium text-yellow-600">HALF-OPEN:</span> Testing recovery - limited requests allowed</li>
                <li><span className="font-medium text-red-600">OPEN:</span> Failing fast - requests blocked to prevent cascade failures</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Degradation Levels:</h4>
              <ul className="space-y-1 text-sm">
                <li><span className="font-medium">Level 0:</span> Normal operation</li>
                <li><span className="font-medium">Level 1:</span> AI cache only - using cached responses</li>
                <li><span className="font-medium">Level 2:</span> Static responses - pre-canned answers only</li>
                <li><span className="font-medium">Level 3:</span> Read-only mode - no mutations allowed</li>
                <li><span className="font-medium">Level 4:</span> Maintenance mode - system unavailable</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Manual Controls:</h4>
              <p className="text-sm">
                Use the CLOSE/OPEN buttons to manually control circuit breakers during maintenance. 
                The system will automatically attempt recovery when services become available again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
