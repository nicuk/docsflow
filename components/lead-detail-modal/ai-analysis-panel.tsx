"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Brain, Clock, Zap, Send, Calendar, Users } from "lucide-react"
import { useState } from "react"
import type { LeadDetail, ResponseTemplate } from "@/types/lead-detail"
import { mockResponseTemplates } from "@/lib/mock-lead-detail"

interface AIAnalysisPanelProps {
  leadDetail: LeadDetail
  industry: "motorcycle" | "warehouse"
  onSendResponse?: (content: string, template?: ResponseTemplate) => void
  onAssign?: (userId: string, reason: string) => void
  onStatusChange?: (status: string) => void
}

export function AIAnalysisPanel({
  leadDetail,
  industry,
  onSendResponse,
  onAssign,
  onStatusChange,
}: AIAnalysisPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ResponseTemplate | null>(null)
  const [customResponse, setCustomResponse] = useState("")
  const [responseMode, setResponseMode] = useState<"template" | "custom">("template")

  const { aiAnalysis } = leadDetail
  const urgencyPercentage = Math.round(aiAnalysis.urgency.score * 100)

  const getUrgencyColor = () => {
    if (aiAnalysis.urgency.score > 0.7) return "text-red-600"
    if (aiAnalysis.urgency.score > 0.3) return "text-yellow-600"
    return "text-green-600"
  }

  const getIntentColor = (confidence: number) => {
    if (confidence > 0.8) return "bg-green-100 text-green-800"
    if (confidence > 0.6) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const relevantTemplates = mockResponseTemplates.filter((template) => template.intent === aiAnalysis.intent.type)

  const handleSendResponse = () => {
    if (responseMode === "template" && selectedTemplate) {
      onSendResponse?.(selectedTemplate.content, selectedTemplate)
    } else if (responseMode === "custom" && customResponse.trim()) {
      onSendResponse?.(customResponse)
    }
    setCustomResponse("")
    setSelectedTemplate(null)
  }

  const insertVariable = (variable: string) => {
    setCustomResponse((prev) => prev + `{${variable}}`)
  }

  return (
    <div className="flex flex-col h-full space-y-4 p-4">
      {/* AI Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Intent Classification */}
          <div>
            <h4 className="font-medium mb-2">Intent Classification</h4>
            <div className="space-y-2">
              <Badge className={getIntentColor(aiAnalysis.intent.confidence)} size="lg">
                {aiAnalysis.intent.type} ({Math.round(aiAnalysis.intent.confidence * 100)}%)
              </Badge>

              {aiAnalysis.intent.alternatives && aiAnalysis.intent.alternatives.length > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Alternatives: </span>
                  {aiAnalysis.intent.alternatives.map((alt, index) => (
                    <span key={index}>
                      {alt.type} ({Math.round(alt.confidence * 100)}%)
                      {index < aiAnalysis.intent.alternatives!.length - 1 && ", "}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Urgency Assessment */}
          <div>
            <h4 className="font-medium mb-2">Urgency Assessment</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Progress value={urgencyPercentage} className="flex-1" />
                <span className={`font-medium ${getUrgencyColor()}`}>{urgencyPercentage}%</span>
              </div>
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" />
                  {aiAnalysis.urgency.recommendation}
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {aiAnalysis.urgency.factors.map((factor, index) => (
                    <li key={index}>{factor}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Key Details */}
          <div>
            <h4 className="font-medium mb-2">Key Details Extracted</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(aiAnalysis.details).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-2 rounded">
                  <div className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                  <div className="text-gray-600">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Reasoning */}
          <div>
            <h4 className="font-medium mb-2">AI Reasoning</h4>
            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded">{aiAnalysis.reasoning}</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Response */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-green-600" />
            Quick Response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Response Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={responseMode === "template" ? "default" : "outline"}
              size="sm"
              onClick={() => setResponseMode("template")}
            >
              Template
            </Button>
            <Button
              variant={responseMode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setResponseMode("custom")}
            >
              Custom
            </Button>
          </div>

          {responseMode === "template" ? (
            <div className="space-y-3">
              <Select
                onValueChange={(value) => {
                  const template = relevantTemplates.find((t) => t.id === value)
                  setSelectedTemplate(template || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {relevantTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplate && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="font-medium mb-1">{selectedTemplate.name}</div>
                  <p className="text-gray-600 mb-2">{selectedTemplate.content}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" size="sm">
                      {selectedTemplate.tone}
                    </Badge>
                    {selectedTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" size="sm">
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                placeholder="Type your custom response..."
                value={customResponse}
                onChange={(e) => setCustomResponse(e.target.value)}
                rows={4}
              />
              <div className="flex flex-wrap gap-1">
                {["customer_name", "business_hours", "company_name"].map((variable) => (
                  <Button key={variable} variant="outline" size="sm" onClick={() => insertVariable(variable)}>
                    {`{${variable}}`}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-gray-500">{customResponse.length}/500 characters</div>
            </div>
          )}

          {/* Send Options */}
          <div className="space-y-2">
            <Button
              onClick={handleSendResponse}
              disabled={
                (responseMode === "template" && !selectedTemplate) ||
                (responseMode === "custom" && !customResponse.trim())
              }
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Send via {leadDetail.channel}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                <Users className="h-4 w-4 mr-1" />
                CC Team
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-orange-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => onStatusChange?.("responded")}>
              Mark Responded
            </Button>
            <Button variant="outline" size="sm" onClick={() => onStatusChange?.("routed")}>
              Route Lead
            </Button>
            <Button variant="outline" size="sm" onClick={() => onStatusChange?.("closed")}>
              Close Lead
            </Button>
            <Button variant="outline" size="sm">
              Escalate
            </Button>
          </div>

          <Separator />

          <div>
            <Select onValueChange={(userId) => onAssign?.(userId, "Manual assignment")}>
              <SelectTrigger>
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent-1">Sarah Johnson</SelectItem>
                <SelectItem value="agent-2">Mike Wilson</SelectItem>
                <SelectItem value="agent-3">Lisa Chen</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
