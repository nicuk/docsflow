"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Mail, Globe, CheckCircle, XCircle, Eye, EyeOff, TestTube } from "lucide-react"
import { useState } from "react"
import type { ChannelSettings } from "@/types/settings"

interface ChannelConfigurationProps {
  settings: ChannelSettings
  onUpdate: (data: Partial<ChannelSettings>) => void
}

export function ChannelConfiguration({ settings, onUpdate }: ChannelConfigurationProps) {
  const [showTokens, setShowTokens] = useState(false)

  const testConnection = (channel: string) => {
    console.log(`Testing ${channel} connection...`)
    // In a real app, this would test the actual connection
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="forms" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Forms
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Configuration */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  WhatsApp Business API
                </div>
                <div className="flex items-center gap-2">
                  {settings.whatsapp.isConnected ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Disconnected
                    </Badge>
                  )}
                  <Button variant="outline" size="sm" onClick={() => testConnection("whatsapp")}>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-number-id">Phone Number ID</Label>
                  <Input
                    id="phone-number-id"
                    value={settings.whatsapp.phoneNumberId}
                    onChange={(e) =>
                      onUpdate({
                        whatsapp: { ...settings.whatsapp, phoneNumberId: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-account-id">Business Account ID</Label>
                  <Input
                    id="business-account-id"
                    value={settings.whatsapp.businessAccountId}
                    onChange={(e) =>
                      onUpdate({
                        whatsapp: { ...settings.whatsapp, businessAccountId: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="access-token">Access Token</Label>
                <div className="relative">
                  <Input
                    id="access-token"
                    type={showTokens ? "text" : "password"}
                    value={settings.whatsapp.accessToken}
                    onChange={(e) =>
                      onUpdate({
                        whatsapp: { ...settings.whatsapp, accessToken: e.target.value },
                      })
                    }
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowTokens(!showTokens)}
                  >
                    {showTokens ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-token">Webhook Verify Token</Label>
                <Input
                  id="webhook-token"
                  type={showTokens ? "text" : "password"}
                  value={settings.whatsapp.webhookVerifyToken}
                  onChange={(e) =>
                    onUpdate({
                      whatsapp: { ...settings.whatsapp, webhookVerifyToken: e.target.value },
                    })
                  }
                />
              </div>

              {/* Rate Limits */}
              <div className="space-y-2">
                <Label>Rate Limits</Label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Usage</span>
                    <span>
                      {settings.whatsapp.rateLimits.current} / {settings.whatsapp.rateLimits.limit}
                    </span>
                  </div>
                  <Progress
                    value={(settings.whatsapp.rateLimits.current / settings.whatsapp.rateLimits.limit) * 100}
                    className="h-2"
                  />
                </div>
              </div>

              {/* Templates */}
              <div className="space-y-2">
                <Label>Message Templates</Label>
                <div className="space-y-2">
                  {settings.whatsapp.templates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-500">{template.category}</div>
                      </div>
                      <Badge variant={template.status === "approved" ? "default" : "secondary"}>
                        {template.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm">
                  Manage Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Configuration */}
        <TabsContent value="email" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Inbound Email */}
            <Card>
              <CardHeader>
                <CardTitle>Inbound Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inbound-email">Lead Capture Email</Label>
                  <Input
                    id="inbound-email"
                    value={settings.email.inbound.email}
                    onChange={(e) =>
                      onUpdate({
                        email: {
                          ...settings.email,
                          inbound: { ...settings.email.inbound, email: e.target.value },
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    value={settings.email.inbound.webhookUrl}
                    onChange={(e) =>
                      onUpdate({
                        email: {
                          ...settings.email,
                          inbound: { ...settings.email.inbound, webhookUrl: e.target.value },
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Parsing Rules</Label>
                  <div className="space-y-1">
                    {settings.email.inbound.parsingRules.map((rule, index) => (
                      <Badge key={index} variant="outline">
                        {rule}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outbound Email */}
            <Card>
              <CardHeader>
                <CardTitle>Outbound Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="from-name">From Name</Label>
                  <Input
                    id="from-name"
                    value={settings.email.outbound.fromName}
                    onChange={(e) =>
                      onUpdate({
                        email: {
                          ...settings.email,
                          outbound: { ...settings.email.outbound, fromName: e.target.value },
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-email">From Email</Label>
                  <Input
                    id="from-email"
                    value={settings.email.outbound.fromEmail}
                    onChange={(e) =>
                      onUpdate({
                        email: {
                          ...settings.email,
                          outbound: { ...settings.email.outbound, fromEmail: e.target.value },
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Delivery Tracking</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={settings.email.outbound.trackDelivery}
                      onCheckedChange={(checked: boolean) =>
                        onUpdate({
                          email: {
                            ...settings.email,
                            outbound: { ...settings.email.outbound, trackDelivery: checked },
                          },
                        })
                      }
                    />
                    <span className="text-sm">Track email opens and clicks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Forms Configuration */}
        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Contact Forms
                </div>
                <Button>Create New Form</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settings.forms.map((form) => (
                  <div key={form.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{form.name}</h3>
                        <p className="text-sm text-gray-500">{form.fields.length} fields</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{form.analytics.submissions} submissions</Badge>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Integration Code</Label>
                      <div className="bg-gray-50 p-2 rounded text-xs font-mono">{form.integrationCode}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span>CAPTCHA: {form.spamProtection.captcha ? "Enabled" : "Disabled"}</span>
                        <span>Sources: {form.analytics.sources.join(", ")}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Analytics
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
