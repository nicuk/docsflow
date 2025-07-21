"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { GitBranch, Plus, Edit, Trash2, GripVertical, TestTube } from "lucide-react"
import { useState } from "react"
import type { RoutingRule } from "@/types/settings"

interface RoutingRulesProps {
  rules: RoutingRule[]
  onUpdate: (rules: RoutingRule[]) => void
}

export function RoutingRules({ rules, onUpdate }: RoutingRulesProps) {
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const intents = [
    "Sales Inquiry",
    "Service Appointment",
    "Parts Request",
    "Financing",
    "Warranty",
    "Quote Request",
    "Order Status",
    "Shipping Inquiry",
  ]
  const users = ["sarah@company.com", "mike@company.com", "lisa@company.com"]
  const departments = ["sales", "service", "parts", "support"]

  const handleCreateRule = () => {
    const newRule: RoutingRule = {
      id: Date.now().toString(),
      name: "New Rule",
      intent: [],
      conditions: {},
      destination: { type: "user", value: "" },
      priority: rules.length + 1,
      isActive: true,
    }
    setEditingRule(newRule)
    setIsDialogOpen(true)
  }

  const handleEditRule = (rule: RoutingRule) => {
    setEditingRule({ ...rule })
    setIsDialogOpen(true)
  }

  const handleSaveRule = () => {
    if (!editingRule) return

    const existingIndex = rules.findIndex((r) => r.id === editingRule.id)
    if (existingIndex >= 0) {
      const updatedRules = [...rules]
      updatedRules[existingIndex] = editingRule
      onUpdate(updatedRules)
    } else {
      onUpdate([...rules, editingRule])
    }

    setEditingRule(null)
    setIsDialogOpen(false)
  }

  const handleDeleteRule = (ruleId: string) => {
    onUpdate(rules.filter((r) => r.id !== ruleId))
  }

  const toggleRuleActive = (ruleId: string) => {
    const updatedRules = rules.map((rule) => (rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule))
    onUpdate(updatedRules)
  }

  const testRule = (rule: RoutingRule) => {
    console.log("Testing rule:", rule)
    // In a real app, this would test the rule with sample data
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Routing Rules
            </div>
            <Button onClick={handleCreateRule}>
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No routing rules configured</p>
                <p className="text-sm">Create your first rule to start routing leads automatically</p>
              </div>
            ) : (
              rules
                .sort((a, b) => a.priority - b.priority)
                .map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.name}</span>
                            <Badge variant="outline">Priority {rule.priority}</Badge>
                            {!rule.isActive && <Badge variant="secondary">Inactive</Badge>}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span>Intents: {rule.intent.join(", ") || "Any"}</span>
                            {rule.conditions.urgencyThreshold && (
                              <span> • Urgency ≥ {rule.conditions.urgencyThreshold}</span>
                            )}
                            {rule.conditions.businessHoursOnly && <span> • Business hours only</span>}
                          </div>
                          <div className="text-sm text-gray-500">
                            Routes to: {rule.destination.type} ({rule.destination.value})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch checked={rule.isActive} onCheckedChange={() => toggleRuleActive(rule.id)} />
                        <Button variant="outline" size="sm" onClick={() => testRule(rule)}>
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditRule(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rule Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule?.id && rules.find((r) => r.id === editingRule.id) ? "Edit Rule" : "Create Rule"}
            </DialogTitle>
          </DialogHeader>

          {editingRule && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Intent Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {intents.map((intent) => (
                    <label key={intent} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editingRule.intent.includes(intent)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingRule({
                              ...editingRule,
                              intent: [...editingRule.intent, intent],
                            })
                          } else {
                            setEditingRule({
                              ...editingRule,
                              intent: editingRule.intent.filter((i) => i !== intent),
                            })
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{intent}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label>Conditions</Label>

                <div className="space-y-2">
                  <Label>Urgency Threshold</Label>
                  <div className="px-3">
                    <Slider
                      value={[editingRule.conditions.urgencyThreshold || 0]}
                      onValueChange={([value]) =>
                        setEditingRule({
                          ...editingRule,
                          conditions: { ...editingRule.conditions, urgencyThreshold: value },
                        })
                      }
                      max={1}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Low (0)</span>
                      <span>Current: {editingRule.conditions.urgencyThreshold?.toFixed(1) || "0.0"}</span>
                      <span>High (1)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="business-hours"
                    checked={editingRule.conditions.businessHoursOnly || false}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        conditions: { ...editingRule.conditions, businessHoursOnly: e.target.checked },
                      })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="business-hours">Business hours only</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Textarea
                    id="keywords"
                    value={editingRule.conditions.keywords?.join(", ") || ""}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        conditions: {
                          ...editingRule.conditions,
                          keywords: e.target.value
                            .split(",")
                            .map((k) => k.trim())
                            .filter((k) => k),
                        },
                      })
                    }
                    placeholder="urgent, asap, emergency"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Destination</Label>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={editingRule.destination.type}
                      onValueChange={(value) =>
                        setEditingRule({
                          ...editingRule,
                          destination: { ...editingRule.destination, type: value as any },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Specific User</SelectItem>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="email">Email Address</SelectItem>
                        <SelectItem value="webhook">Webhook URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Value</Label>
                    {editingRule.destination.type === "user" ? (
                      <Select
                        value={editingRule.destination.value}
                        onValueChange={(value) =>
                          setEditingRule({
                            ...editingRule,
                            destination: { ...editingRule.destination, value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user} value={user}>
                              {user}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : editingRule.destination.type === "department" ? (
                      <Select
                        value={editingRule.destination.value}
                        onValueChange={(value) =>
                          setEditingRule({
                            ...editingRule,
                            destination: { ...editingRule.destination, value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={editingRule.destination.value}
                        onChange={(e) =>
                          setEditingRule({
                            ...editingRule,
                            destination: { ...editingRule.destination, value: e.target.value },
                          })
                        }
                        placeholder={
                          editingRule.destination.type === "email" ? "user@company.com" : "https://webhook.url"
                        }
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRule}>Save Rule</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
