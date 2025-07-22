"use client"

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface AIAnalysisPanelProps {
  leadDetail: any;
  industry: "motorcycle" | "warehouse";
  onSendResponse: (content: string, template?: any) => void;
  onAssign?: (userId: string, reason: string) => void;
  onStatusChange?: (status: string) => void;
}

export const AIAnalysisPanel = ({ leadDetail, industry, onSendResponse, onStatusChange, onAssign }: AIAnalysisPanelProps) => {
  const [responseMode, setResponseMode] = useState<"template" | "custom">("template");
  const [selectedTemplate, setSelectedTemplate] = useState("follow-up");
  const [customMessage, setCustomMessage] = useState("");

  // Helper functions
  const getIntentColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleQuickAction = (action: string) => {
    console.log('Quick action:', action);
  };

  const insertVariable = (variable: string) => {
    setCustomMessage(prev => prev + `{${variable}}`);
  };

  // Mock AI analysis data
  const aiAnalysis = {
    intent: {
      type: "Purchase Inquiry",
      confidence: 0.92,
      alternatives: ["Information Request", "Price Check"]
    },
    sentiment: {
      overall: "Positive",
      confidence: 0.87,
      factors: ["Excited tone", "Multiple questions", "Specific requirements"]
    },
    priority: "High",
    urgency: {
      level: "Medium",
      reasoning: "Specific product inquiry with timeline mentioned"
    },
    nextBestAction: {
      action: "Schedule Product Demo",
      confidence: 0.89,
      reasoning: "Customer shows strong purchase intent and asked specific technical questions"
    },
    keyInsights: [
      "Customer mentioned budget of $50K+",
      "Needs solution by Q2",
      "Previously used competitor product",
      "Decision maker confirmed"
    ],
    suggestedResponse: {
      tone: "Professional",
      urgency: "Within 2 hours",
      approach: "Direct product demo offer"
    }
  };

  const templates = [
    {
      id: "follow-up",
      name: "Follow-up Inquiry",
      tone: "professional",
      content: "Thank you for your interest in {product}. I'd be happy to schedule a call to discuss your requirements.",
      variables: ["product", "name", "company"]
    },
    {
      id: "demo-offer",
      name: "Demo Offer",
      tone: "friendly",
      content: "Hi {name}, I'd love to show you how {product} can solve your {pain_point}. When would be a good time for a quick demo?",
      variables: ["name", "product", "pain_point"]
    },
    {
      id: "urgent-response",
      name: "Urgent Response",
      tone: "urgent",
      content: "Hi {name}, I saw your urgent inquiry about {topic}. Let me connect you with our specialist right away.",
      variables: ["name", "topic"]
    }
  ];

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      {/* AI Analysis Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Intent Classification */}
          <div>
            <h4 className="font-medium mb-2">Intent Classification</h4>
            <div className="space-y-2">
              <Badge className={getIntentColor(aiAnalysis.intent.confidence)}>
                {aiAnalysis.intent.type} ({Math.round(aiAnalysis.intent.confidence * 100)}%)
              </Badge>

              {aiAnalysis.intent.alternatives && aiAnalysis.intent.alternatives.length > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Alternatives: </span>
                  {aiAnalysis.intent.alternatives.join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div>
            <h4 className="font-medium mb-2">Sentiment & Priority</h4>
            <div className="flex gap-2">
              <Badge variant="outline">
                {aiAnalysis.sentiment.overall} ({Math.round(aiAnalysis.sentiment.confidence * 100)}%)
              </Badge>
              <Badge className={getPriorityColor(aiAnalysis.priority)}>
                {aiAnalysis.priority} Priority
              </Badge>
            </div>
          </div>

          {/* Next Best Action */}
          <div>
            <h4 className="font-medium mb-2">Recommended Action</h4>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-medium text-blue-900">{aiAnalysis.nextBestAction.action}</div>
              <div className="text-sm text-blue-700 mt-1">
                Confidence: {Math.round(aiAnalysis.nextBestAction.confidence * 100)}%
              </div>
              <div className="text-sm text-blue-600 mt-1">
                {aiAnalysis.nextBestAction.reasoning}
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div>
            <h4 className="font-medium mb-2">Key Insights</h4>
            <ul className="space-y-1">
              {aiAnalysis.keyInsights.map((insight, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Response Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>Suggested Response</CardTitle>
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
            <div className="space-y-4">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Choose Template</label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Preview */}
              {selectedTemplateData && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="font-medium mb-1">{selectedTemplateData.name}</div>
                  <p className="text-gray-600 mb-2">{selectedTemplateData.content}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {selectedTemplateData.tone}
                    </Badge>
                    {selectedTemplateData.variables.map((variable: string) => (
                      <Badge key={variable} variant="secondary">
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleQuickAction('call')}
                  className="flex-1"
                >
                  Schedule Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickAction('email')}
                  className="flex-1"
                >
                  Send Email
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium mb-2">Custom Message</label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Write your custom response..."
                  rows={4}
                />
              </div>

              {/* Variable Helpers */}
              <div>
                <label className="block text-sm font-medium mb-2">Insert Variables</label>
                <div className="flex gap-2 flex-wrap">
                  {["name", "company", "product", "phone", "email"].map((variable) => (
                    <Button key={variable} variant="outline" size="sm" onClick={() => insertVariable(variable)}>
                      {variable}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Updates */}
          <div>
            <label className="block text-sm font-medium mb-2">Update Status</label>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                In Progress
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                Qualified
              </Button>
            </div>
          </div>

          <Separator />

          {/* Priority Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onStatusChange?.("responded")}>
              Mark Responded
            </Button>
            <Button variant="outline" size="sm" onClick={() => onStatusChange?.("routed")}>
              Route to Specialist
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
            <Select onValueChange={(userId: string) => onAssign?.(userId, "Manual assignment")}>
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
  );
};
