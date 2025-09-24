"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  AlertCircle,
  Bell,
  Calendar,
  Check,
  CreditCard,
  Download,
  DropletIcon as Dropbox,
  Eye,
  EyeOff,
  FileText,
  Globe,
  HardDrive,
  Info,
  Key,
  Laptop,
  Lock,
  LogOut,
  RefreshCw,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  User,
  Webhook,
  X,
  Settings,
} from "lucide-react"
// Removed Tremor dependency - using native chart components

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import SAMLConfiguration from "@/components/admin/saml-configuration"
import { useAuth } from "@/contexts/AuthContext"

// Sample usage data for charts
const usageData = [
  { name: "Jan", documents: 65, apiCalls: 240, storage: 24 },
  { name: "Feb", documents: 59, apiCalls: 220, storage: 22 },
  { name: "Mar", documents: 80, apiCalls: 260, storage: 27 },
  { name: "Apr", documents: 81, apiCalls: 290, storage: 30 },
  { name: "May", documents: 56, apiCalls: 190, storage: 21 },
  { name: "Jun", documents: 55, apiCalls: 185, storage: 20 },
  { name: "Jul", documents: 40, apiCalls: 150, storage: 15 },
]

// Sample billing history
const billingHistory = [
  {
    id: "INV-001",
    date: "Jul 1, 2023",
    amount: "$49.99",
    status: "Paid",
    plan: "Business Pro",
  },
  {
    id: "INV-002",
    date: "Jun 1, 2023",
    amount: "$49.99",
    status: "Paid",
    plan: "Business Pro",
  },
  {
    id: "INV-003",
    date: "May 1, 2023",
    amount: "$49.99",
    status: "Paid",
    plan: "Business Pro",
  },
  {
    id: "INV-004",
    date: "Apr 1, 2023",
    amount: "$29.99",
    status: "Paid",
    plan: "Business Basic",
  },
]

// Sample active sessions
const activeSessions = [
  {
    id: "session-1",
    device: "Chrome on Windows",
    location: "New York, USA",
    ip: "192.168.1.1",
    lastActive: "Just now",
    isCurrent: true,
  },
  {
    id: "session-2",
    device: "Safari on macOS",
    location: "San Francisco, USA",
    ip: "192.168.1.2",
    lastActive: "2 hours ago",
    isCurrent: false,
  },
  {
    id: "session-3",
    device: "Firefox on Ubuntu",
    location: "Toronto, Canada",
    ip: "192.168.1.3",
    lastActive: "1 day ago",
    isCurrent: false,
  },
]

// Sample security log
const securityLog = [
  {
    id: "log-1",
    event: "Password changed",
    date: "Jul 15, 2023",
    time: "14:32",
    ip: "192.168.1.1",
    location: "New York, USA",
  },
  {
    id: "log-2",
    event: "Login successful",
    date: "Jul 14, 2023",
    time: "09:15",
    ip: "192.168.1.1",
    location: "New York, USA",
  },
  {
    id: "log-3",
    event: "Failed login attempt",
    date: "Jul 13, 2023",
    time: "22:43",
    ip: "192.168.1.4",
    location: "Beijing, China",
  },
  {
    id: "log-4",
    event: "Two-factor authentication enabled",
    date: "Jul 10, 2023",
    time: "11:27",
    ip: "192.168.1.1",
    location: "New York, USA",
  },
]

// Sample plan comparison
const planComparison = [
  {
    feature: "Document Processing",
    free: "50/month",
    basic: "500/month",
    pro: "Unlimited",
  },
  {
    feature: "API Calls",
    free: "1,000/month",
    basic: "10,000/month",
    pro: "100,000/month",
  },
  {
    feature: "Storage",
    free: "5 GB",
    basic: "50 GB",
    pro: "500 GB",
  },
  {
    feature: "Team Members",
    free: "1",
    basic: "5",
    pro: "Unlimited",
  },
  {
    feature: "Advanced Analytics",
    free: false,
    basic: true,
    pro: true,
  },
  {
    feature: "Priority Support",
    free: false,
    basic: false,
    pro: true,
  },
  {
    feature: "Custom Integrations",
    free: false,
    basic: false,
    pro: true,
  },
]

