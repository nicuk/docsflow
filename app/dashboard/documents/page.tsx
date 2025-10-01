"use client"

import { useState } from "react"
import { useDropzone } from "react-dropzone"
import { format } from "date-fns"
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  LayoutGrid,
  LayoutList,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"
import { useEffect } from "react"
import { 
  DocumentType, 
  DocumentStatus, 
  getFileType, 
  getFileIcon, 
  formatFileSize, 
  getStatusBadge,
  getFileTypeConfig,
  fileTypeConfig
} from "@/lib/document-utils"
import { Document, DocumentCategory, sampleDocuments } from "@/constants/document-sample-data"

interface UploadingFile {
  id: string
  file: File
  progress: number
  phase: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

// ✅ EXTRACTED: Helper functions moved to @/lib/document-utils
// ✅ EXTRACTED: Constants moved to @/constants/document-sample-data

// ✅ EXTRACTED: Sample data moved to @/constants/document-sample-data

export default function DocumentsPage() {
  // State for documents and UI
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | DocumentType>("all")
  const [filterCategory, setFilterCategory] = useState<"all" | DocumentCategory>("all")
  const [filterStatus, setFilterStatus] = useState<"all" | DocumentStatus>("all")
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Fetch documents from API on mount
  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getDocuments()
      
      if (response.documents && Array.isArray(response.documents)) {
        // Map backend documents to frontend format
        const mappedDocuments: Document[] = response.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.filename,
          type: getFileType(doc.filename),
          size: doc.file_size || 0,
          uploadDate: new Date(doc.created_at),
          status: doc.processing_status === 'completed' ? 'ready' : 
                  doc.processing_status === 'failed' ? 'error' : 'processing',
          category: doc.metadata?.category || 'uncategorized',
          tags: doc.metadata?.tags || [],
          favorite: false,
          processingTime: doc.metadata?.processing_time,
          errorMessage: doc.metadata?.error_message,
          pages: doc.metadata?.pages,
          wordCount: doc.metadata?.word_count,
        }))
        
        setDocuments(mappedDocuments)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      handleFilesUpload(acceptedFiles)
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "application/rtf": [".rtf"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxFiles: 5, // 🚀 FIX: Reduced from 10 to 5 for better concurrent upload handling
    maxSize: 50 * 1024 * 1024, // 50MB max for any file
    // 🚀 FIX: Keep dropzone active even during uploads
    disabled: false,
  })

  // Handle file uploads - REAL API INTEGRATION with concurrent upload limiting
  const handleFilesUpload = async (files: File[]) => {
    // 🚀 FIX: Limit to 5 files max for better UX
    if (files.length > 5) {
      alert(`Please upload a maximum of 5 files at once. You selected ${files.length} files.`);
      return;
    }

    // Create uploading file objects
    const newUploadingFiles: UploadingFile[] = files.map((file) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      phase: 'uploading',
    }))

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles])
    setIsUploadDialogOpen(true)

    // 🚀 FIX: Upload files with concurrency control (3 at a time)
    await uploadFilesWithConcurrencyLimit(newUploadingFiles, 3)
  }

  // 🚀 NEW: Upload files with concurrent limit to prevent overwhelming browser/server
  const uploadFilesWithConcurrencyLimit = async (files: UploadingFile[], limit: number) => {
    const queue = [...files];
    const active: Promise<void>[] = [];

    while (queue.length > 0 || active.length > 0) {
      // Fill up to the concurrent limit
      while (active.length < limit && queue.length > 0) {
        const uploadingFile = queue.shift()!;
        const uploadPromise = uploadFileToBackend(uploadingFile.id, uploadingFile.file)
          .then(() => {
            // Remove from active when done
            const index = active.indexOf(uploadPromise);
            if (index > -1) active.splice(index, 1);
          })
          .catch(() => {
            // Remove from active even on error
            const index = active.indexOf(uploadPromise);
            if (index > -1) active.splice(index, 1);
          });
        
        active.push(uploadPromise);
      }

      // Wait for at least one to complete before continuing
      if (active.length > 0) {
        await Promise.race(active);
      }
    }
  }

  // Real backend file upload with progress tracking
  const uploadFileToBackend = async (fileId: string, file: File) => {
    try {
      // 🚀 ENHANCED: Multi-phase progress tracking
      const response = await apiClient.uploadDocument(file, (progress) => {
        setUploadingFiles((prev) => 
          prev.map((f) => f.id === fileId ? { 
            ...f, 
            progress: Math.min(progress, 90), // Cap upload at 90%
            phase: progress >= 90 ? 'processing' : 'uploading'
          } : f)
        );
      });
      
      // Create document from backend response
      const responseData = response as any; // Type assertion for now
      const newDocument: Document = {
        id: responseData.document?.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: responseData.document?.filename || file.name,
        type: getFileType(file.name),
        size: file.size,
        uploadDate: new Date(),
        status: responseData.document?.processing_status || "processing",
        category: responseData.document?.document_category || "uncategorized",
        tags: [],
        favorite: false,
      }

      // 🚀 ENHANCED: Show completion phase then remove
      setUploadingFiles((prev) => 
        prev.map((f) => f.id === fileId ? { 
          ...f, 
          progress: 100, 
          phase: 'completed' 
        } : f)
      );
      
      // Add the new document to the list
      setDocuments((prevDocs) => [newDocument, ...prevDocs])
      
      // Refresh documents list to get accurate data
      setTimeout(() => {
        fetchDocuments()
      }, 2000)
      
      // Remove from uploading files after showing completion
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId))
      }, 3000) // 🚀 ENHANCED: Show completion state for 3 seconds
      
      // Poll for processing completion if status is processing
      if (newDocument.status === "processing") {
        pollDocumentStatus(newDocument.id)
      }
      
    } catch (error) {
      console.error('Upload failed:', error)
      
      // 🚀 ENHANCED: Show error phase with clear messaging
      setUploadingFiles((prev) => 
        prev.map((f) => 
          f.id === fileId 
            ? { 
                ...f, 
                phase: 'error',
                error: error instanceof Error ? error.message : 'Upload failed' 
              }
            : f
        )
      )
      
      // Remove from uploading files after showing error
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId))
      }, 3000)
    }
  }
  
  // Poll document processing status
  const pollDocumentStatus = async (documentId: string) => {
    const maxPolls = 30 // Max 5 minutes (30 * 10 seconds)
    let pollCount = 0
    
    const poll = async () => {
      if (pollCount >= maxPolls) {
        // Timeout - mark as error
        setDocuments((prev) => 
          prev.map((doc) => 
            doc.id === documentId 
              ? { ...doc, status: "error", errorMessage: "Processing timeout" }
              : doc
          )
        )
        return
      }
      
      try {
        // Here you would call your backend to get document status
        // For now, we'll simulate processing completion after random time
        pollCount++
        
        // Simulate random processing completion (replace with real API call)
        if (Math.random() > 0.7 || pollCount > 10) {
          setDocuments((prev) => 
            prev.map((doc) => 
              doc.id === documentId 
                ? { 
                    ...doc, 
                    status: "ready",
                    processingTime: pollCount * 10, // Rough estimate
                    pages: doc.type === "pdf" || doc.type === "doc" || doc.type === "docx" 
                      ? Math.floor(Math.random() * 30) + 1 : undefined,
                    wordCount: doc.type === "pdf" || doc.type === "doc" || doc.type === "docx" || doc.type === "txt" 
                      ? Math.floor(Math.random() * 5000) + 500 : undefined,
                  }
                : doc
            )
          )
        } else {
          // Continue polling
          setTimeout(poll, 10000) // Poll every 10 seconds
        }
      } catch (error) {
        console.error('Status polling failed:', error)
        setDocuments((prev) => 
          prev.map((doc) => 
            doc.id === documentId 
              ? { ...doc, status: "error", errorMessage: "Status check failed" }
              : doc
          )
        )
      }
    }
    
    // Start polling after initial delay
    setTimeout(poll, 5000)
  }

  // Cancel file upload
  const cancelFileUpload = (fileId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  // Cleanup stuck documents
  const cleanupStuckDocuments = async () => {
    try {
      const response = await apiClient.cleanupStuckDocuments();
      
      if (response) {
        console.log(`✅ Cleaned up ${response.cleaned || 0} stuck documents`);
        // Refresh the documents list
        fetchDocuments();
      }
    } catch (error) {
      console.error('Cleanup request failed:', error);
    }
  }

  // Handle document selection
  const toggleDocumentSelection = (id: string) => {
    setSelectedDocuments((prev) => (prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]))
  }

  // Select all documents
  const selectAllDocuments = () => {
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([])
    } else {
      setSelectedDocuments(filteredDocuments.map((doc) => doc.id))
    }
  }

  // Delete selected documents
  const deleteSelectedDocuments = async () => {
    try {
      // Delete each document from backend
      const deletePromises = selectedDocuments.map(docId => 
        apiClient.deleteDocument(docId)
      );
      
      await Promise.all(deletePromises);
      
      console.log(`✅ Deleted ${selectedDocuments.length} documents`);
      
      // Update local state
      setDocuments((prev) => prev.filter((doc) => !selectedDocuments.includes(doc.id)))
      setSelectedDocuments([])
      setIsDeleteDialogOpen(false)
      
      // Refresh the documents list to ensure sync
      fetchDocuments();
    } catch (error) {
      console.error('Failed to delete documents:', error);
      // Still update UI optimistically
      setDocuments((prev) => prev.filter((doc) => !selectedDocuments.includes(doc.id)))
      setSelectedDocuments([])
      setIsDeleteDialogOpen(false)
    }
  }

  // Toggle document favorite status
  const toggleFavorite = (id: string) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, favorite: !doc.favorite } : doc)))
  }

  // View document details
  const viewDocumentDetails = (document: Document) => {
    setSelectedDocument(document)
    setIsDetailSheetOpen(true)
  }

  // Retry processing for error documents
  const retryProcessing = (id: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, status: "processing", errorMessage: undefined } : doc)),
    )

    // Simulate processing completion after a delay
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                status: "ready",
                processingTime: Math.random() * 10 + 2,
              }
            : doc,
        ),
      )
    }, 3000)
  }

  // Filter and sort documents
  const filteredDocuments = documents.filter((doc) => {
    // Search query filter
    const matchesSearch = searchQuery
      ? doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      : true

    // Type filter
    const matchesType = filterType === "all" ? true : doc.type === filterType

    // Category filter
    const matchesCategory = filterCategory === "all" ? true : doc.category === filterCategory

    // Status filter
    const matchesStatus = filterStatus === "all" ? true : doc.status === filterStatus

    return matchesSearch && matchesType && matchesCategory && matchesStatus
  })

  // Sort documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "date":
        comparison = a.uploadDate.getTime() - b.uploadDate.getTime()
        break
      case "size":
        comparison = a.size - b.size
        break
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
  }

  // Document categories with counts
  const categoryCount = documents.reduce(
    (acc, doc) => {
      acc[doc.category] = (acc[doc.category] || 0) + 1
      return acc
    },
    {} as Record<DocumentCategory, number>,
  )

  // Document status counts
  const statusCount = documents.reduce(
    (acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1
      return acc
    },
    {} as Record<DocumentStatus, number>,
  )

  // Document type counts - simplified to avoid import issues
  const typeCount = documents.reduce(
    (acc, doc) => {
      const documentTypes = ["pdf", "doc", "docx", "txt", "rtf"]
      const spreadsheetTypes = ["xls", "xlsx", "csv"]
      
      const category = documentTypes.includes(doc.type)
        ? "documents"
        : spreadsheetTypes.includes(doc.type)
          ? "spreadsheets"
          : "images"

      acc[category] = (acc[category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Render document grid view
  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {sortedDocuments.map((document) => (
        <Card key={document.id} className="overflow-hidden">
          <div className="relative">
            {/* Document thumbnail or icon */}
            <div className="h-40 flex items-center justify-center bg-muted/30">
              {document.thumbnail ? (
                <img
                  src={document.thumbnail || "/placeholder.svg"}
                  alt={document.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  {getFileIcon(document.type, "h-16 w-16 text-muted-foreground")}
                  <span className="mt-2 text-xs font-medium uppercase text-muted-foreground">{document.type}</span>
                </div>
              )}
            </div>

            {/* Selection checkbox */}
            <div className="absolute top-2 left-2">
              <Checkbox
                checked={selectedDocuments.includes(document.id)}
                onCheckedChange={() => toggleDocumentSelection(document.id)}
                className="h-5 w-5 border-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
            </div>

            {/* Favorite button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => toggleFavorite(document.id)}
            >
              <Star
                className={`h-4 w-4 ${document.favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
              />
              <span className="sr-only">{document.favorite ? "Remove from favorites" : "Add to favorites"}</span>
            </Button>
          </div>

          <CardHeader className="p-3 pb-0">
            <div className="flex items-start justify-between">
              <div className="truncate">
                <h3 className="font-medium text-sm truncate" title={document.name}>
                  {document.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(document.size)} • {format(document.uploadDate, "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 pt-2">
            <div className="flex items-center">
              {getStatusBadge(document.status)}

              {document.shared && (
                <Badge
                  variant="outline"
                  className="ml-2 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
                >
                  <Share2 className="h-3 w-3 mr-1" /> Shared
                </Badge>
              )}
            </div>

            {document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {document.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {document.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{document.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="p-2 pt-0 flex justify-between">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => viewDocumentDetails(document)}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View details</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => viewDocumentDetails(document)}>
                  <Eye className="h-4 w-4 mr-2" /> View details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" /> Download
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pencil className="h-4 w-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Tag className="h-4 w-4 mr-2" /> Edit tags
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {document.status === "error" ? (
                  <DropdownMenuItem onClick={() => retryProcessing(document.id)}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Retry processing
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  onClick={() => {
                    setSelectedDocuments([document.id])
                    setIsDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardFooter>
        </Card>
      ))}
    </div>
  )

  // Render document list view
  const renderListView = () => (
    <div className="border rounded-md overflow-hidden">
      <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 border-b text-sm font-medium">
        <div className="col-span-1 flex items-center">
          <Checkbox
            checked={selectedDocuments.length > 0 && selectedDocuments.length === filteredDocuments.length}
            onCheckedChange={selectAllDocuments}
          />
        </div>
        <div className="col-span-5">Name</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Size</div>
        <div className="col-span-2">Date</div>
      </div>

      {sortedDocuments.map((document) => (
        <div
          key={document.id}
          className="grid grid-cols-12 gap-2 p-3 border-b hover:bg-muted/30 transition-colors items-center"
        >
          <div className="col-span-1 flex items-center">
            <Checkbox
              checked={selectedDocuments.includes(document.id)}
              onCheckedChange={() => toggleDocumentSelection(document.id)}
            />
          </div>
          <div className="col-span-5 flex items-center gap-3">
            <div className="flex-shrink-0">{getFileIcon(document.type, "h-8 w-8")}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate" title={document.name}>
                  {document.name}
                </span>
                {document.favorite && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />}
                {document.shared && <Share2 className="h-3.5 w-3.5 text-blue-500" />}
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span className="uppercase">{document.type}</span>
                {document.tags.length > 0 && <span>• {document.tags.slice(0, 2).join(", ")}</span>}
              </div>
            </div>
          </div>
          <div className="col-span-2">{getStatusBadge(document.status)}</div>
          <div className="col-span-2 text-sm text-muted-foreground">{formatFileSize(document.size)}</div>
          <div className="col-span-2 text-sm text-muted-foreground">{format(document.uploadDate, "MMM d, yyyy")}</div>
        </div>
      ))}
    </div>
  )

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No documents uploaded yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Upload your first document to get started. We support a wide range of business document formats.
      </p>
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <div className="flex flex-col items-center p-3 rounded-lg border">
          <FileText className="h-8 w-8 text-blue-500 mb-2" />
          <span className="text-sm font-medium">Documents</span>
          <span className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT, RTF</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border">
          <FileSpreadsheet className="h-8 w-8 text-green-500 mb-2" />
          <span className="text-sm font-medium">Spreadsheets</span>
          <span className="text-xs text-muted-foreground">XLS, XLSX, CSV</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border">
          <FileImage className="h-8 w-8 text-purple-500 mb-2" />
          <span className="text-sm font-medium">Images</span>
          <span className="text-xs text-muted-foreground">JPG, JPEG, PNG</span>
        </div>
      </div>
      <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
        <Upload className="h-4 w-4" /> Upload your first document
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Go back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
            <p className="text-muted-foreground">Upload, manage, and analyze your business documents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button 
            onClick={cleanupStuckDocuments} 
            variant="outline" 
            className="gap-2"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" /> Cleanup
          </Button>
        </div>
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className={`rounded-full p-4 mb-4 ${
              isDragActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <Upload className={`h-8 w-8 ${isDragActive ? "animate-bounce" : ""}`} />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {isDragActive ? "Drop your files here" : "Drag & drop your business documents here"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            or click to browse your files. We support PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG and more. <strong>Max 5 files at once.</strong>
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <Badge variant="outline">PDF (50MB)</Badge>
            <Badge variant="outline">DOC/DOCX (50MB)</Badge>
            <Badge variant="outline">TXT/RTF (50MB)</Badge>
            <Badge variant="outline">XLS/XLSX/CSV (50MB)</Badge>
            <Badge variant="outline">JPG/PNG (50MB)</Badge>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Upload className="h-4 w-4" /> Select files
          </Button>
        </div>
      </div>

      {/* Document management toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search and filters */}
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documents..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 bg-transparent">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter Documents</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">File Type</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setFilterType("all")}>
                    <Check className={`mr-2 h-4 w-4 ${filterType === "all" ? "opacity-100" : "opacity-0"}`} />
                    All Types
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("pdf")}>
                    <Check className={`mr-2 h-4 w-4 ${filterType === "pdf" ? "opacity-100" : "opacity-0"}`} />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("docx")}>
                    <Check className={`mr-2 h-4 w-4 ${filterType === "docx" ? "opacity-100" : "opacity-0"}`} />
                    Word Documents
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterType("xlsx")}>
                    <Check className={`mr-2 h-4 w-4 ${filterType === "xlsx" ? "opacity-100" : "opacity-0"}`} />
                    Excel Spreadsheets
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">Category</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setFilterCategory("all")}>
                    <Check className={`mr-2 h-4 w-4 ${filterCategory === "all" ? "opacity-100" : "opacity-0"}`} />
                    All Categories
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterCategory("contracts")}>
                    <Check className={`mr-2 h-4 w-4 ${filterCategory === "contracts" ? "opacity-100" : "opacity-0"}`} />
                    Contracts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterCategory("invoices")}>
                    <Check className={`mr-2 h-4 w-4 ${filterCategory === "invoices" ? "opacity-100" : "opacity-0"}`} />
                    Invoices
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterCategory("reports")}>
                    <Check className={`mr-2 h-4 w-4 ${filterCategory === "reports" ? "opacity-100" : "opacity-0"}`} />
                    Reports
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                    <Check className={`mr-2 h-4 w-4 ${filterStatus === "all" ? "opacity-100" : "opacity-0"}`} />
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("ready")}>
                    <Check className={`mr-2 h-4 w-4 ${filterStatus === "ready" ? "opacity-100" : "opacity-0"}`} />
                    Ready
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("processing")}>
                    <Check className={`mr-2 h-4 w-4 ${filterStatus === "processing" ? "opacity-100" : "opacity-0"}`} />
                    Processing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus("error")}>
                    <Check className={`mr-2 h-4 w-4 ${filterStatus === "error" ? "opacity-100" : "opacity-0"}`} />
                    Error
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* View and sort options */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as "name" | "date" | "size")}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sort by</SelectLabel>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={toggleSortDirection} className="h-10 w-10 bg-transparent">
              {sortDirection === "asc" ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
            </Button>
            <div className="border rounded-md flex">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-10 w-10"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Selected documents actions */}
        {selectedDocuments.length > 0 && (
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
            <div className="text-sm">
              <span className="font-medium">{selectedDocuments.length}</span> document
              {selectedDocuments.length !== 1 && "s"} selected
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <Tag className="h-4 w-4 mr-2" /> Tag
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-red-600 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-400 dark:hover:bg-red-950 bg-transparent"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Document categories */}
      <div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              All Documents
              <Badge variant="secondary" className="ml-2">
                {documents.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="favorites">
              Favorites
              <Badge variant="secondary" className="ml-2">
                {documents.filter((doc) => doc.favorite).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="shared">
              Shared
              <Badge variant="secondary" className="ml-2">
                {documents.filter((doc) => doc.shared).length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Document list */}
      <div>
        {documents.length === 0 ? (
          renderEmptyState()
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No matching documents</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search or filter criteria to find what you're looking for.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setFilterType("all")
                setFilterCategory("all")
                setFilterStatus("all")
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          renderGridView()
        ) : (
          renderListView()
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>Upload your business documents for processing and analysis.</DialogDescription>
          </DialogHeader>

          {uploadingFiles.length > 0 ? (
            <div className="space-y-4">
              {uploadingFiles.map((file) => (
                <div key={file.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      {getFileIcon(getFileType(file.file.name), "h-5 w-5")}
                      <span className="font-medium text-sm truncate">{file.file.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancelFileUpload(file.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={file.progress} className="h-2" />
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground w-10">{Math.round(file.progress)}%</span>
                      {file.phase === 'uploading' && <span className="text-xs text-blue-600">Uploading...</span>}
                      {file.phase === 'processing' && <span className="text-xs text-yellow-600">Processing...</span>}
                      {file.phase === 'completed' && <span className="text-xs text-green-600">✓ Complete</span>}
                      {file.phase === 'error' && <span className="text-xs text-red-600">✗ Failed</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer">
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm mb-1">Drag & drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, DOC, DOCX, XLS, XLSX, CSV, JPG, PNG and more (up to 50MB)
              </p>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Maximum 5 files, 50MB per file (3 concurrent uploads)</div>
            <Button 
              type="submit" 
              onClick={() => {
                // 🚀 FIX: Allow closing dialog and clear completed uploads
                setUploadingFiles(prev => prev.filter(f => f.progress < 100 && !f.error));
                setIsUploadDialogOpen(false);
              }}
              variant={uploadingFiles.some(f => f.progress < 100) ? "outline" : "default"}
            >
              {uploadingFiles.some(f => f.progress < 100) ? "Close" : "Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document details sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent className="sm:max-w-xl w-full">
          {selectedDocument && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {getFileIcon(selectedDocument.type, "h-5 w-5")}
                  <span className="truncate">{selectedDocument.name}</span>
                </SheetTitle>
                <SheetDescription>Uploaded on {format(selectedDocument.uploadDate, "MMMM d, yyyy")}</SheetDescription>
              </SheetHeader>

              <div className="mt-6">
                <Tabs defaultValue="details">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">File Type</Label>
                        <div className="font-medium">{selectedDocument.type.toUpperCase()}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Size</Label>
                        <div className="font-medium">{formatFileSize(selectedDocument.size)}</div>
                      </div>
                      {selectedDocument.pages && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Pages</Label>
                          <div className="font-medium">{selectedDocument.pages}</div>
                        </div>
                      )}
                      {selectedDocument.wordCount && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Word Count</Label>
                          <div className="font-medium">{selectedDocument.wordCount.toLocaleString()}</div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <div>{getStatusBadge(selectedDocument.status)}</div>
                      </div>
                      {selectedDocument.processingTime && (
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Processing Time</Label>
                          <div className="font-medium">{selectedDocument.processingTime.toFixed(1)}s</div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm">Category</Label>
                      <Select defaultValue={selectedDocument.category}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contracts">Contracts</SelectItem>
                          <SelectItem value="invoices">Invoices</SelectItem>
                          <SelectItem value="reports">Reports</SelectItem>
                          <SelectItem value="correspondence">Correspondence</SelectItem>
                          <SelectItem value="uncategorized">Uncategorized</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedDocument.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1">
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                        <Button variant="outline" size="sm" className="h-7 bg-transparent">
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Tag
                        </Button>
                      </div>
                    </div>

                    {selectedDocument.status === "error" && selectedDocument.errorMessage && (
                      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-400">
                        <div className="font-medium flex items-center gap-1 mb-1">
                          <XCircle className="h-4 w-4" /> Processing Error
                        </div>
                        <p>{selectedDocument.errorMessage}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900 bg-transparent"
                          onClick={() => {
                            retryProcessing(selectedDocument.id)
                            setIsDetailSheetOpen(false)
                          }}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Processing
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="preview" className="mt-4">
                    <div className="bg-muted/50 border rounded-md h-80 flex items-center justify-center">
                      <div className="text-center p-4">
                        <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                        <h3 className="font-medium mb-1">Document Preview</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Preview is available for PDF and image files
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (selectedDocument?.id) {
                              window.open(`/api/documents/${selectedDocument.id}/content`, '_blank');
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" /> View Document
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-4">
                    <ScrollArea className="h-72">
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Document uploaded</p>
                            <p className="text-xs text-muted-foreground">
                              {format(selectedDocument.uploadDate, "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>

                        {selectedDocument.status !== "error" && (
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Processing completed</p>
                              <p className="text-xs text-muted-foreground">
                                {format(
                                  new Date(
                                    selectedDocument.uploadDate.getTime() +
                                      (selectedDocument.processingTime || 5) * 1000,
                                  ),
                                  "MMM d, yyyy 'at' h:mm a",
                                )}
                              </p>
                              {selectedDocument.processingTime && (
                                <p className="text-xs text-muted-foreground">
                                  Processed in {selectedDocument.processingTime.toFixed(1)} seconds
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedDocument.status === "error" && (
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Processing failed</p>
                              <p className="text-xs text-muted-foreground">
                                {format(
                                  new Date(selectedDocument.uploadDate.getTime() + 5000),
                                  "MMM d, yyyy 'at' h:mm a",
                                )}
                              </p>
                              {selectedDocument.errorMessage && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                  {selectedDocument.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>

              <SheetFooter className="mt-6">
                <div className="flex w-full justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={`gap-2 ${
                        selectedDocument.favorite
                          ? "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-400"
                          : ""
                      }`}
                      onClick={() => toggleFavorite(selectedDocument.id)}
                    >
                      <Star
                        className={`h-4 w-4 ${selectedDocument.favorite ? "fill-yellow-400 text-yellow-400" : ""}`}
                      />
                      {selectedDocument.favorite ? "Favorited" : "Favorite"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Share2 className="h-4 w-4" /> Share
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem>
                          <Link2 className="h-4 w-4 mr-2" /> Copy link
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Cloud className="h-4 w-4 mr-2" /> Share to cloud
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setSelectedDocuments([selectedDocument.id])
                        setIsDetailSheetOpen(false)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedDocuments.length > 1 ? "Documents" : "Document"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedDocuments.length > 1 ? "these documents" : "this document"}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteSelectedDocuments}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
