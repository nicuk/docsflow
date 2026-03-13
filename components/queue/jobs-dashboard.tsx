/**
 * Jobs Dashboard Component
 * 
 * Displays and manages ingestion jobs for document processing.
 * Features:
 * - Real-time job status
 * - Filtering by status
 * - Retry failed jobs
 * - Job statistics
 * - Duration tracking
 */

"use client";

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { IngestionJob, JobStatus, JobStats } from '@/lib/queue';
import { 
  JOB_STATUS, 
  formatDuration, 
  getProcessingDuration,
  formatFileSize
} from '@/lib/queue';

// =====================================================
// COMPONENT
// =====================================================

export function JobsDashboard() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // =====================================================
  // DATA FETCHING
  // =====================================================

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/queue/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      
      const data = await response.json();
      setJobs(data.jobs || []);
      setStats(data.stats || null);
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (error) {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchJobs();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // =====================================================
  // ACTIONS
  // =====================================================

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchJobs();
  };

  const handleRetry = async (jobId: string) => {
    try {
      const response = await fetch('/api/queue/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId })
      });

      if (!response.ok) throw new Error('Failed to retry job');
      
      await fetchJobs();
    } catch (error) {
      alert('Failed to retry job');
    }
  };

  // =====================================================
  // FILTERING
  // =====================================================

  const filteredJobs = filter === 'all' 
    ? jobs 
    : jobs.filter(job => job.status === filter);

  // =====================================================
  // RENDER
  // =====================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && <JobsStatistics stats={stats} />}

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Processing Jobs</CardTitle>
            
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as JobStatus | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={JOB_STATUS.PENDING}>Pending</SelectItem>
                  <SelectItem value={JOB_STATUS.PROCESSING}>Processing</SelectItem>
                  <SelectItem value={JOB_STATUS.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={JOB_STATUS.FAILED}>Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No jobs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map(job => (
                  <JobRow 
                    key={job.id} 
                    job={job} 
                    onRetry={handleRetry}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// STATISTICS COMPONENT
// =====================================================

interface JobsStatisticsProps {
  stats: JobStats;
}

function JobsStatistics({ stats }: JobsStatisticsProps) {
  const statCards = [
    {
      label: 'Total',
      value: stats.total_jobs,
      icon: Clock,
      color: 'text-gray-600'
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      label: 'Processing',
      value: stats.processing,
      icon: Loader2,
      color: 'text-blue-600'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stat.value}
                </p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =====================================================
// JOB ROW COMPONENT
// =====================================================

interface JobRowProps {
  job: IngestionJob;
  onRetry: (jobId: string) => void;
}

function JobRow({ job, onRetry }: JobRowProps) {
  const getStatusBadge = (status: JobStatus) => {
    const variants: Record<JobStatus, {
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: React.ElementType;
    }> = {
      pending: { variant: "secondary", icon: Clock },
      processing: { variant: "default", icon: Loader2 },
      completed: { variant: "outline", icon: CheckCircle2 },
      failed: { variant: "destructive", icon: AlertCircle },
      cancelled: { variant: "outline", icon: XCircle }
    };

    const config = variants[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const duration = getProcessingDuration(job);
  const createdAt = new Date(job.created_at);

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div>
          <p className="truncate max-w-xs">{job.filename}</p>
          {job.error_message && (
            <p className="text-xs text-red-500 truncate max-w-xs mt-1">
              {job.error_message}
            </p>
          )}
        </div>
      </TableCell>

      <TableCell>
        {getStatusBadge(job.status)}
      </TableCell>

      <TableCell>
        <span className={job.attempts >= job.max_attempts ? 'text-red-500' : ''}>
          {job.attempts}/{job.max_attempts}
        </span>
      </TableCell>

      <TableCell>
        {job.file_size ? formatFileSize(job.file_size) : 'N/A'}
      </TableCell>

      <TableCell>
        {formatDuration(duration)}
      </TableCell>

      <TableCell>
        <span className="text-xs text-gray-500">
          {createdAt.toLocaleString()}
        </span>
      </TableCell>

      <TableCell>
        {job.status === JOB_STATUS.FAILED && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRetry(job.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

