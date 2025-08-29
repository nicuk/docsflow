"use client"

/**
 * Source Viewer Modal Component  
 * Allows users to view full document context when clicking sources
 * Risk: 3/10 (LOW-MEDIUM) - New UI component, no backend changes
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, X, ExternalLink, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

interface SourceViewerProps {
  source: {
    filename: string
    content: string
    document_id: string
    page?: number
    confidence?: number
  }
  isOpen: boolean
  onClose: () => void
  highlightText?: string
}

export default function SourceViewerModal({ source, isOpen, onClose, highlightText }: SourceViewerProps) {
  const [viewMode, setViewMode] = useState<'snippet' | 'full'>('snippet')
  const [fullDocumentContent, setFullDocumentContent] = useState<string>('')
  const [isLoadingDocument, setIsLoadingDocument] = useState(false)
  const [documentLoadError, setDocumentLoadError] = useState<string | null>(null)

  // 🔧 FIX: Load full document content when switching to full view
  useEffect(() => {
    if (viewMode === 'full' && !fullDocumentContent && !isLoadingDocument && source.document_id && !source.document_id.startsWith('doc-')) {
      loadFullDocument()
    }
  }, [viewMode, source.document_id])

  const loadFullDocument = async () => {
    if (isLoadingDocument || !source.document_id || source.document_id.startsWith('doc-')) return
    
    setIsLoadingDocument(true)
    setDocumentLoadError(null)
    
    try {
      // Fetch the full document content
      const response = await fetch(`/api/documents/${source.document_id}/content`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.statusText}`)
      }
      
      const data = await response.json()
      setFullDocumentContent(data.content || 'Document content not available')
      
    } catch (error) {
      console.error('Error loading full document:', error)
      setDocumentLoadError(error instanceof Error ? error.message : 'Failed to load document')
      setFullDocumentContent('Error loading document content. Please try again.')
    } finally {
      setIsLoadingDocument(false)
    }
  }

  const highlightContent = (content: string, highlight?: string) => {
    if (!highlight) return content
    
    const regex = new RegExp(`(${highlight})`, 'gi')
    return content.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{source.filename}</span>
            {source.page && (
              <Badge variant="secondary">Page {source.page}</Badge>
            )}
            {source.confidence && (
              <Badge variant="outline">
                {Math.round(source.confidence * 100)}% relevance
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* View Mode Toggle */}
          <div className="flex space-x-2">
            <Button
              variant={viewMode === 'snippet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('snippet')}
            >
              Relevant Snippet
            </Button>
            <Button
              variant={viewMode === 'full' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('full')}
              disabled={isLoadingDocument}
            >
              {isLoadingDocument && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Full Context
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => window.open(`/api/documents/${source.document_id}/content`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Document
            </Button>
          </div>

          {/* Content Display */}
          <ScrollArea className="h-96 w-full border rounded-lg p-4">
            {isLoadingDocument ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center space-x-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading document content...</span>
                </div>
              </div>
            ) : documentLoadError ? (
              <div className="flex flex-col items-center justify-center h-full text-red-500">
                <p className="text-sm mb-2">{documentLoadError}</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={loadFullDocument}
                  className="text-red-500 border-red-500 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div 
                className="prose dark:prose-invert max-w-none text-sm"
                dangerouslySetInnerHTML={{
                  __html: highlightContent(
                    viewMode === 'snippet' 
                      ? source.content 
                      : (fullDocumentContent || source.content),
                    highlightText
                  )
                }}
              />
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Document ID: {source.document_id}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(source.content)
                  // TODO: Show toast notification
                }}
              >
                Copy Quote
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

    </Dialog>
  )
}
