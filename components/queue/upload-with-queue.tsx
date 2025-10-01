/**
 * Queue-Based Upload Component
 * 
 * Handles file uploads using presigned URLs and job queue system.
 * Features:
 * - Concurrent upload control with p-limit
 * - Direct-to-storage uploads (bypasses API)
 * - Automatic job enqueuing
 * - Progress tracking
 * - Error handling with retry
 */

"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import pLimit from 'p-limit';
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { 
  DEFAULT_UPLOAD_CONFIG,
  type UploadProgress,
  formatFileSize 
} from '@/lib/queue';

// =====================================================
// CONFIGURATION
// =====================================================

const CONCURRENT_UPLOADS = 4; // Process 4 files at once
const limit = pLimit(CONCURRENT_UPLOADS);

// =====================================================
// COMPONENT
// =====================================================

interface UploadWithQueueProps {
  onUploadComplete?: (jobIds: string[]) => void;
  onUploadError?: (errors: Array<{ filename: string; error: string }>) => void;
}

export function UploadWithQueue({ 
  onUploadComplete, 
  onUploadError 
}: UploadWithQueueProps) {
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  // =====================================================
  // UPLOAD HANDLER
  // =====================================================

  const handleFilesUpload = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    // Validate file count
    if (files.length > 5) {
      alert('Maximum 5 files can be uploaded at once');
      return;
    }
    
    setIsUploading(true);
    
    // Initialize progress tracking
    const progressMap = new Map<string, UploadProgress>();
    files.forEach(file => {
      progressMap.set(file.name, {
        file_name: file.name,
        status: 'uploading',
        progress: 0
      });
    });
    setUploadProgress(progressMap);
    
    // Process files with concurrency limit
    const results = await Promise.allSettled(
      files.map(file => 
        limit(() => uploadFile(file, progressMap, setUploadProgress))
      )
    );
    
    // Collect results
    const jobIds: string[] = [];
    const errors: Array<{ filename: string; error: string }> = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        jobIds.push(result.value.jobId!);
      } else {
        const error = result.status === 'rejected' 
          ? result.reason 
          : result.value.error;
        errors.push({
          filename: files[index].name,
          error: error || 'Unknown error'
        });
      }
    });
    
    // Callbacks
    if (jobIds.length > 0 && onUploadComplete) {
      onUploadComplete(jobIds);
    }
    
    if (errors.length > 0 && onUploadError) {
      onUploadError(errors);
    }
    
    setIsUploading(false);
    
    // Clear progress after 3 seconds
    setTimeout(() => {
      setUploadProgress(new Map());
    }, 3000);
    
  }, [onUploadComplete, onUploadError]);

  // =====================================================
  // DROPZONE
  // =====================================================

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFilesUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 5,
    maxSize: DEFAULT_UPLOAD_CONFIG.max_file_size,
    disabled: isUploading
  });

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-gray-400" />
          
          <div>
            <p className="text-sm font-medium">
              {isDragActive 
                ? 'Drop files here...'
                : 'Drag & drop files or click to browse'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, TXT, CSV, DOC, DOCX • Max {formatFileSize(DEFAULT_UPLOAD_CONFIG.max_file_size)} • Max 5 files
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.size > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-3">
            Upload Progress ({uploadProgress.size} files)
          </h4>
          
          <div className="space-y-3">
            {Array.from(uploadProgress.values()).map((progress) => (
              <UploadProgressItem 
                key={progress.file_name} 
                progress={progress} 
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// =====================================================
// UPLOAD PROGRESS ITEM
// =====================================================

interface UploadProgressItemProps {
  progress: UploadProgress;
}

function UploadProgressItem({ progress }: UploadProgressItemProps) {
  const getIcon = () => {
    switch (progress.status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'queued':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'uploading':
        return 'Uploading...';
      case 'queued':
        return 'Queued for processing';
      case 'error':
        return progress.error || 'Upload failed';
      default:
        return 'Waiting...';
    }
  };

  return (
    <div className="flex items-center gap-3">
      {getIcon()}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {progress.file_name}
        </p>
        <p className="text-xs text-gray-500">
          {getStatusText()}
        </p>
        
        {progress.status === 'uploading' && (
          <Progress value={progress.progress} className="h-1 mt-1" />
        )}
      </div>
      
      {progress.status === 'error' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// =====================================================
// UPLOAD LOGIC
// =====================================================

interface UploadResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

async function uploadFile(
  file: File,
  progressMap: Map<string, UploadProgress>,
  setProgress: (map: Map<string, UploadProgress>) => void
): Promise<UploadResult> {
  try {
    // 1. Get presigned upload URL
    const presignedResponse = await fetch('/api/queue/presigned-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        file_type: file.type,
        file_size: file.size
      })
    });

    if (!presignedResponse.ok) {
      const error = await presignedResponse.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { upload_url, file_path } = await presignedResponse.json();

    // 2. Upload file directly to storage
    const uploadResponse = await fetch(upload_url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to storage');
    }

    // Update progress: uploading complete
    progressMap.set(file.name, {
      file_name: file.name,
      status: 'uploading',
      progress: 100
    });
    setProgress(new Map(progressMap));

    // 3. Enqueue processing job
    const enqueueResponse = await fetch('/api/queue/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        file_size: file.size,
        file_path: file_path,
        file_type: file.type
      })
    });

    if (!enqueueResponse.ok) {
      const error = await enqueueResponse.json();
      throw new Error(error.error || 'Failed to enqueue job');
    }

    const { job_id } = await enqueueResponse.json();

    // Update progress: queued
    progressMap.set(file.name, {
      file_name: file.name,
      status: 'queued',
      progress: 100,
      job_id
    });
    setProgress(new Map(progressMap));

    return { success: true, jobId: job_id };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update progress: error
    progressMap.set(file.name, {
      file_name: file.name,
      status: 'error',
      progress: 0,
      error: errorMessage
    });
    setProgress(new Map(progressMap));

    return { success: false, error: errorMessage };
  }
}

