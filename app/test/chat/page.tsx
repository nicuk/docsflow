"use client"

import ChatInterfaceTest from "@/components/chat-interface-test"

/**
 * 🧪 TEST/DEMO CHAT INTERFACE - EXACT CLONE
 * 
 * Access at: http://localhost:3001/test/chat
 * 
 * WORKFLOW:
 * 1. Run dev server: npm run dev -- -p 3001
 * 2. Navigate to http://localhost:3001/test/chat
 * 3. Make UI/UX changes in components/chat-interface-test.tsx
 * 4. Test changes locally in real-time
 * 5. Once satisfied, copy changes to components/chat-interface.tsx
 * 6. Deploy to production
 * 
 * This is an EXACT CLONE of the production chat interface.
 * All functionality, styling, and behavior are identical.
 */
export default function TestChatPage() {
  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Test mode indicator - remove in production */}
      <div className="bg-yellow-100 dark:bg-yellow-900 border-b border-yellow-300 dark:border-yellow-700 px-4 py-1.5 shrink-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
              🧪 TEST MODE
            </span>
            <span className="text-xs text-yellow-700 dark:text-yellow-300">
              localhost:3001/test/chat • Exact clone for UI/UX iteration
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <a 
              href="/dashboard/chat" 
              className="text-xs px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 hover:bg-yellow-300 dark:hover:bg-yellow-700 rounded transition-colors"
            >
              Live Version
            </a>
            <span className="text-xs text-yellow-600 dark:text-yellow-400">
              Edit: components/chat-interface-test.tsx
            </span>
          </div>
        </div>
      </div>

      {/* Exact clone of production chat interface */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatInterfaceTest />
      </div>
    </div>
  )
}
