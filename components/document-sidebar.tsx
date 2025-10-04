"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  MoreVertical,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Folder,
  Download,
  Trash2,
  Edit2,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Filter,
  Calendar,
  CheckSquare,
  Check,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"

// Document types and interfaces
type DocumentStatus = "processed" | "processing" | "failed"
type DocumentType = "pdf" | "spreadsheet" | "image" | "document" | "other"
type FilterType = "all" | "pdf" | "spreadsheet" | "image" | "document"
type DateFilter = "all" | "today" | "week" | "month"
type StatusFilter = "all" | "processed" | "processing" | "failed"

interface Document {
  id: string
  name: string
  type: DocumentType
  size: number
  uploadDate: Date
  status: DocumentStatus
  thumbnail?: string
  folder?: string
}

interface DocumentSidebarProps {
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
  onDocumentSelect?: (document: Document) => void
}

export default function DocumentSidebar({
  initialWidth = 300,
  minWidth = 250,
  maxWidth = 450,
  onDocumentSelect,
}: DocumentSidebarProps) {
  // State for sidebar
  const [isOpen, setIsOpen] = useState(true)
  const [width, setWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [isSelectMode, setIsSelectMode] = useState(false)

  // State for filters
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<FilterType>("all")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  // Refs
  const sidebarRef = useRef<HTMLDivElement>(null)
  const resizeHandleRef = useRef<HTMLDivElement>(null)
  
  // Toast notifications
  const { toast } = useToast()

  // Sample documents data
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      name: "Financial Report Q3 2023.pdf",
      type: "pdf",
      size: 2400000, // 2.4 MB
      uploadDate: new Date(2023, 9, 15), // Oct 15, 2023
      status: "processed",
    },
    {
      id: "2",
      name: "Marketing Strategy.docx",
      type: "document",
      size: 1800000, // 1.8 MB
      uploadDate: new Date(2023, 10, 2), // Nov 2, 2023
      status: "processed",
    },
    {
      id: "3",
      name: "Sales Data Q4.xlsx",
      type: "spreadsheet",
      size: 3500000, // 3.5 MB
      uploadDate: new Date(2023, 11, 10), // Dec 10, 2023
      status: "processed",
    },
    {
      id: "4",
      name: "Product Roadmap 2024.pdf",
      type: "pdf",
      size: 4200000, // 4.2 MB
      uploadDate: new Date(2023, 11, 28), // Dec 28, 2023
      status: "processing",
    },
    {
      id: "5",
      name: "Team Photo.jpg",
      type: "image",
      size: 5600000, // 5.6 MB
      uploadDate: new Date(2024, 0, 5), // Jan 5, 2024
      status: "processed",
      folder: "Company",
    },
    {
      id: "6",
      name: "Contract Draft.pdf",
      type: "pdf",
      size: 1200000, // 1.2 MB
      uploadDate: new Date(2024, 0, 15), // Jan 15, 2024
      status: "failed",
      folder: "Legal",
    },
    {
      id: "7",
      name: "Budget 2024.xlsx",
      type: "spreadsheet",
      size: 2100000, // 2.1 MB
      uploadDate: new Date(2024, 0, 20), // Jan 20, 2024
      status: "processed",
      folder: "Finance",
    },
  ])

  // Check if on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  // Handle resize functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const newWidth = e.clientX
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = "default"
      document.body.style.userSelect = "auto"
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "ew-resize"
      document.body.style.userSelect = "none"
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth])

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  // Get document icon based on type
  const getDocumentIcon = (type: DocumentType) => {
    switch (type) {
      case "pdf":
        return <FileText className="h-8 w-8 text-red-500" />
      case "spreadsheet":
        return <FileSpreadsheet className="h-8 w-8 text-green-600" />
      case "image":
        return <FileImage className="h-8 w-8 text-blue-500" />
      case "document":
        return <FileText className="h-8 w-8 text-blue-600" />
      default:
        return <File className="h-8 w-8 text-gray-500" />
    }
  }

  // Get status badge
  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "processed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> Processed
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
      case "failed":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
          >
            <AlertCircle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        )
    }
  }

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter((doc) => {
    // Search filter
    const matchesSearch = searchQuery ? doc.name.toLowerCase().includes(searchQuery.toLowerCase()) : true

    // Type filter
    const matchesType = typeFilter === "all" ? true : doc.type === typeFilter

    // Date filter
    let matchesDate = true
    const now = new Date()
    if (dateFilter === "today") {
      matchesDate = doc.uploadDate.toDateString() === now.toDateString()
    } else if (dateFilter === "week") {
      const weekAgo = new Date()
      weekAgo.setDate(now.getDate() - 7)
      matchesDate = doc.uploadDate >= weekAgo
    } else if (dateFilter === "month") {
      const monthAgo = new Date()
      monthAgo.setMonth(now.getMonth() - 1)
      matchesDate = doc.uploadDate >= monthAgo
    }

    // Status filter
    const matchesStatus = statusFilter === "all" ? true : doc.status === statusFilter

    return matchesSearch && matchesType && matchesDate && matchesStatus
  })

  // Group documents by folder
  const documentsByFolder: Record<string, Document[]> = {}
  filteredDocuments.forEach((doc) => {
    const folder = doc.folder || "Uncategorized"
    if (!documentsByFolder[folder]) {
      documentsByFolder[folder] = []
    }
    documentsByFolder[folder].push(doc)
  })

  // Toggle document selection
  const toggleDocumentSelection = (id: string) => {
    if (selectedDocuments.includes(id)) {
      setSelectedDocuments(selectedDocuments.filter((docId) => docId !== id))
    } else {
      setSelectedDocuments([...selectedDocuments, id])
    }
  }

  // Delete selected documents
  const deleteSelectedDocuments = () => {
    setDocuments(documents.filter((doc) => !selectedDocuments.includes(doc.id)))
    setSelectedDocuments([])
    setIsSelectMode(false)
  }

  // TODO:LIVE - Connect to real backend API
  const handleUpload = () => {
    // Create file input element
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.pdf,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv,.jpg,.jpeg,.png'
    
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files
      if (!files) return
      
      // Show initial upload toast
      toast({
        title: `Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`,
        description: "Please wait while we process your documents.",
      });
      
      // Process files sequentially to prevent server overload
      let successCount = 0;
      let failedFiles: string[] = [];
      
      for (const file of Array.from(files)) {
        // Add optimistic document to UI
        const tempDoc: Document = {
          id: `temp-${Date.now()}-${Math.random()}`,
          name: file.name,
          type: getFileType(file.name),
          size: file.size,
          uploadDate: new Date(),
          status: "processing",
        }
        
        setDocuments(prev => [tempDoc, ...prev])
        
        try {
          // TODO:LIVE - Replace with real API call
          const { apiClient } = await import('@/lib/api-client')
          const response = await apiClient.uploadDocument(file)
          
          // Update with real document from backend
          setDocuments(prev => prev.map(doc => 
            doc.id === tempDoc.id 
              ? {
                  ...doc,
                  id: (response as any).documentId || (response as any).id,
                  status: (response as any).status === 'completed' ? "processed" : (response as any).status
                }
              : doc
          ))
          
          successCount++;
          
        } catch (error) {
          console.error('Upload failed:', error)
          failedFiles.push(file.name);
          
          // Mark as failed
          setDocuments(prev => prev.map(doc => 
            doc.id === tempDoc.id 
              ? { ...doc, status: "failed" }
              : doc
          ))
        }
      }
      
      // Show final result toast
      if (successCount > 0 && failedFiles.length === 0) {
        // All files succeeded
        toast({
          title: "Upload successful! 🎉",
          description: `${successCount} file${successCount > 1 ? 's' : ''} uploaded and processed successfully. You can now ask questions about ${successCount > 1 ? 'them' : 'it'}.`,
          variant: "default",
        });
      } else if (successCount > 0 && failedFiles.length > 0) {
        // Partial success
        toast({
          title: "Partial upload success ⚠️",
          description: `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully. ${failedFiles.length} failed: ${failedFiles.slice(0, 2).join(', ')}${failedFiles.length > 2 ? '...' : ''}.`,
          variant: "default",
        });
      } else {
        // All files failed
        toast({
          title: "Upload failed ❌",
          description: `Failed to upload ${failedFiles.length} file${failedFiles.length > 1 ? 's' : ''}. Please check file format and size (max 1MB).`,
          variant: "destructive",
        });
      }
    }
    
    input.click()
  }
  
  // Helper function to determine file type
  const getFileType = (filename: string): DocumentType => {
    const ext = filename.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf':
        return 'pdf'
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
        return 'document'
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'spreadsheet'
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image'
      default:
        return 'other'
    }
  }

  // Sidebar toggle button
  const SidebarToggle = () => (
    <Button
      variant="ghost"
      size="icon"
      className="absolute -right-10 top-4 h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700"
      onClick={() => setIsOpen(!isOpen)}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
    >
      {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
    </Button>
  )

  // Mobile sidebar toggle
  const MobileSidebarToggle = () => (
    <Button
      variant="outline"
      size="sm"
      className="flex items-center gap-2 bg-transparent"
      onClick={() => setMobileOpen(true)}
    >
      <FileText className="h-4 w-4" />
      Documents
    </Button>
  )

  // Render the sidebar content
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Documents</h2>
        <div className="flex items-center gap-2">
          {isSelectMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                onClick={deleteSelectedDocuments}
                disabled={selectedDocuments.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSelectMode(false)
                  setSelectedDocuments([])
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSelectMode(true)}>
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Select multiple</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                  </DialogHeader>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      Drag and drop your files here, or click to browse
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Supports PDF, DOCX, XLSX, CSV, JPG, PNG (up to 25MB)
                    </p>
                    <Button
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                      onClick={handleUpload}
                    >
                      Select Files
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Search and filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            className="pl-9 h-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <Filter className="h-3.5 w-3.5 mr-1" />
                {typeFilter === "all" ? "All Types" : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setTypeFilter("all")}>All Types</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("pdf")}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("spreadsheet")}>Spreadsheets</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("document")}>Documents</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter("image")}>Images</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {dateFilter === "all"
                  ? "Any Time"
                  : dateFilter === "today"
                    ? "Today"
                    : dateFilter === "week"
                      ? "This Week"
                      : "This Month"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setDateFilter("all")}>Any Time</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter("today")}>Today</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter("week")}>This Week</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateFilter("month")}>This Month</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                <Clock className="h-3.5 w-3.5 mr-1" />
                {statusFilter === "all" ? "Any Status" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>Any Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("processed")}>Processed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("processing")}>Processing</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("failed")}>Failed</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Document list */}
      <ScrollArea className="flex-1">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <File className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery || typeFilter !== "all" || dateFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Upload your first document to get started"}
            </p>
            {!searchQuery && typeFilter === "all" && dateFilter === "all" && statusFilter === "all" && (
              <Button onClick={handleUpload} className="bg-blue-600 hover:bg-blue-700">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {Object.keys(documentsByFolder).map((folder) => (
              <div key={folder} className="mb-4">
                <div className="flex items-center px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Folder className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                  {folder}
                  <Badge variant="outline" className="ml-2 text-xs">
                    {documentsByFolder[folder].length}
                  </Badge>
                </div>
                <div className="space-y-1 mt-1">
                  {documentsByFolder[folder].map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                        selectedDocuments.includes(doc.id) ? "bg-blue-50 dark:bg-blue-950" : ""
                      }`}
                    >
                      {isSelectMode ? (
                        <div className="mr-2" onClick={() => toggleDocumentSelection(doc.id)}>
                          {selectedDocuments.includes(doc.id) ? (
                            <div className="h-5 w-5 rounded border-2 border-blue-600 bg-blue-600 flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <div className="h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600" />
                          )}
                        </div>
                      ) : null}

                      <div className="flex-shrink-0 mr-3">{getDocumentIcon(doc.type)}</div>

                      <div className="flex-1 min-w-0" onClick={() => onDocumentSelect && onDocumentSelect(doc)}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{doc.name}</p>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatFileSize(doc.size)}</span>
                          <span className="mx-1">•</span>
                          <span>{formatDistanceToNow(doc.uploadDate, { addSuffix: true })}</span>
                        </div>
                        <div className="mt-1">{getStatusBadge(doc.status)}</div>
                      </div>

                      {!isSelectMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onDocumentSelect && onDocumentSelect(doc)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 dark:text-red-400">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )

  // Mobile dialog version
  if (isMobile) {
    return (
      <>
        <MobileSidebarToggle />

        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent className="sm:max-w-[425px] h-[80vh] p-0">
            <DialogHeader className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <DialogTitle>Your Documents</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden h-full">
              <SidebarContent />
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Desktop sidebar version
  return (
    <div
      ref={sidebarRef}
      className={`relative h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ width: isOpen ? width : 0 }}
    >
      <SidebarContent />
      <SidebarToggle />

      {/* Resize handle */}
      <div
        ref={resizeHandleRef}
        className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors"
        onMouseDown={() => setIsResizing(true)}
      />
    </div>
  )
}
