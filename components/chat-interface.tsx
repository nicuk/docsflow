"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Paperclip, RotateCcw, Download, FileText, MessageSquare, Sparkles, ChevronRight, Plus, History, Trash2, X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import ConfidenceIndicator from "@/components/confidence-indicator"
import SourceViewerModal from "@/components/source-viewer-modal"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  type: "user" | "ai" | "loading"
  content: string
  timestamp: Date
  sources?: Array<{
    document: string
    documentId?: string  // 🎯 FIX: Add document UUID for loading full content
    page: number
    snippet: string
    confidence?: number // 0-1 confidence score for each source
  }>
  confidence?: number // Overall confidence score 0-1
  suggestions?: string[]
}

interface Conversation {
  id: string
  title: string
  summary?: string
  messageCount: number
  lastActivity: string
  createdAt: string
}

// Get user-specific storage keys
const getUserEmail = () => {
  if (typeof window !== 'undefined') {
    const userEmail = document.cookie
      .split('; ')
      .find(row => row.startsWith('user-email='))
      ?.split('=')[1];
    
    // Decode URL-encoded email (Support%40bitto.tech → support@bitto.tech)
    return userEmail ? decodeURIComponent(userEmail) : 'demo';
  }
  return 'demo';
};

// User-specific storage keys for isolation
const STORAGE_KEYS = {
  conversations: `docsflow-conversations-${getUserEmail()}`,
  currentConversationId: `docsflow-current-conversation-${getUserEmail()}`,
  messages: `docsflow-messages-${getUserEmail()}`
}

// Utility functions for localStorage persistence
const storage = {
  // Save conversations to localStorage
  saveConversations: (conversations: Conversation[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations))
    }
  },

  // Load conversations from localStorage
  loadConversations: (): Conversation[] => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.conversations)
      return stored ? JSON.parse(stored) : []
    }
    return []
  },

  // Save current conversation ID
  saveCurrentConversationId: (id: string | null) => {
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(STORAGE_KEYS.currentConversationId, id)
      } else {
        localStorage.removeItem(STORAGE_KEYS.currentConversationId)
      }
    }
  },

  // Load current conversation ID
  loadCurrentConversationId: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.currentConversationId)
    }
    return null
  },

  // Save messages for a conversation
  saveMessages: (conversationId: string, messages: Message[]) => {
    if (typeof window !== 'undefined') {
      const allMessages = JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '{}')
      // Ensure timestamps are serializable
      const serializedMessages = messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }))
      allMessages[conversationId] = serializedMessages
      localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(allMessages))
    }
  },

  // Load messages for a conversation
  loadMessages: (conversationId: string): Message[] => {
    if (typeof window !== 'undefined') {
      const allMessages = JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '{}')
      const storedMessages = allMessages[conversationId] || []
      // Ensure timestamps are Date objects
      return storedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }
    return []
  },

  // 🚀 SURGICAL FIX: Clean up invalid conversation IDs
  cleanupInvalidConversations: () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.conversations)
      if (!stored) return;
      
      try {
        const conversations = JSON.parse(stored) as Conversation[]
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        
        // Filter out conversations with invalid IDs (not UUID and not starting with 'local-')
        const validConversations = conversations.filter(conv => {
          const isValid = uuidRegex.test(conv.id) || conv.id.startsWith('local-')
          if (!isValid) {
            console.log(`🧹 Removing invalid conversation ID: ${conv.id}`)
          }
          return isValid
        })
        
        if (validConversations.length !== conversations.length) {
          localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(validConversations))
          console.log(`✅ Cleaned up ${conversations.length - validConversations.length} invalid conversations`)
        }
      } catch (error) {
        console.error('Error cleaning up conversations:', error)
      }
    }
  },

  // 🚀 Clear all chat data (useful for testing/debugging)
  clearAll: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.conversations)
      localStorage.removeItem(STORAGE_KEYS.currentConversationId)
      localStorage.removeItem(STORAGE_KEYS.messages)
      console.log('✅ Cleared all chat localStorage data')
    }
  }
}

