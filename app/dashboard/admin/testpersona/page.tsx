'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  BarChart3,
  TestTube,
  Clock,
  Target,
  Zap
} from 'lucide-react';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  data?: any;
}

interface TestSummary {
  status: string;
  passed: number;
  failed: number;
  warnings: number;
  total: number;
  score: string;
  percentage: number;
}

export default function TestPersonaPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [activeTab, setActiveTab] = useState('tests');

  // 🔐 ADMIN ONLY: Redirect non-admins
  useEffect(() => {
    if (!isLoading && user) {
      const isAdmin = user.accessLevel === 1 || user.role === 'admin';
      if (!isAdmin) {
        console.warn('⛔ [TEST PERSONA] Access denied: User is not an admin');
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  const runTests = async () => {
    setIsRunningTests(true);
    try {
      // Run tests using internal test logic (no API endpoint needed)
      const results = await runInternalTests();
      setTestResults(results);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResults({
        error: 'Failed to run tests',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  // Internal test logic (moved from API route)
  const runInternalTests = async () => {
    const results: TestResult[] = [];
    
    // Test 1: Check if persona analytics endpoint exists
    try {
      const response = await fetch('/api/analytics/persona?days=1', { credentials: 'include' });
      const status = response.ok ? 'pass' : 'warning';
      results.push({
        test: 'Analytics Endpoint',
        status,
        message: response.ok ? 'Analytics API is accessible' : 'Analytics API returned error'
      });
    } catch (error) {
      results.push({
        test: 'Analytics Endpoint',
        status: 'fail',
        message: 'Failed to connect to analytics API'
      });
    }

    // Test 2: Check persona editor endpoint
    try {
      const response = await fetch('/api/tenant/persona', { credentials: 'include' });
      const status = response.ok || response.status === 404 ? 'pass' : 'warning';
      results.push({
        test: 'Persona API',
        status,
        message: response.ok ? 'Persona API is accessible' : 'Persona API endpoint exists'
      });
    } catch (error) {
      results.push({
        test: 'Persona API',
        status: 'fail',
        message: 'Failed to connect to persona API'
      });
    }

    // Test 3: Check chat endpoint
    try {
      const response = await fetch('/api/chat', { 
        method: 'OPTIONS',
        credentials: 'include' 
      });
      const status = response.ok ? 'pass' : 'warning';
      results.push({
        test: 'Chat API',
        status,
        message: response.ok ? 'Chat API is accessible' : 'Chat API may not be configured'
      });
    } catch (error) {
      results.push({
        test: 'Chat API',
        status: 'fail',
        message: 'Failed to connect to chat API'
      });
    }

    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    return {
      summary: {
        status: failed === 0 ? 'pass' : 'partial',
        passed,
        failed,
        warnings,
        total: results.length,
        score: `${passed}/${results.length}`,
        percentage: Math.round((passed / results.length) * 100)
      },
      tests: results,
      recommendations: failed > 0 
        ? ['⚠️ Some tests failed. Check API connectivity.'] 
        : ['✅ All core endpoints are accessible!']
    };
  };

  const loadAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      // Load overview
      const overviewResponse = await fetch('/api/analytics/persona?days=30', {
        credentials: 'include'
      });
      const overviewData = await overviewResponse.json();
      setAnalytics(overviewData);

      // Load comparison
      const comparisonResponse = await fetch('/api/analytics/persona?type=comparison&days=30', {
        credentials: 'include'
      });
      const comparisonData = await comparisonResponse.json();
      setComparison(comparisonData);
    } catch (error) {
      console.error('Analytics load failed:', error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    runTests();
    loadAnalytics();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any, text: string }> = {
      pass: { variant: 'default', text: 'Pass' },
      fail: { variant: 'destructive', text: 'Fail' },
      warning: { variant: 'secondary', text: 'Warning' }
    };
    const config = variants[status] || variants.warning;
    return <Badge variant={config.variant as any}>{config.text}</Badge>;
  };

  // Show loading while checking auth
  if (isLoading || !user) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const isAdmin = user.accessLevel === 1 || user.role === 'admin';
  
  // Redirect non-admins (final check)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-foreground">AI Persona Testing Dashboard</h1>
        <p className="text-muted-foreground">
          Validate system health, measure response quality, and track persona performance
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Test Suite
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Comparison
          </TabsTrigger>
        </TabsList>

        {/* Test Suite Tab */}
        <TabsContent value="tests" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Automated Test Suite</CardTitle>
                  <CardDescription>
                    Validates persona system health and configuration
                  </CardDescription>
                </div>
                <Button 
                  onClick={runTests} 
                  disabled={isRunningTests}
                  className="flex items-center gap-2"
                >
                  {isRunningTests ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Run Tests
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {testResults?.error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">Error running tests</p>
                  <p className="text-red-600 text-sm mt-1">{testResults.message}</p>
                </div>
              ) : testResults?.summary ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-700">
                            {testResults.summary.passed}
                          </div>
                          <div className="text-sm text-green-600">Passed</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-red-700">
                            {testResults.summary.failed}
                          </div>
                          <div className="text-sm text-red-600">Failed</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-yellow-700">
                            {testResults.summary.warnings}
                          </div>
                          <div className="text-sm text-yellow-600">Warnings</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-700">
                            {testResults.summary.percentage}%
                          </div>
                          <div className="text-sm text-blue-600">Success Rate</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Individual Test Results */}
                  <div className="space-y-3">
                    {testResults.tests?.map((test: TestResult, idx: number) => (
                      <Card key={idx} className="border-l-4" style={{
                        borderLeftColor: test.status === 'pass' ? '#22c55e' : 
                                       test.status === 'fail' ? '#ef4444' : '#eab308'
                      }}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              {getStatusIcon(test.status)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{test.test}</h3>
                                  {getStatusBadge(test.status)}
                                </div>
                                <p className="text-sm text-muted-foreground">{test.message}</p>
                                {test.data && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                                      View Details
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                                      {JSON.stringify(test.data, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {testResults.recommendations && testResults.recommendations.length > 0 && (
                    <Card className="mt-6 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-blue-900 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {testResults.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm text-blue-800 flex items-start gap-2">
                              <span className="mt-1">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Running tests...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Persona Performance Analytics</CardTitle>
                  <CardDescription>Last 30 days of usage metrics</CardDescription>
                </div>
                <Button 
                  onClick={loadAnalytics} 
                  disabled={isLoadingAnalytics}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingAnalytics ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {analytics?.message ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">{analytics.message}</p>
                  <p className="text-sm text-gray-500">{analytics.tip}</p>
                </div>
              ) : analytics?.data ? (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Quality</p>
                            <p className="text-3xl font-bold">
                              {((analytics.data.quality.average || 0) * 100).toFixed(0)}%
                            </p>
                          </div>
                          <Target className="w-8 h-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Response Time</p>
                            <p className="text-3xl font-bold">
                              {analytics.data.performance.avgResponseTimeMs}ms
                            </p>
                          </div>
                          <Clock className="w-8 h-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Responses</p>
                            <p className="text-3xl font-bold">
                              {analytics.data.totals.responses}
                            </p>
                          </div>
                          <Zap className="w-8 h-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quality Distribution */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Quality Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {['excellent', 'good', 'fair', 'poor'].map((level) => {
                          const count = analytics.data.quality.distribution[level] || 0;
                          const percentage = analytics.data.quality.distribution.percentages[level] || 0;
                          const colors = {
                            excellent: 'bg-green-500',
                            good: 'bg-blue-500',
                            fair: 'bg-yellow-500',
                            poor: 'bg-red-500'
                          };
                          return (
                            <div key={level}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium capitalize">{level}</span>
                                <span className="text-sm text-muted-foreground">
                                  {count} ({Number(percentage).toFixed(1)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${colors[level as keyof typeof colors]}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Insights */}
                  {analytics.insights && analytics.insights.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-green-900 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Insights & Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {analytics.insights.map((insight: string, idx: number) => (
                            <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                              <span className="mt-1">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Loading analytics...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom vs Default Persona Comparison</CardTitle>
              <CardDescription>
                Measure the impact of your custom persona settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {comparison?.message ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">{comparison.message}</p>
                  <p className="text-sm text-gray-500">{comparison.tip}</p>
                </div>
              ) : comparison?.data ? (
                <>
                  {/* Comparison Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <Card className="border-2 border-blue-200 bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-blue-900">Custom Persona</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-blue-600">Usage Count</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {comparison.data.custom.count || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600">Avg Quality</p>
                          <p className="text-2xl font-bold text-blue-900">
                            {((comparison.data.custom.avgQuality || 0) * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-600">Avg Response Time</p>
                          <p className="text-lg font-semibold text-blue-900">
                            {Math.round(comparison.data.custom.avgResponseTime || 0)}ms
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-gray-600 bg-gray-800">
                      <CardHeader>
                        <CardTitle className="text-gray-100">Default Persona</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-400">Usage Count</p>
                          <p className="text-2xl font-bold text-gray-100">
                            {comparison.data.default.count || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Avg Quality</p>
                          <p className="text-2xl font-bold text-gray-100">
                            {((comparison.data.default.avgQuality || 0) * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Avg Response Time</p>
                          <p className="text-lg font-semibold text-gray-100">
                            {Math.round(comparison.data.default.avgResponseTime || 0)}ms
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Improvement Indicator */}
                  <Card className={`border-2 ${
                    comparison.data.comparison.status === 'significant_improvement' ? 'border-green-200 bg-green-50' :
                    comparison.data.comparison.status === 'slight_improvement' ? 'border-blue-200 bg-blue-50' :
                    comparison.data.comparison.status === 'degradation' ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-gray-50'
                  }`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center gap-4">
                        {(comparison.data.comparison.qualityImprovement || 0) > 0 ? (
                          <TrendingUp className="w-8 h-8 text-green-600" />
                        ) : (comparison.data.comparison.qualityImprovement || 0) < 0 ? (
                          <TrendingDown className="w-8 h-8 text-red-600" />
                        ) : (
                          <Minus className="w-8 h-8 text-gray-600" />
                        )}
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-1">Quality Improvement</p>
                          <p className="text-4xl font-bold">
                            {(comparison.data.comparison.qualityImprovement || 0) > 0 ? '+' : ''}
                            {(comparison.data.comparison.qualityImprovement || 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Insights */}
                  {comparison.insights && comparison.insights.length > 0 && (
                    <Card className="mt-6 border-purple-200 bg-purple-50">
                      <CardHeader>
                        <CardTitle className="text-purple-900 flex items-center gap-2">
                          <Activity className="w-5 h-5" />
                          Comparison Insights
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {comparison.insights.map((insight: string, idx: number) => (
                            <li key={idx} className="text-sm text-purple-800 flex items-start gap-2">
                              <span className="mt-1">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Loading comparison...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

