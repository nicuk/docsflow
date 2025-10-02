"use client"

import ChatInterface from "@/components/chat-interface"
import { useEffect } from "react"

export default function ChatPage() {
  // Prevent body scroll on chat page only
  useEffect(() => {
    // Save original overflow
    const originalOverflow = document.body.style.overflow
    
    // Lock body scroll (but don't change position to avoid layout issues)
    document.body.style.overflow = 'hidden'
    
    // Restore on unmount
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])
  
  return (
    <div className="h-full w-full max-w-full overflow-hidden">
      <ChatInterface />
    </div>
  )
}
