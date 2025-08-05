"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle, Server, Database, Zap } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'checking' | 'unknown'
  responseTime?: number
  error?: string
  lastChecked?: Date
}

interface EndpointStatus {
  name: string
  endpoint: string
  status: HealthStatus
  description: string
}

export default function BackendStatus() {
  const [overallStatus, setOverallStatus] = useState<HealthStatus>({ status: 'unknown' })
  const [endpoints, setEndpoints] = useState<EndpointStatus[]>([
    { name: 'Health Check', endpoint: '/health', status: { status: 'unknown' }, description: 'Basic connectivity test' },
    { name: 'Chat API', endpoint: '/chat', status: { status: 'unknown' }, description: 'AI conversation endpoint' },
    { name: 'Documents', endpoint: '/documents', status: { status: 'unknown' }, description: 'Document management' },
    { name: 'Upload', endpoint: '/documents/upload', status: { status: 'unknown' }, description: 'File upload service' },
    { name: 'Conversations', endpoint: '/conversations', status: { status: 'unknown' }, description: 'Chat history management' }
  ])
  const [isManualRefresh, setIsManualRefresh] = useState(false)

  // Check overall backend health
  const checkOverallHealth = async () => {
    setOverallStatus(prev => ({ ...prev, status: 'checking' }))
    
    try {
      const startTime = Date.now()
      const isHealthy = await apiClient.checkBackendHealth()
      const responseTime = Date.now() - startTime
      
      setOverallStatus({
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        lastChecked: new Date(),
        error: isHealthy ? undefined : 'Backend health check failed'
      })
    } catch (error) {
      setOverallStatus({
        status: 'unhealthy',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Check specific endpoint
  const checkEndpoint = async (endpoint: EndpointStatus, index: number) => {
    setEndpoints(prev => prev.map((ep, i) => 
      i === index ? { ...ep, status: { status: 'checking' } } : ep
    ))

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.docsflow.app/api'
    
    try {
      const startTime = Date.now()
      let response: Response
      
      // Different request methods for different endpoints
      switch (endpoint.endpoint) {
        case '/health':
          response = await fetch(`${API_BASE_URL}${endpoint.endpoint}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
          break
        case '/chat':
          response = await fetch(`${API_BASE_URL}${endpoint.endpoint}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: 'Health check test' }),
          })
          break
        case '/documents':
          response = await fetch(`${API_BASE_URL}${endpoint.endpoint}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
          break
        case '/conversations':
          response = await fetch(`${API_BASE_URL}${endpoint.endpoint}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
          break
        default:
          response = await fetch(`${API_BASE_URL}${endpoint.endpoint}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
      }
      
      const responseTime = Date.now() - startTime
      
      setEndpoints(prev => prev.map((ep, i) => 
        i === index ? {
          ...ep,
          status: {
            status: response.ok ? 'healthy' : 'unhealthy',
            responseTime,
            lastChecked: new Date(),
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
          }
        } : ep
      ))
    } catch (error) {
      setEndpoints(prev => prev.map((ep, i) => 
        i === index ? {
          ...ep,
          status: {
            status: 'unhealthy',
            lastChecked: new Date(),
            error: error instanceof Error ? error.message : 'Network error'
          }
        } : ep
      ))
    }
  }

  // Check all endpoints
  const checkAllEndpoints = async () => {
    setIsManualRefresh(true)
    await checkOverallHealth()
    
    // Check endpoints in parallel
    await Promise.all(
      endpoints.map((endpoint, index) => checkEndpoint(endpoint, index))
    )
    
    setIsManualRefresh(false)
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    // Batch initialization operations
    const initializeComponent = async () => {
      await checkAllEndpoints()
    }

    // Use requestAnimationFrame to prevent forced reflow
    requestAnimationFrame(() => {
      initializeComponent()
    })
  }, [])

  // Get status icon
  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'checking':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  // Get status badge variant
  const getStatusVariant = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'default'
      case 'unhealthy':
        return 'destructive'
      case 'checking':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Backend Status
            </CardTitle>
            <CardDescription>
              Real-time monitoring of API connectivity and services
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkAllEndpoints}
            disabled={isManualRefresh}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isManualRefresh ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Status */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {getStatusIcon(overallStatus.status)}
            <div>
              <p className="font-medium">Overall Backend Health</p>
              <p className="text-sm text-muted-foreground">
                {overallStatus.lastChecked 
                  ? `Last checked: ${new Date(overallStatus.lastChecked).toLocaleTimeString()}`
                  : 'Not checked yet'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={getStatusVariant(overallStatus.status)}>
              {overallStatus.status === 'checking' ? 'Checking...' : 
               overallStatus.status === 'healthy' ? 'Healthy' :
               overallStatus.status === 'unhealthy' ? 'Unhealthy' : 'Unknown'}
            </Badge>
            {overallStatus.responseTime && (
              <p className="text-xs text-muted-foreground mt-1">
                {overallStatus.responseTime}ms
              </p>
            )}
          </div>
        </div>

        {/* API Configuration */}
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Configuration
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Base URL:</span>
              <code className="bg-muted px-2 py-1 rounded text-xs">
                {process.env.NEXT_PUBLIC_API_URL || 'https://api.docsflow.app/api'}
              </code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment:</span>
              <Badge variant="outline">
                {process.env.NODE_ENV || 'development'}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Individual Endpoints */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Database className="h-4 w-4" />
            API Endpoints
          </h4>
          <div className="space-y-3">
            {endpoints.map((endpoint, index) => (
              <div key={endpoint.endpoint} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(endpoint.status.status)}
                  <div>
                    <p className="font-medium">{endpoint.name}</p>
                    <p className="text-xs text-muted-foreground">{endpoint.description}</p>
                    <code className="text-xs bg-muted px-1 rounded">{endpoint.endpoint}</code>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={getStatusVariant(endpoint.status.status)} className="mb-1">
                    {endpoint.status.status === 'checking' ? 'Testing...' :
                     endpoint.status.status === 'healthy' ? 'Working' :
                     endpoint.status.status === 'unhealthy' ? 'Failed' : 'Unknown'}
                  </Badge>
                  {endpoint.status.responseTime && (
                    <p className="text-xs text-muted-foreground">
                      {endpoint.status.responseTime}ms
                    </p>
                  )}
                  {endpoint.status.error && (
                    <p className="text-xs text-red-600 max-w-48 truncate" title={endpoint.status.error}>
                      {endpoint.status.error}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="font-medium mb-3">Quick Tests</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => checkEndpoint(endpoints[1], 1)}
              disabled={endpoints[1].status.status === 'checking'}
            >
              Test Chat API
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => checkEndpoint(endpoints[2], 2)}
              disabled={endpoints[2].status.status === 'checking'}
            >
              Test Documents
            </Button>
          </div>
        </div>

        {/* Error Summary */}
        {overallStatus.error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">Backend Error</p>
            <p className="text-xs text-red-700 dark:text-red-300">{overallStatus.error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 