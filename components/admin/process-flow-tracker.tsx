"use client"

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Upload, 
  FileText, 
  Scissors, 
  Zap, 
  Database, 
  Search, 
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcessStep {
  id: string;
  name: string;
  icon: React.ElementType;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  duration?: number;
  avgDuration?: number;
  maxDuration?: number;
  successRate?: number;
  details?: string;
}

interface ProcessMetrics {
  upload: {
    avg: number;
    max: number;
    successRate: number;
    recentJobs: number;
  };
  vision_ocr: {
    avg: number;
    max: number;
    successRate: number;
    slowJobs: number; // Jobs over 30s
  };
  parsing: {
    avg: number;
    max: number;
    successRate: number;
  };
  chunking: {
    avg: number;
    max: number;
    avgChunks: number;
  };
  embeddings: {
    avg: number;
    max: number;
    successRate: number;
    avgPerChunk: number;
  };
  pinecone: {
    avg: number;
    max: number;
    successRate: number;
    timeouts: number;
  };
  query: {
    avg: number;
    max: number;
    avgScore: number;
  };
  llm: {
    avg: number;
    max: number;
    successRate: number;
    fallbackRate: number;
  };
}

export default function ProcessFlowTracker() {
  const [metrics, setMetrics] = useState<ProcessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hasRealData, setHasRealData] = useState(false);
  const [jobCount, setJobCount] = useState(0);

  useEffect(() => {
    loadMetrics();
    
    // Listen for upload events to trigger refresh
    const handleUploadComplete = () => {
      console.log('[Process Tracker] Upload detected, refreshing metrics...');
      loadMetrics();
    };
    
    window.addEventListener('documentUploaded', handleUploadComplete);
    window.addEventListener('documentProcessed', handleUploadComplete);
    
    return () => {
      window.removeEventListener('documentUploaded', handleUploadComplete);
      window.removeEventListener('documentProcessed', handleUploadComplete);
    };
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/process-metrics');
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
        setHasRealData(data.hasRealData || false);
        setJobCount(data.jobCount || 0);
        setLastUpdated(new Date());
      } else {
        // Mock data for development
        console.warn('[Process Tracker] API failed, using mock data');
        setMetrics({
          upload: { avg: 1500, max: 3000, successRate: 98, recentJobs: 45 },
          vision_ocr: { avg: 8500, max: 58000, successRate: 92, slowJobs: 12 },
          parsing: { avg: 450, max: 1200, successRate: 99 },
          chunking: { avg: 180, max: 500, avgChunks: 6.5 },
          embeddings: { avg: 1450, max: 3200, successRate: 97, avgPerChunk: 235 },
          pinecone: { avg: 2800, max: 62000, successRate: 89, timeouts: 8 },
          query: { avg: 850, max: 2100, avgScore: 0.42 },
          llm: { avg: 4200, max: 9500, successRate: 96, fallbackRate: 12 },
        });
        setHasRealData(false);
        setJobCount(0);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load process metrics:', error);
      setHasRealData(false);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return 'text-red-600 bg-red-50 border-red-200';
    if (value >= thresholds.warning) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusIcon = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return <XCircle className="h-4 w-4" />;
    if (value >= thresholds.warning) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const processSteps: ProcessStep[] = metrics ? [
    {
      id: 'upload',
      name: 'File Upload',
      icon: Upload,
      status: metrics.upload.successRate >= 95 ? 'success' : 'warning',
      duration: metrics.upload.avg,
      maxDuration: metrics.upload.max,
      successRate: metrics.upload.successRate,
      details: `${metrics.upload.recentJobs} jobs (last 24h)`,
    },
    {
      id: 'vision_ocr',
      name: 'Vision OCR (Images)',
      icon: FileText,
      status: metrics.vision_ocr.max > 30000 ? 'error' : metrics.vision_ocr.max > 15000 ? 'warning' : 'success',
      duration: metrics.vision_ocr.avg,
      maxDuration: metrics.vision_ocr.max,
      successRate: metrics.vision_ocr.successRate,
      details: `${metrics.vision_ocr.slowJobs} slow jobs (>30s)`,
    },
    {
      id: 'parsing',
      name: 'Document Parsing',
      icon: FileText,
      status: metrics.parsing.successRate >= 98 ? 'success' : 'warning',
      duration: metrics.parsing.avg,
      maxDuration: metrics.parsing.max,
      successRate: metrics.parsing.successRate,
    },
    {
      id: 'chunking',
      name: 'Text Chunking',
      icon: Scissors,
      status: 'success',
      duration: metrics.chunking.avg,
      maxDuration: metrics.chunking.max,
      details: `Avg ${metrics.chunking.avgChunks} chunks/doc`,
    },
    {
      id: 'embeddings',
      name: 'Generate Embeddings',
      icon: Zap,
      status: metrics.embeddings.successRate >= 95 ? 'success' : 'warning',
      duration: metrics.embeddings.avg,
      maxDuration: metrics.embeddings.max,
      successRate: metrics.embeddings.successRate,
      details: `${metrics.embeddings.avgPerChunk}ms per chunk`,
    },
    {
      id: 'pinecone',
      name: 'Pinecone Upsert',
      icon: Database,
      status: metrics.pinecone.timeouts > 0 ? 'error' : metrics.pinecone.successRate >= 95 ? 'success' : 'warning',
      duration: metrics.pinecone.avg,
      maxDuration: metrics.pinecone.max,
      successRate: metrics.pinecone.successRate,
      details: `${metrics.pinecone.timeouts} timeouts`,
    },
    {
      id: 'query',
      name: 'Semantic Query',
      icon: Search,
      status: metrics.query.avgScore >= 0.3 ? 'success' : 'warning',
      duration: metrics.query.avg,
      maxDuration: metrics.query.max,
      details: `Avg score: ${metrics.query.avgScore.toFixed(2)}`,
    },
    {
      id: 'llm',
      name: 'LLM Generation',
      icon: Brain,
      status: metrics.llm.successRate >= 95 ? 'success' : 'warning',
      duration: metrics.llm.avg,
      maxDuration: metrics.llm.max,
      successRate: metrics.llm.successRate,
      details: `${metrics.llm.fallbackRate}% fallback rate`,
    },
  ] : [];

  if (loading && !metrics) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const totalAvgTime = processSteps.reduce((sum, step) => sum + (step.duration || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Avg Time</p>
                <p className="text-2xl font-bold">{(totalAvgTime / 1000).toFixed(1)}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Bottleneck</p>
                <p className="text-2xl font-bold">
                  {metrics?.vision_ocr.max! > 30000 ? 'Vision OCR' : 'Pinecone'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {Math.round((processSteps.reduce((sum, s) => sum + (s.successRate || 100), 0) / processSteps.length))}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold">
                  {(metrics?.vision_ocr.slowJobs || 0) + (metrics?.pinecone.timeouts || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process Flow Visualization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Document Processing Pipeline
              </CardTitle>
              <CardDescription>
                Triggered automatically on document upload • Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadMetrics}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {processSteps.map((step, index) => (
              <Card 
                key={step.id}
                className={cn(
                  "border-2 transition-all hover:shadow-lg",
                  step.status === 'success' && "border-green-200 bg-green-50/50",
                  step.status === 'warning' && "border-yellow-200 bg-yellow-50/50",
                  step.status === 'error' && "border-red-200 bg-red-50/50"
                )}
              >
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <step.icon className={cn(
                          "h-5 w-5",
                          step.status === 'success' && "text-green-600",
                          step.status === 'warning' && "text-yellow-600",
                          step.status === 'error' && "text-red-600"
                        )} />
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        step.status === 'success' && "border-green-600 text-green-700",
                        step.status === 'warning' && "border-yellow-600 text-yellow-700",
                        step.status === 'error' && "border-red-600 text-red-700"
                      )}>
                        {step.status === 'success' && '✓'}
                        {step.status === 'warning' && '⚠'}
                        {step.status === 'error' && '✗'}
                      </Badge>
                    </div>

                    {/* Name */}
                    <h4 className="font-semibold text-sm">{step.name}</h4>

                    {/* Timing */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Avg Time</span>
                        <span className="font-mono font-medium">
                          {step.duration! >= 1000 
                            ? `${(step.duration! / 1000).toFixed(1)}s`
                            : `${step.duration}ms`
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Max Time</span>
                        <span className={cn(
                          "font-mono font-medium",
                          step.id === 'vision_ocr' && step.maxDuration! > 30000 && "text-red-600",
                          step.id === 'pinecone' && step.maxDuration! > 30000 && "text-red-600"
                        )}>
                          {step.maxDuration! >= 1000 
                            ? `${(step.maxDuration! / 1000).toFixed(1)}s`
                            : `${step.maxDuration}ms`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <Progress 
                      value={Math.min((step.duration! / (step.maxDuration! || 1)) * 100, 100)} 
                      className={cn(
                        "h-1.5",
                        step.status === 'success' && "[&>div]:bg-green-600",
                        step.status === 'warning' && "[&>div]:bg-yellow-600",
                        step.status === 'error' && "[&>div]:bg-red-600"
                      )}
                    />

                    {/* Details */}
                    {step.successRate !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Success Rate</span>
                        <span className="font-medium">{step.successRate}%</span>
                      </div>
                    )}

                    {step.details && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {step.details}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Critical Issues Alert */}
          {(metrics?.vision_ocr.slowJobs! > 0 || metrics?.pinecone.timeouts! > 0) && (
            <div className="mt-6 p-4 border-l-4 border-red-500 bg-red-50 rounded">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900">Performance Issues Detected</h4>
                  <ul className="mt-2 space-y-1 text-sm text-red-800">
                    {metrics?.vision_ocr.slowJobs! > 0 && (
                      <li>
                        • Vision OCR: {metrics?.vision_ocr.slowJobs} jobs exceeded 30s timeout
                        <span className="text-xs ml-2">(Max: {(metrics?.vision_ocr.max! / 1000).toFixed(1)}s)</span>
                      </li>
                    )}
                    {metrics?.pinecone.timeouts! > 0 && (
                      <li>
                        • Pinecone Upsert: {metrics?.pinecone.timeouts} timeouts
                        <span className="text-xs ml-2">(Max: {(metrics?.pinecone.max! / 1000).toFixed(1)}s)</span>
                      </li>
                    )}
                  </ul>
                  <p className="mt-3 text-sm text-red-700 font-medium">
                    💡 Recommendation: Consider switching to faster Vision model or increasing worker timeout
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Data Source Info */}
          {!hasRealData ? (
            <div className="mt-4 p-3 border border-yellow-200 bg-yellow-50 rounded text-sm text-yellow-800">
              ⚠️ Currently showing sample data. Real-time metrics will be available once documents are processed.
            </div>
          ) : (
            <div className="mt-4 p-3 border border-green-200 bg-green-50 rounded text-sm text-green-800">
              ✅ Showing real metrics from {jobCount} processing jobs (last 24h)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
