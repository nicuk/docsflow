import React from "react"
import { Badge } from "@/components/ui/badge"
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileImage, 
  FileSpreadsheet, 
  FileText 
} from "lucide-react"

// Document types and interfaces
export type DocumentStatus = "processing" | "ready" | "error"
export type DocumentType = "pdf" | "doc" | "docx" | "txt" | "rtf" | "xls" | "xlsx" | "csv" | "jpg" | "jpeg" | "png"

// File type configurations
export const fileTypeConfig = {
  documents: {
    types: ["pdf", "doc", "docx", "txt", "rtf"],
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: (className?: string) => <FileText className={className} />,
  },
  spreadsheets: {
    types: ["xls", "xlsx", "csv"],
    maxSize: 25 * 1024 * 1024, // 25MB
    icon: (className?: string) => <FileSpreadsheet className={className} />,
  },
  images: {
    types: ["jpg", "jpeg", "png"],
    maxSize: 10 * 1024 * 1024, // 10MB
    icon: (className?: string) => <FileImage className={className} />,
  },
}

// Helper functions
export const getFileType = (filename: string): DocumentType => {
  const extension = filename.split(".").pop()?.toLowerCase() as DocumentType
  return extension
}

export const getFileTypeConfig = (type: DocumentType) => {
  if (fileTypeConfig.documents.types.includes(type)) return fileTypeConfig.documents
  if (fileTypeConfig.spreadsheets.types.includes(type)) return fileTypeConfig.spreadsheets
  if (fileTypeConfig.images.types.includes(type)) return fileTypeConfig.images
  return fileTypeConfig.documents
}

export const getFileIcon = (type: DocumentType, className?: string) => {
  return getFileTypeConfig(type).icon(className)
}

// fileTypeConfig is already exported above

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export const getStatusBadge = (status: DocumentStatus) => {
  switch (status) {
    case "ready":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
        >
          <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
        </Badge>
      )
    case "processing":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
        >
          <Clock className="h-3 w-3 mr-1 animate-spin" /> Processing
        </Badge>
      )
    case "error":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
        >
          <AlertCircle className="h-3 w-3 mr-1" /> Error
        </Badge>
      )
  }
}