// Form schemas
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
  timezone: z.string(),
})

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Current password is required." }),
    newPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters." })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
      .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
      .regex(/[0-9]/, { message: "Password must contain at least one number." })
      .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one special character." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

const webhookFormSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }),
  events: z.array(z.string()).nonempty({ message: "Select at least one event." }),
  secret: z.string().min(1, { message: "Secret key is required." }),
})

export default function SettingsPage() {
  const { user, tenant } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")
  const [showPassword, setShowPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [apiKey, setApiKey] = useState("sk_live_51NZgGtKLk2DfFgQa7tYfVmBCVcfUvZ...")
  const [showApiKey, setShowApiKey] = useState(false)
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false)
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1 (555) 123-4567",
      timezone: "America/New_York",
    },
  })

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  // Webhook form
  const webhookForm = useForm<z.infer<typeof webhookFormSchema>>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      url: "",
      events: [],
      secret: "",
    },
  })

  // Handle profile form submission
  function onProfileSubmit(data: z.infer<typeof profileFormSchema>) {
    toast({
      title: "Profile updated",
      description: "Your profile information has been updated successfully.",
    })
    console.log(data)
  }

  // Handle password form submission
  function onPasswordSubmit(data: z.infer<typeof passwordFormSchema>) {
    toast({
      title: "Password changed",
      description: "Your password has been changed successfully.",
    })
    console.log(data)
    passwordForm.reset()
  }

  // Handle webhook form submission
  function onWebhookSubmit(data: z.infer<typeof webhookFormSchema>) {
    toast({
      title: "Webhook created",
      description: "Your webhook has been created successfully.",
    })
    console.log(data)
    webhookForm.reset()
  }

  // Handle API key regeneration
  function regenerateApiKey() {
    setApiKey("sk_live_" + Math.random().toString(36).substring(2, 15))
    toast({
      title: "API key regenerated",
      description: "Your API key has been regenerated successfully.",
    })
  }

  // Handle account deletion
  function deleteAccount() {
    toast({
      title: "Account deleted",
      description: "Your account has been scheduled for deletion.",
      variant: "destructive",
    })
    setDeleteDialogOpen(false)
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings, subscription, and preferences.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-5'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          {isAdmin && process.env.NODE_ENV === 'development' && (
            <TabsTrigger value="saml" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">SAML SSO (Dev)</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Settings Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-4 sm:flex-row sm:items-start sm:space-x-4 sm:space-y-0">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-2">
                  <h3 className="text-lg font-medium">Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a new profile picture. Recommended size: 400x400px.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1">
                          <Upload className="h-4 w-4" />
                          Upload
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Profile Picture</DialogTitle>
                          <DialogDescription>
                            Upload and crop your profile picture. Click save when you're done.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center justify-center space-y-4 py-4">
                          <div className="relative h-64 w-64 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Upload className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          </div>
                          <Input type="file" className="max-w-xs" />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAvatarDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={() => setAvatarDialogOpen(false)}>Save</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Profile Form */}
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="john.doe@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timezone</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="America/New_York">Eastern Time (US & Canada)</SelectItem>
                              <SelectItem value="America/Chicago">Central Time (US & Canada)</SelectItem>
                              <SelectItem value="America/Denver">Mountain Time (US & Canada)</SelectItem>
                              <SelectItem value="America/Los_Angeles">Pacific Time (US & Canada)</SelectItem>
                              <SelectItem value="Europe/London">London, Edinburgh, Dublin</SelectItem>
                              <SelectItem value="Europe/Paris">Paris, Madrid, Berlin, Rome</SelectItem>
                              <SelectItem value="Asia/Tokyo">Tokyo, Osaka</SelectItem>
                              <SelectItem value="Australia/Sydney">Sydney, Melbourne, Brisbane</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit">Save Changes</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password and manage two-factor authentication.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Form */}
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showCurrentPassword ? "text" : "password"}
                              placeholder="Enter your current password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              <span className="sr-only">{showCurrentPassword ? "Hide password" : "Show password"}</span>
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your new password"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                          <FormDescription>
                            Password must be at least 8 characters and include uppercase, lowercase, number, and special
                            character.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Confirm your new password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Password Strength Indicator */}
                  {passwordForm.watch("newPassword") && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Password Strength</div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            passwordForm.formState.errors.newPassword ? "w-1/4 bg-destructive" : "w-full bg-green-500",
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <Button type="submit">Change Password</Button>
                </form>
              </Form>

              <Separator />

              {/* Two-Factor Authentication */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account by enabling two-factor authentication.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="font-medium">Authenticator App</div>
                    <div className="text-sm text-muted-foreground">
                      Use an authenticator app to generate verification codes.
                    </div>
                  </div>
                  <Button>Enable</Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="font-medium">SMS Authentication</div>
                    <div className="text-sm text-muted-foreground">Receive verification codes via SMS.</div>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Permanently delete your account and all of your data.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="space-y-0.5">
                  <div className="font-medium">Delete Account</div>
                  <div className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back. This action cannot be undone.
                  </div>
                </div>
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Delete Account</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Are you absolutely sure?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete your account and remove all of your
                        data from our servers.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="font-medium text-destructive">Warning</span>
                        </div>
                        <p className="mt-2">All of your data will be permanently deleted, including:</p>
                        <ul className="mt-2 list-inside list-disc space-y-1">
                          <li>All uploaded documents and files</li>
                          <li>Chat history and conversations</li>
                          <li>Custom settings and preferences</li>
                          <li>Billing information and payment history</li>
                        </ul>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="confirm-delete" />
                        <Label htmlFor="confirm-delete" className="text-sm">
                          I understand that this action is irreversible
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={deleteAccount}>
                        Delete Account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription & Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>View your current plan details and usage statistics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-2xl font-bold">Business Pro</h3>
                    <p className="text-muted-foreground">$49.99/month, billed monthly</p>
                  </div>
                  <Badge className="w-fit bg-green-500 hover:bg-green-600">Active</Badge>
                </div>

                <Separator className="my-6" />

                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Billing Period</div>
                    <div>Jul 1, 2023 - Jul 31, 2023</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Next Invoice</div>
                    <div>Aug 1, 2023 - $49.99</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Payment Method</div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>•••• 4242</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button>Upgrade Plan</Button>
                  <Button variant="outline">Update Payment Method</Button>
                  <Button variant="outline" className="text-destructive hover:text-destructive bg-transparent">
                    Cancel Subscription
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Usage Statistics</h3>

                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-medium text-muted-foreground">Documents Processed</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">423</span>
                      <span className="text-sm text-muted-foreground">/ 500 monthly</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-full w-[85%] rounded-full bg-primary" />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-medium text-muted-foreground">API Calls</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">8,245</span>
                      <span className="text-sm text-muted-foreground">/ 10,000 monthly</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-full w-[82%] rounded-full bg-primary" />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-medium text-muted-foreground">Storage Used</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">24.6 GB</span>
                      <span className="text-sm text-muted-foreground">/ 50 GB</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-full w-[49%] rounded-full bg-primary" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-4 font-medium">Usage Trends</h4>
                  <div className="h-72">
                    <ChartContainer
                      config={{
                        documents: {
                          label: "Documents",
                          color: "hsl(var(--chart-1))",
                        },
                        apiCalls: {
                          label: "API Calls",
                          color: "hsl(var(--chart-2))",
                        },
                        storage: {
                          label: "Storage (GB)",
                          color: "hsl(var(--chart-3))",
                        },
                      }}
                    >
                      <BarChart
                        data={usageData}
                        index="name"
                        categories={["documents", "apiCalls", "storage"]}
                        colors={["blue", "green", "orange"]}
                        className="h-full w-full"
                      />
                    </ChartContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
              <CardDescription>Compare available plans and features.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b py-4 text-left font-medium">Feature</th>
                      <th className="border-b py-4 text-center font-medium">Free</th>
                      <th className="border-b py-4 text-center font-medium">Business Basic</th>
                      <th className="border-b py-4 text-center font-medium bg-primary/5">Business Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planComparison.map((row, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-4">{row.feature}</td>
                        <td className="py-4 text-center">
                          {typeof row.free === "boolean" ? (
                            row.free ? (
                              <Check className="mx-auto h-4 w-4 text-green-500" />
                            ) : (
                              <X className="mx-auto h-4 w-4 text-muted-foreground" />
                            )
                          ) : (
                            row.free
                          )}
                        </td>
                        <td className="py-4 text-center">
                          {typeof row.basic === "boolean" ? (
                            row.basic ? (
                              <Check className="mx-auto h-4 w-4 text-green-500" />
                            ) : (
                              <X className="mx-auto h-4 w-4 text-muted-foreground" />
                            )
                          ) : (
                            row.basic
                          )}
                        </td>
                        <td className="py-4 text-center bg-primary/5">
                          {typeof row.pro === "boolean" ? (
                            row.pro ? (
                              <Check className="mx-auto h-4 w-4 text-green-500" />
                            ) : (
                              <X className="mx-auto h-4 w-4 text-muted-foreground" />
                            )
                          ) : (
                            row.pro
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-center gap-4">
                <Button variant="outline">Free</Button>
                <Button variant="outline">Business Basic</Button>
                <Button>Business Pro</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View and download your past invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b py-4 text-left font-medium">Invoice</th>
                      <th className="border-b py-4 text-left font-medium">Date</th>
                      <th className="border-b py-4 text-left font-medium">Amount</th>
                      <th className="border-b py-4 text-left font-medium">Plan</th>
                      <th className="border-b py-4 text-left font-medium">Status</th>
                      <th className="border-b py-4 text-right font-medium">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((invoice) => (
                      <tr key={invoice.id} className="border-b last:border-0">
                        <td className="py-4">{invoice.id}</td>
                        <td className="py-4">{invoice.date}</td>
                        <td className="py-4">{invoice.amount}</td>
                        <td className="py-4">{invoice.plan}</td>
                        <td className="py-4">
                          <Badge variant="outline" className="bg-green-500/10 text-green-600">
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="py-4 text-right">
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Preferences Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure which email notifications you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="processing-complete" className="text-base">
                      Processing Complete
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive an email when document processing is complete.
                    </p>
                  </div>
                  <Switch id="processing-complete" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="weekly-reports" className="text-base">
                      Weekly Reports
                    </Label>
                    <p className="text-sm text-muted-foreground">Receive a weekly summary of your account activity.</p>
                  </div>
                  <Switch id="weekly-reports" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="security-alerts" className="text-base">
                      Security Alerts
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts about security events related to your account.
                    </p>
                  </div>
                  <Switch id="security-alerts" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="billing-updates" className="text-base">
                      Billing Updates
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about billing and subscription changes.
                    </p>
                  </div>
                  <Switch id="billing-updates" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="product-updates" className="text-base">
                      Product Updates
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and improvements.
                    </p>
                  </div>
                  <Switch id="product-updates" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In-App Notifications</CardTitle>
              <CardDescription>Configure your in-app notification preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="document-comments" className="text-base">
                      Document Comments
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when someone comments on your documents.
                    </p>
                  </div>
                  <Switch id="document-comments" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="document-shares" className="text-base">
                      Document Shares
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when documents are shared with you.
                    </p>
                  </div>
                  <Switch id="document-shares" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="team-updates" className="text-base">
                      Team Updates
                    </Label>
                    <p className="text-sm text-muted-foreground">Receive notifications about team member activities.</p>
                  </div>
                  <Switch id="team-updates" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Digest Frequency</CardTitle>
              <CardDescription>Configure how often you receive notification digests.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="digest-frequency">Notification Digest Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger id="digest-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choose how frequently you want to receive notification digests.
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="marketing-communications" className="text-base">
                      Marketing Communications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features, promotions, and events.
                    </p>
                  </div>
                  <Switch id="marketing-communications" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Integration Settings Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cloud Storage Connections</CardTitle>
              <CardDescription>Connect your cloud storage accounts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Dropbox className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Dropbox</h4>
                      <p className="text-sm text-muted-foreground">
                        Connect your Dropbox account to import and export documents.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <HardDrive className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Google Drive</h4>
                      <p className="text-sm text-muted-foreground">
                        Connect your Google Drive account to import and export documents.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-600">
                      Connected
                    </Badge>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <Globe className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">OneDrive</h4>
                      <p className="text-sm text-muted-foreground">
                        Connect your OneDrive account to import and export documents.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for external integrations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-medium">Live API Key</h4>
                      <p className="text-sm text-muted-foreground">Use this key for production environments.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1">
                        <Input value={apiKey} readOnly type={showApiKey ? "text" : "password"} className="pr-10" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey)
                          toast({
                            title: "API key copied",
                            description: "Your API key has been copied to the clipboard.",
                          })
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </Button>
                      <Button variant="outline" size="icon" onClick={regenerateApiKey}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-medium">Test API Key</h4>
                      <p className="text-sm text-muted-foreground">Use this key for testing and development.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          value="sk_test_51NZgGtKLk2DfFgQa7tYfVmBCVcfUvZ..."
                          readOnly
                          type="password"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="outline" size="icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </Button>
                      <Button variant="outline" size="icon">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-500">API Key Security</span>
                </div>
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-500">
                  Keep your API keys secure. Do not share them in publicly accessible areas such as GitHub, client-side
                  code, or in API requests over unencrypted connections.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>Configure webhooks to receive real-time event notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...webhookForm}>
                <form onSubmit={webhookForm.handleSubmit(onWebhookSubmit)} className="space-y-6">
                  <FormField
                    control={webhookForm.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/webhook" {...field} />
                        </FormControl>
                        <FormDescription>The URL where webhook events will be sent.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={webhookForm.control}
                    name="events"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Events to Send</FormLabel>
                          <FormDescription>Select the events you want to receive notifications for.</FormDescription>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <FormField
                            control={webhookForm.control}
                            name="events"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("document.created")}
                                    onCheckedChange={(checked) => {
                                      const value = "document.created"
                                      return checked
                                        ? field.onChange([...(field.value || []), value])
                                        : field.onChange(field.value?.filter((item) => item !== value))
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Document Created</FormLabel>
                                  <FormDescription>When a new document is uploaded.</FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={webhookForm.control}
                            name="events"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("document.processed")}
                                    onCheckedChange={(checked) => {
                                      const value = "document.processed"
                                      return checked
                                        ? field.onChange([...(field.value || []), value])
                                        : field.onChange(field.value?.filter((item) => item !== value))
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Document Processed</FormLabel>
                                  <FormDescription>When document processing is complete.</FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={webhookForm.control}
                            name="events"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("document.updated")}
                                    onCheckedChange={(checked) => {
                                      const value = "document.updated"
                                      return checked
                                        ? field.onChange([...(field.value || []), value])
                                        : field.onChange(field.value?.filter((item) => item !== value))
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Document Updated</FormLabel>
                                  <FormDescription>When a document is modified.</FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={webhookForm.control}
                            name="events"
                            render={({ field }) => (
                              <FormItem className="flex items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("document.deleted")}
                                    onCheckedChange={(checked) => {
                                      const value = "document.deleted"
                                      return checked
                                        ? field.onChange([...(field.value || []), value])
                                        : field.onChange(field.value?.filter((item) => item !== value))
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Document Deleted</FormLabel>
                                  <FormDescription>When a document is deleted.</FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={webhookForm.control}
                    name="secret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook Secret</FormLabel>
                        <FormControl>
                          <Input placeholder="whsec_..." {...field} />
                        </FormControl>
                        <FormDescription>Used to verify that requests are coming from our service.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Create Webhook</Button>
                </form>
              </Form>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Active Webhooks</h3>
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-medium">https://example.com/webhook</h4>
                      <p className="text-sm text-muted-foreground">Events: document.created, document.processed</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">
                        Active
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Single Sign-On (SSO)</CardTitle>
              <CardDescription>Configure SSO for enterprise users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 text-blue-600"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">SAML 2.0</h4>
                      <p className="text-sm text-muted-foreground">Configure SAML 2.0 for single sign-on.</p>
                    </div>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 text-blue-600"
                      >
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">OpenID Connect</h4>
                      <p className="text-sm text-muted-foreground">Configure OpenID Connect for single sign-on.</p>
                    </div>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-amber-800 dark:text-amber-500">Enterprise Feature</span>
                </div>
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-500">
                  SSO configuration is available on the Enterprise plan. Contact sales for more information.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy & Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
              <CardDescription>Configure how long your data is stored.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="document-retention">Document Retention Period</Label>
                  <Select defaultValue="forever">
                    <SelectTrigger id="document-retention">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30days">30 days</SelectItem>
                      <SelectItem value="90days">90 days</SelectItem>
                      <SelectItem value="1year">1 year</SelectItem>
                      <SelectItem value="forever">Forever</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Choose how long your documents are stored before being automatically deleted.
                  </p>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Label htmlFor="activity-logs">Activity Logs Retention</Label>
                  <Select defaultValue="90days">
                    <SelectTrigger id="activity-logs">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30days">30 days</SelectItem>
                      <SelectItem value="90days">90 days</SelectItem>
                      <SelectItem value="1year">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Choose how long your activity logs are stored.</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Personal Data</CardTitle>
              <CardDescription>Export all your personal data in compliance with GDPR.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm">
                  You can request a full export of your personal data at any time. This includes:
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  <li>Your profile information</li>
                  <li>Your documents and files</li>
                  <li>Your activity logs</li>
                  <li>Your billing information</li>
                </ul>

                <div className="rounded-lg border p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-medium">Data Export</h4>
                      <p className="text-sm text-muted-foreground">Request a full export of your personal data.</p>
                    </div>
                    <Button>Request Export</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>Manage your active sessions and devices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4",
                      session.isCurrent && "border-primary/50 bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                        {session.device.includes("Chrome") ? (
                          <Laptop className="h-5 w-5 text-blue-600" />
                        ) : session.device.includes("Safari") ? (
                          <Laptop className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Smartphone className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{session.device}</h4>
                          {session.isCurrent && (
                            <Badge variant="outline" className="bg-primary/10 text-primary">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col text-sm text-muted-foreground sm:flex-row sm:gap-2">
                          <span>{session.location}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>IP: {session.ip}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>Last active: {session.lastActive}</span>
                        </div>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button variant="ghost" size="sm">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    )}
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button variant="outline">Sign Out All Other Sessions</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Log</CardTitle>
              <CardDescription>View your recent security events.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border-b py-4 text-left font-medium">Event</th>
                        <th className="border-b py-4 text-left font-medium">Date</th>
                        <th className="border-b py-4 text-left font-medium">Time</th>
                        <th className="border-b py-4 text-left font-medium">IP Address</th>
                        <th className="border-b py-4 text-left font-medium">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityLog.map((log) => (
                        <tr key={log.id} className="border-b last:border-0">
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              {log.event === "Password changed" ? (
                                <Key className="h-4 w-4 text-amber-500" />
                              ) : log.event === "Login successful" ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : log.event === "Failed login attempt" ? (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <Shield className="h-4 w-4 text-blue-500" />
                              )}
                              <span>{log.event}</span>
                            </div>
                          </td>
                          <td className="py-4">{log.date}</td>
                          <td className="py-4">{log.time}</td>
                          <td className="py-4">{log.ip}</td>
                          <td className="py-4">{log.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline">View Full Log</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Compliance</CardTitle>
              <CardDescription>View security compliance information.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col items-center rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="mt-2 font-medium">GDPR Compliant</h4>
                  <p className="mt-1 text-center text-sm text-muted-foreground">
                    EU General Data Protection Regulation
                  </p>
                </div>

                <div className="flex flex-col items-center rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Lock className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="mt-2 font-medium">HIPAA Compliant</h4>
                  <p className="mt-1 text-center text-sm text-muted-foreground">
                    Health Insurance Portability and Accountability Act
                  </p>
                </div>

                <div className="flex flex-col items-center rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="mt-2 font-medium">SOC 2 Type II</h4>
                  <p className="mt-1 text-center text-sm text-muted-foreground">Service Organization Control 2</p>
                </div>

                <div className="flex flex-col items-center rounded-lg border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="mt-2 font-medium">ISO 27001</h4>
                  <p className="mt-1 text-center text-sm text-muted-foreground">Information Security Management</p>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800 dark:text-green-500">Your data is secure</span>
                </div>
                <p className="mt-2 text-sm text-green-800 dark:text-green-500">
                  We take security seriously. All data is encrypted at rest and in transit. We regularly undergo
                  security audits and penetration testing to ensure your data is protected.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAML SSO Tab - Admin Only (Development) */}
        {isAdmin && process.env.NODE_ENV === 'development' && (
          <TabsContent value="saml" className="space-y-6">
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800">🚧 Development Feature</h3>
              <p className="text-yellow-700 text-sm mt-1">
                SAML SSO is currently in development. This feature will be available in the Enterprise plan after freemium launch.
              </p>
            </div>
            <SAMLConfiguration 
              tenantId={tenant?.id || ''} 
              tenantSubdomain={tenant?.subdomain || ''} 
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