export default function ChatInterface() {
  // Conversation Management State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showConversationHistory, setShowConversationHistory] = useState(false)
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)

  // Chat State - now managed with conversation context
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [hiddenSuggestions, setHiddenSuggestions] = useState<Set<string>>(new Set()) // Track hidden suggestion sections
  const [suggestionsDisabledPermanently, setSuggestionsDisabledPermanently] = useState(false) // Track if user has permanently dismissed suggestions
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // 🚀 NEW: Source viewer modal state
  const [selectedSource, setSelectedSource] = useState<any>(null)
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)
  
  // Toast notifications
  const { toast } = useToast()

  const placeholderSuggestions = [
    "What were our Q3 expenses?",
    "Summarize the Smith contract",
    "Show revenue trends",
    "Find all payment terms",
    "What are the key risks mentioned?",
    "Compare this quarter vs last quarter",
  ]

  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)

  // Load conversations and current conversation on component mount
  useEffect(() => {
    // Batch all initialization operations
    const initializeChat = async () => {
      // 🚀 SURGICAL FIX: Clean up invalid conversations first
      storage.cleanupInvalidConversations()
      
      // Load conversations from localStorage first
      const storedConversations = storage.loadConversations()
      setConversations(storedConversations)

      // Load current conversation ID
      const storedConversationId = storage.loadCurrentConversationId()
      if (storedConversationId && storedConversations.find(c => c.id === storedConversationId)) {
        setCurrentConversationId(storedConversationId)
      }

      // Then try to load from backend (this will update/sync with backend when available)
      await loadConversations()
    }

    initializeChat()
  }, [])

  // Load suggestions dismissal preference from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('docsflow_suggestions_dismissed')
    if (dismissed === 'true') {
      setSuggestionsDisabledPermanently(true)
    }
  }, [])

  // Batch localStorage saves to prevent multiple reflows
  useEffect(() => {
    // Use requestAnimationFrame to batch DOM operations
    requestAnimationFrame(() => {
      storage.saveConversations(conversations)
      storage.saveCurrentConversationId(currentConversationId)
      
      if (currentConversationId && messages.length > 1) {
        storage.saveMessages(currentConversationId, messages)
      }
    })
  }, [conversations, currentConversationId, messages])

  // Load conversation history when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      // First try to load from localStorage (instant)
      const storedMessages = storage.loadMessages(currentConversationId)
      if (storedMessages.length > 0) {
        setMessages(storedMessages)
      }
      
      // Then try to load from backend (will update if different)
      loadConversationHistory(currentConversationId)
    } else {
      // Reset to welcome message when no conversation selected
      setMessages([{
        id: "welcome",
        type: "ai",
        content: "Hello! I'm your business docsflow.app assistant. Upload your documents and ask me anything about them. I can analyze contracts, financial reports, invoices, and more.",
        timestamp: new Date(),
        confidence: 0.95,
        suggestions: [
          "Upload a document to get started",
          "What can you analyze?",
          "How does docsflow.app work?",
        ],
      }])
    }
  }, [currentConversationId])

  // Rotate placeholder suggestions
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholderSuggestions.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll messages to bottom when new messages arrive
  useEffect(() => {
    if (!scrollAreaRef.current) return
    
    const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement
    if (!scrollContainer) return
    
    // Simple immediate scroll to bottom
    setTimeout(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }, 100)
  }, [messages])

  // Load user's conversations (enhanced with localStorage fallback)
  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true)
      const response = await apiClient.getConversations()
      
      if (response.conversations && response.conversations.length > 0) {
        // Backend has conversations, use those and sync to localStorage
        setConversations(response.conversations)
        storage.saveConversations(response.conversations)
      }
      // If backend returns empty but we have localStorage conversations, keep those
      
    } catch (error) {
      console.error('Failed to load conversations:', error)
      // Keep using localStorage conversations on error
    } finally {
      setIsLoadingConversations(false)
    }
  }

  // Load specific conversation history (enhanced with localStorage)
  const loadConversationHistory = async (conversationId: string) => {
    try {
      const response = await apiClient.getConversationHistory(conversationId)
      
      if (response.messages && response.messages.length > 0) {
        // Backend has messages, use those and sync to localStorage
        setMessages(response.messages)
        storage.saveMessages(conversationId, response.messages)
      }
      // If backend returns empty, keep localStorage messages
      
    } catch (error) {
      console.error('Failed to load conversation history:', error)
      // Keep using localStorage messages on error
      
      // If no localStorage messages either, show error
      const storedMessages = storage.loadMessages(conversationId)
      if (storedMessages.length === 0) {
        setMessages([{
          id: "error",
          type: "ai",
          content: "Sorry, I couldn't load this conversation. Please try creating a new one.",
          timestamp: new Date(),
          confidence: 0.3,
        }])
      }
    }
  }

  // Create new conversation (enhanced with localStorage)
  const createNewConversation = async () => {
    try {
      setIsCreatingConversation(true)
      
      // Create locally first for instant feedback
      const localConversation: Conversation = {
        id: `local-${Date.now()}`,
        title: 'New Conversation',
        messageCount: 0,
        lastActivity: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
      
      // Clear messages and reset suggestions for new conversation
      setMessages([])
      setHiddenSuggestions(new Set())
      
      // Add to conversations and set as current
      setConversations(prev => [localConversation, ...prev])
      setCurrentConversationId(localConversation.id)
      setShowConversationHistory(false)
      
      // Try to create on backend
      try {
        const response = await apiClient.createConversation()
        
        if (response.conversation) {
          // Update with backend conversation ID
          const backendConversation: Conversation = {
            id: response.conversation.id,
            title: response.conversation.title,
            messageCount: 0,
            lastActivity: response.conversation.createdAt,
            createdAt: response.conversation.createdAt
          }
          
          // Replace local conversation with backend one
          setConversations(prev => 
            prev.map(conv => 
              conv.id === localConversation.id ? backendConversation : conv
            )
          )
          setCurrentConversationId(response.conversation.id)
        }
      } catch (backendError) {
        console.warn('Backend conversation creation failed, using local conversation:', backendError)
        // Continue with local conversation
      }
      
    } catch (error) {
      console.error('Failed to create conversation:', error)
    } finally {
      setIsCreatingConversation(false)
    }
  }

  // Switch to different conversation
  const switchToConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId)
    setShowConversationHistory(false)
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    // Create new conversation if none exists
    let conversationId = currentConversationId
    if (!conversationId) {
      try {
        setIsCreatingConversation(true)
        const response = await apiClient.createConversation(`${content.substring(0, 50)}...`)
        conversationId = response.conversation.id
        setCurrentConversationId(conversationId)
        
        // Add to conversations list
        const newConversation: Conversation = {
          id: response.conversation.id,
          title: response.conversation.title,
          messageCount: 0,
          lastActivity: response.conversation.createdAt,
          createdAt: response.conversation.createdAt
        }
        setConversations(prev => [newConversation, ...prev])
      } catch (error) {
        console.error('Failed to create conversation:', error)
        return
      } finally {
        setIsCreatingConversation(false)
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Add loading message with content
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      type: "loading",
      content: "Analyzing your documents...",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, loadingMessage])

    // 🎯 FIX: Track if response received to prevent race condition
    let responseReceived = false;

    // ✅ ADD TIMEOUT PROTECTION to prevent stuck analyzing state
    const timeoutId = setTimeout(() => {
      // 🎯 FIX: Only show timeout if response not already received
      if (responseReceived) {
        console.log('Response already received, skipping timeout message')
        return;
      }
      
      console.warn('API call timed out, showing fallback response')
      
      // Remove loading message
      setMessages((prev) => prev.filter((msg) => msg.type !== "loading"))
      
      // Add timeout error message
      const timeoutMessage: Message = {
        id: `timeout-${Date.now()}`,
        type: "ai",
        content: "I'm experiencing slow response times. The backend may be starting up or experiencing high load. Please try your question again in a moment.",
        timestamp: new Date(),
        confidence: 0.3,
        suggestions: [
          "Try asking again",
          "Check your connection",
          "Simplify your question"
        ]
      }
      setMessages((prev) => [...prev, timeoutMessage])
      setIsLoading(false)
    }, 15000) // 15 second timeout

    try {
      // Enhanced API call with conversation support
      const response = await apiClient.sendMessage({
        message: content,
        documentIds: [], // Add document filtering later
        conversationId: conversationId || undefined
      });

      // 🎯 FIX: Mark response as received before clearing timeout
      responseReceived = true;
      
      // Clear timeout since we got a response
      clearTimeout(timeoutId)

      // Remove loading message
      setMessages((prev) => prev.filter((msg) => msg.type !== "loading"))

      // Add AI response with real data
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        type: "ai",
        content: response.answer || response.response || "I received your message but couldn't generate a response.",
        timestamp: new Date(),
        sources: response.sources?.map((source: any) => ({
          document: source.filename || source.source || "Unknown Document",
          documentId: source.document_id,  // 🎯 FIX: Pass document UUID for loading full content
          page: source.metadata?.page || 1,
          snippet: source.content ? source.content.substring(0, 200) + '...' : "No snippet available",
          confidence: source.confidence
        })) || [],
        confidence: response.confidence || 0.7,
        suggestions: [
          "Tell me more about this",
          "Can you elaborate?",
          "Show me related information",
          "What else can you find?",
        ],
      }

      setMessages((prev) => [...prev, aiResponse])
      
      // Refresh conversations list to update message count and last activity
      await loadConversations()

    } catch (error) {
      console.error('Chat API Error:', error);
      
      // 🎯 FIX: Mark response as received (error counts as response)
      responseReceived = true;
      
      // Clear timeout
      clearTimeout(timeoutId)
      
      // Remove loading message
      setMessages((prev) => prev.filter((msg) => msg.type !== "loading"))
      
      // Add enhanced error message with better guidance
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: "ai",
        content: `I'm having trouble connecting to the backend. This might be because:
        
• The backend is starting up (this can take 30-60 seconds)
• Network connectivity issues
• CORS configuration problems

Please try again in a moment. If the issue persists, you can still use the interface with offline features.`,
        timestamp: new Date(),
        confidence: 0.3,
        suggestions: [
          "Try again in 30 seconds",
          "Check your internet connection",
          "Contact support if issue persists"
        ]
      };
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  const clearCurrentConversation = () => {
    setCurrentConversationId(null)
    setMessages([
      {
        id: "welcome",
        type: "ai",
        content:
          "Hello! I'm your business docsflow.app assistant. Upload your documents and ask me anything about them.",
        timestamp: new Date(),
        confidence: 0.95,
        suggestions: [
          "Upload a document to get started",
          "What can you analyze?",
          "How does docsflow.app work?",
        ],
      },
    ])
  }

  const exportChat = () => {
    const chatHistory = messages
      .filter((msg) => msg.type !== "loading")
      .map((msg) => ({
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
        sources: msg.sources,
      }))

    const blob = new Blob([JSON.stringify(chatHistory, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chat-history-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Minimal control bar integrated with layout */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 flex items-center justify-end shrink-0 w-full">
        <div className="flex items-center space-x-0.5">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowConversationHistory(!showConversationHistory)}
            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 h-6 px-2 text-xs"
          >
            <History className="h-3 w-3 mr-1" />
            History
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={createNewConversation} 
            disabled={isCreatingConversation}
            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 h-6 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Chat
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearCurrentConversation} 
            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 h-6 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Clear
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={exportChat} 
            className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 h-6 px-2 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0 w-full overflow-hidden">
        {/* Conversation History Sidebar */}
        {showConversationHistory && (
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Conversations</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your chat history</p>
            </div>
            
            <ScrollArea className="flex-1 p-3">
              {isLoadingConversations ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No conversations yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Start a new chat to begin</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => switchToConversation(conversation.id)}
                      className={`w-full text-left p-2 rounded-lg transition-colors ${
                        currentConversationId === conversation.id
                          ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {conversation.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {conversation.messageCount} messages
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(conversation.lastActivity).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden">
          {/* Current Conversation Info */}
          {currentConversationId && (
            <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 px-2 py-1 shrink-0 w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100 truncate">
                    {conversations.find(c => c.id === currentConversationId)?.title || 'New Conversation'}
                  </p>
                  <span className="text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
                    • Auto-saved
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs h-4 px-1.5 flex-shrink-0">
                  Persistent
                </Badge>
              </div>
            </div>
          )}

          <div className="flex-1 flex min-h-0 w-full max-w-full overflow-hidden">
            <div className="w-full max-w-full flex flex-col min-h-0 overflow-hidden">
              <ScrollArea ref={scrollAreaRef} className="flex-1 px-2 py-2 w-full max-w-full overflow-hidden">
                <div className="space-y-2 w-full max-w-full overflow-x-hidden box-border pr-2">
                  {messages.map((message) => (
                    <div key={message.id}>
                      {message.type === "user" && (
                        <div className="flex justify-end w-full max-w-full">
                          <div className="max-w-[85%] sm:max-w-[75%] min-w-0">
                            <div className="bg-blue-600 text-white rounded-xl rounded-br-md px-3 py-1.5 shadow-sm overflow-hidden">
                              <p className="text-sm leading-relaxed break-words overflow-wrap-anywhere word-wrap-break-word">{message.content}</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 text-right">
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      )}

                      {message.type === "ai" && (
                        <div className="flex justify-start w-full max-w-full">
                          <div className="max-w-[90%] sm:max-w-[80%] min-w-0">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl rounded-bl-md px-3 py-1.5 shadow-sm overflow-hidden box-border">
                              <div className="flex items-center space-x-1 mb-1">
                                <Sparkles className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">AI Assistant</span>
                              </div>

                              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed mb-1.5 break-words overflow-wrap-anywhere word-break-break-word">
                                {message.content}
                              </p>

                              {/* Sources */}
                              {message.sources && message.sources.length > 0 && (
                                <div className="border-t border-gray-100 dark:border-gray-700 pt-1.5 mt-1.5 w-full">
                                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sources:</p>
                                  <div className="space-y-1.5 w-full">
                                    {message.sources.map((source, idx) => (
                                      <button
                                        key={idx}
                                        className="flex items-start space-x-2 text-left w-full p-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                        onClick={() => {
                                          // 🎯 FIX: Only show sources with real document IDs
                                          if (!source.documentId) {
                                            console.warn('Source missing documentId:', source);
                                            return;
                                          }
                                          setSelectedSource({
                                            filename: source.document || 'Unknown Document',
                                            content: source.snippet || '',
                                            document_id: source.documentId,
                                            page: source.page,
                                            confidence: source.confidence || 0.7
                                          });
                                          setIsSourceModalOpen(true);
                                        }}
                                      >
                                        <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 break-words">
                                            {source.document} (page {source.page})
                                          </p>
                                          <p className="text-xs text-gray-600 dark:text-gray-400 break-words line-clamp-2">
                                            {source.snippet}
                                          </p>
                                          {source.confidence && (
                                            <Badge variant="outline" className="mt-1 text-xs">
                                              {Math.round(source.confidence * 100)}% confidence
                                            </Badge>
                                          )}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Confidence Indicator */}
                              {message.confidence && (
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                  <ConfidenceIndicator 
                                    score={message.confidence} 
                                    showLabel={true}
                                    size="sm"
                                  />
                                </div>
                              )}

                              {/* Follow-up Suggestions */}
                              {message.suggestions && message.suggestions.length > 0 && !hiddenSuggestions.has(message.id) && !suggestionsDisabledPermanently && (
                                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Ask about:</p>
                                    <button
                                      onClick={() => {
                                        // Permanently disable suggestions
                                        setSuggestionsDisabledPermanently(true)
                                        localStorage.setItem('docsflow_suggestions_dismissed', 'true')
                                      }}
                                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                      title="Don't show suggestions again"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {message.suggestions.map((suggestion, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                                      >
                                        {suggestion}
                                        <ChevronRight className="h-3 w-3 ml-1" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      )}

                      {message.type === "loading" && (
                        <div className="flex justify-start w-full">
                          <div className="max-w-[95%] sm:max-w-[85%] min-w-0">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl rounded-bl-md px-3 py-1.5 shadow-sm overflow-hidden">
                              <div className="flex items-center space-x-1 mb-1">
                                <Sparkles className="h-3 w-3 text-blue-600" />
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">AI Assistant</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                  <div
                                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                    style={{ animationDelay: "0.1s" }}
                                  ></div>
                                  <div
                                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                    style={{ animationDelay: "0.2s" }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                  Analyzing documents...
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 shrink-0 w-full max-w-full overflow-hidden">
                <div className="w-full max-w-full px-1">
                  <div className="flex items-end space-x-2 w-full max-w-full">
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0 bg-transparent"
                      onClick={() => {
                        // Create file input and trigger file selection
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.doc,.docx,.txt';
                        input.multiple = true;
                        input.onchange = async (e) => {
                          const files = (e.target as HTMLInputElement).files;
                          if (files && files.length > 0) {
                            try {
                              // Show initial upload toast
                              toast({
                                title: `Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`,
                                description: "Please wait while we process your documents.",
                              });

                              // Process files sequentially to prevent server overload
                              let successCount = 0;
                              let failedFiles: string[] = [];
                              
                              for (const file of Array.from(files)) {
                                try {
                                  console.log('Uploading file:', file.name);
                                  // Use the API client to upload
                                  const { apiClient } = await import('@/lib/api-client');
                                  await apiClient.uploadDocument(file);
                                  console.log('File uploaded successfully:', file.name);
                                  successCount++;
                                } catch (fileError) {
                                  console.error('File upload failed:', file.name, fileError);
                                  failedFiles.push(file.name);
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
                                  description: `Failed to upload ${failedFiles.length} file${failedFiles.length > 1 ? 's' : ''}. Please check file format and size (max 50MB).`,
                                  variant: "destructive",
                                });
                              }
                            } catch (error) {
                              console.error('Upload process failed:', error);
                              toast({
                                title: "Upload failed ❌",
                                description: "An unexpected error occurred during upload. Please try again.",
                                variant: "destructive",
                              });
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>

                    <div className="flex-1 min-w-0">
                      <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSendMessage(inputValue)
                          }
                        }}
                        placeholder={`Ask anything about your business documents... e.g., "${placeholderSuggestions[currentPlaceholder]}"`}
                        className="h-10 w-full resize-none rounded-xl border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
                        disabled={isLoading || isCreatingConversation}
                      />
                    </div>

                    <Button
                      onClick={() => handleSendMessage(inputValue)}
                      disabled={!inputValue.trim() || isLoading || isCreatingConversation}
                      className="flex-shrink-0 h-10 bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    AI can make mistakes. Verify important information with source documents.
                    {currentConversationId && <span className="text-blue-600"> • Conversation will be saved automatically</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 🚀 NEW: Source Viewer Modal */}
      {selectedSource && (
        <SourceViewerModal
          source={selectedSource}
          isOpen={isSourceModalOpen}
          onClose={() => {
            setIsSourceModalOpen(false);
            setSelectedSource(null);
          }}
        />
      )}
    </div>
  )
}
