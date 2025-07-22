"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Upload, Clock, MapPin, Phone, Mail } from "lucide-react"
import { useState } from "react"
import type { CompanySettings } from "@/types/settings"

interface CompanySettingsProps {
  settings: CompanySettings
  onUpdate: (data: Partial<CompanySettings>) => void
}

export function CompanySettings({ settings, onUpdate }: CompanySettingsProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setLogoFile(file)
      // In a real app, you would upload the file and get a URL
      const logoUrl = URL.createObjectURL(file)
      onUpdate({ logo: logoUrl })
    }
  }

  const updateBusinessHours = (day: string, field: string, value: string | boolean) => {
    const updatedHours = {
      ...settings.businessHours,
      [day]: {
        ...settings.businessHours[day],
        [field]: value,
      },
    }
    onUpdate({ businessHours: updatedHours })
  }

  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ]

  return (
    <div className="space-y-6">
      {/* Business Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Business Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input id="company-name" value={settings.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({ name: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={settings.industry} onValueChange={(value: string) => onUpdate({ industry: value as "motorcycle_dealer" | "warehouse_distribution" | "other" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorcycle_dealer">Motorcycle Dealership</SelectItem>
                  <SelectItem value="warehouse_distribution">Warehouse/Distribution</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  className="pl-10"
                  value={settings.contactInfo.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onUpdate({
                      contactInfo: { ...settings.contactInfo, phone: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  className="pl-10"
                  value={settings.contactInfo.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onUpdate({
                      contactInfo: { ...settings.contactInfo, email: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Business Address</Label>
            <Textarea
              id="address"
              value={`${settings.address.street}\n${settings.address.city}, ${settings.address.state} ${settings.address.zipCode}\n${settings.address.country}`}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                const lines = e.target.value.split("\n")
                const cityStateZip = lines[1]?.split(", ") || []
                const stateZip = cityStateZip[1]?.split(" ") || []

                onUpdate({
                  address: {
                    street: lines[0] || "",
                    city: cityStateZip[0] || "",
                    state: stateZip[0] || "",
                    zipCode: stateZip[1] || "",
                    country: lines[2] || "",
                  },
                })
              }}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={settings.timezone} onValueChange={(value: string) => onUpdate({ timezone: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {settings.logo && (
                <img
                  src={settings.logo || "/placeholder.svg"}
                  alt="Company Logo"
                  className="h-16 w-16 object-contain border rounded"
                />
              )}
              <div>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                <Button variant="outline" asChild>
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </label>
                </Button>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Business Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {days.map((day) => {
            const daySettings = settings.businessHours[day.key]

            return (
              <div key={day.key} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={daySettings.isOpen}
                                          onCheckedChange={(checked: boolean) => updateBusinessHours(day.key, "isOpen", checked)}
                  />
                  <span className="font-medium w-20">{day.label}</span>
                </div>

                {daySettings.isOpen ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={daySettings.openTime}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBusinessHours(day.key, "openTime", e.target.value)}
                      className="w-32"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="time"
                      value={daySettings.closeTime}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateBusinessHours(day.key, "closeTime", e.target.value)}
                      className="w-32"
                    />
                  </div>
                ) : (
                  <Badge variant="secondary">Closed</Badge>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Industry Customization */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Intent Types</Label>
            <div className="flex flex-wrap gap-2">
              {settings.customization.intentTypes.map((intent, index) => (
                <Badge key={index} variant="outline">
                  {intent}
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm">
              Manage Intent Types
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Urgency Keywords</Label>
            <div className="flex flex-wrap gap-2">
              {settings.customization.urgencyKeywords.map((keyword, index) => (
                <Badge key={index} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm">
              Manage Keywords
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
