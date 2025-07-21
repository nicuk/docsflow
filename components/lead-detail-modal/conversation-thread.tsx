"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Copy, Languages, Reply } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Message } from "@/types/lead-detail"

interface ConversationThreadProps {
  messages: Message[]
  onReply?: (messageId: string) => void
}

export function ConversationThread({ messages, onReply }: ConversationThreadProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return diffMins < 1 ? "Just now" : `${diffMins}m ago`
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`
    }
    return date.toLocaleDateString()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Conversation</h3>
        <p className="text-sm text-gray-500">{messages.length} messages</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const showTimestamp =
              index === 0 ||
              new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 5 * 60 * 1000

            return (
              <div key={message.id} className="space-y-2">
                {showTimestamp && (
                  <div className="flex justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full cursor-help">
                            {formatTime(message.timestamp)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{new Date(message.timestamp).toLocaleString()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {message.direction === "system" ? (
                  <div className="flex justify-center">
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">{message.content}</div>
                  </div>
                ) : (
                  <div className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`flex max-w-[80%] ${message.direction === "outbound" ? "flex-row-reverse" : "flex-row"} gap-2`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={message.author?.avatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {message.direction === "inbound" ? "C" : message.author?.name?.charAt(0) || "A"}
                        </AvatarFallback>
                      </Avatar>

                      <div className={`group relative ${message.direction === "outbound" ? "mr-2" : "ml-2"}`}>
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            message.direction === "outbound" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                          {message.isTemplate && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Template
                            </Badge>
                          )}

                          {message.isAutoResponse && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Auto-response
                            </Badge>
                          )}
                        </div>

                        {/* Message Actions */}
                        <div
                          className={`absolute top-0 ${message.direction === "outbound" ? "right-full mr-2" : "left-full ml-2"} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => copyToClipboard(message.content)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy message</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {message.direction === "inbound" && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <Languages className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Translate</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => onReply?.(message.id)}
                                    >
                                      <Reply className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reply to message</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
