'use client';

import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function SettingsPage() {
  const { tenant, loading, error } = useTenant();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Tenant not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="text-4xl mr-3">{tenant.emoji}</span>
              Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Configure your {tenant.subdomain} workspace
            </p>
          </div>
          <div className="flex space-x-3">
            <Button asChild variant="outline">
              <Link href="/">📊 Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/leads">👥 Leads</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/analytics">📈 Analytics</Link>
            </Button>
          </div>
        </div>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <Input id="subdomain" value={tenant.subdomain} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emoji">Brand Emoji</Label>
                <Input id="emoji" value={tenant.emoji} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company Name</Label>
              <Input id="company" placeholder="Enter your company name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input id="email" type="email" placeholder="contact@company.com" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* AI Lead Router Settings */}
        <Card>
          <CardHeader>
            <CardTitle>AI Lead Router Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qualification-threshold">Lead Qualification Threshold</Label>
              <Input id="qualification-threshold" type="number" placeholder="75" />
              <p className="text-sm text-gray-500">Minimum score (0-100) for lead qualification</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auto-assignment">Auto Assignment Rules</Label>
              <select className="w-full p-2 border rounded-md">
                <option>Round Robin</option>
                <option>Score Based</option>
                <option>Manual Only</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-email">Notification Email</Label>
              <Input id="notification-email" type="email" placeholder="notifications@company.com" />
            </div>
            <Button>Update AI Settings</Button>
          </CardContent>
        </Card>

        {/* Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">CRM Integration</h3>
                  <p className="text-sm text-gray-500">Connect your CRM system</p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Email Marketing</h3>
                  <p className="text-sm text-gray-500">Sync with email campaigns</p>
                </div>
                <Button variant="outline">Connect</Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">Analytics Tracking</h3>
                  <p className="text-sm text-gray-500">Google Analytics & tracking pixels</p>
                </div>
                <Button variant="outline">Setup</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { label: "New Lead Notifications", description: "Get notified when new leads are captured" },
                { label: "Daily Reports", description: "Receive daily performance summaries" },
                { label: "Conversion Alerts", description: "Alert when leads convert to customers" },
                { label: "System Updates", description: "Important system and feature updates" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{item.label}</h4>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <input type="checkbox" className="h-4 w-4" defaultChecked={index < 2} />
                </div>
              ))}
            </div>
            <Button>Save Preferences</Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-red-600">Delete Workspace</h3>
                <p className="text-sm text-red-500">Permanently delete this workspace and all data</p>
              </div>
              <Button variant="destructive">Delete</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 