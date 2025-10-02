"use client"

import ChatInterface from "@/components/chat-interface"
import { useEffect } from "react"

export default function ChatPage() {
  // Prevent viewport shifts when messages are added
  useEffect(() => {
    // Prevent scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    
    // Lock scroll position
    const lockScroll = () => {
      window.scrollTo(0, 0)
    }
    
    window.addEventListener('scroll', lockScroll, { passive: false })
    
    return () => {
      window.removeEventListener('scroll', lockScroll)
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto'
      }
    }
  }, [])
  
  return (
    <div className="h-full w-full max-w-full overflow-hidden">
      <ChatInterface />
    </div>
  )
}
