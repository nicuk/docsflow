"use client"

import ChatInterface from "@/components/chat-interface"
import { useEffect } from "react"

export default function ChatPage() {
  // Prevent body scroll on chat page only
  useEffect(() => {
    // Save original overflow
    const originalOverflow = document.body.style.overflow
    const originalPosition = document.body.style.position
    
    // Lock body scroll
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    
    // Restore on unmount
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.position = originalPosition
      document.body.style.width = ''
      document.body.style.height = ''
    }
  }, [])
  
  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden">
      <ChatInterface />
    </div>
  )
}
