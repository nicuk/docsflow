"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api-client'

export default function TestAPIPage() {
  const [healthStatus, setHealthStatus] = useState<string>('Not tested')
  const [chatResponse, setChatResponse] = useState<string>('')
  const [message, setMessage] = useState<string>('Hello, can you help me?')
  const [loading, setLoading] = useState<boolean>(false)

  const isProduction = process.env.NODE_ENV === 'production'
  const apiUrl = isProduction ? '/api/proxy' : 'https://api.docsflow.app'

  const testHealthCheck = async () => {
    setLoading(true)
    try {
      const result = await apiClient.healthCheck()
      setHealthStatus(`✅ Backend Connected: ${result.status} at ${result.timestamp}`)
    } catch (error) {
      setHealthStatus(`❌ Backend Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  const testChat = async () => {
    setLoading(true)
    try {
      const result = await apiClient.sendMessage({ message })
      setChatResponse(`✅ Chat Response: ${result.answer}
      
Sources: ${result.sources?.length || 0} documents found
Confidence: ${result.confidence ? (result.confidence * 100).toFixed(1) : 'N/A'}%
Response Time: ${result.responseTime || 'N/A'}ms`)
    } catch (error) {
      setChatResponse(`❌ Chat Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Backend API Connection Test</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Configuration Status
              <Badge variant={isProduction ? "default" : "secondary"}>
                {isProduction ? "Production" : "Development"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <strong>Environment:</strong> {isProduction ? "Production" : "Development"}
            </p>
            <p className="text-sm">
              <strong>API Base URL:</strong> <code>{apiUrl}</code>
            </p>
            <p className="text-sm">
              <strong>Backend Target:</strong> <code>https://api.docsflow.app</code>
            </p>
            <p className="text-sm">
              <strong>CORS Solution:</strong> {isProduction ? "Next.js Proxy" : "Direct Connection"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health Check Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testHealthCheck} disabled={loading}>
              {loading ? 'Testing...' : 'Test Backend Connection'}
            </Button>
            <p className="text-sm">{healthStatus}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat API Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter test message"
            />
            <Button onClick={testChat} disabled={loading}>
              {loading ? 'Sending...' : 'Test Chat API'}
            </Button>
            <p className="text-sm whitespace-pre-wrap">{chatResponse}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              If health check fails with CORS error, the proxy configuration will handle it automatically.
            </p>
            <p className="text-xs text-muted-foreground">
              Frontend Domain: {typeof window !== 'undefined' ? window.location.origin : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 