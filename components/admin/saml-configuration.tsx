"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Download, Save, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SAMLConfig {
  id?: string
  tenant_id: string
  idp_entity_id: string
  idp_sso_url: string
  idp_certificate: string
  idp_metadata_url?: string
  sp_entity_id: string
  sp_acs_url: string
  sp_sls_url?: string
  name_id_format: string
  want_assertions_signed: boolean
  want_name_id: boolean
  allow_unencrypted_assertions: boolean
  attribute_mapping: Record<string, string>
  auto_provision_users: boolean
  default_role: string
  default_access_level: number
  is_enabled: boolean
  is_configured: boolean
}

interface SAMLConfigurationProps {
  tenantId: string
  tenantSubdomain: string
}

export default function SAMLConfiguration({ tenantId, tenantSubdomain }: SAMLConfigurationProps) {
  const { toast } = useToast()
  const [config, setConfig] = useState<SAMLConfig>({
    tenant_id: tenantId,
    idp_entity_id: '',
    idp_sso_url: '',
    idp_certificate: '',
    idp_metadata_url: '',
    sp_entity_id: 'docsflow-app',
    sp_acs_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/callback/${tenantId}`,
    sp_sls_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/logout/${tenantId}`,
    name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    want_assertions_signed: true,
    want_name_id: true,
    allow_unencrypted_assertions: false,
    attribute_mapping: {
      email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      displayName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
    },
    auto_provision_users: true,
    default_role: 'user',
    default_access_level: 2,
    is_enabled: false,
    is_configured: false,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Load existing configuration
  useEffect(() => {
    loadSAMLConfig()
  }, [tenantId])

  const loadSAMLConfig = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tenants/${tenantId}/saml`)
      if (response.ok) {
        const data = await response.json()
        if (data.samlConfig) {
          setConfig(prev => ({ ...prev, ...data.samlConfig }))
        }
      }
    } catch (error) {
      console.error('Error loading SAML config:', error)
      toast({
        title: "Error",
        description: "Failed to load SAML configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const validateConfig = (): boolean => {
    const errors: Record<string, string> = {}

    if (!config.idp_entity_id.trim()) {
      errors.idp_entity_id = 'Identity Provider Entity ID is required'
    }

    if (!config.idp_sso_url.trim()) {
      errors.idp_sso_url = 'Identity Provider SSO URL is required'
    } else {
      try {
        new URL(config.idp_sso_url)
      } catch {
        errors.idp_sso_url = 'Invalid SSO URL format'
      }
    }

    if (!config.idp_certificate.trim()) {
      errors.idp_certificate = 'Identity Provider Certificate is required'
    }

    if (!config.sp_entity_id.trim()) {
      errors.sp_entity_id = 'Service Provider Entity ID is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateConfig()) {
      toast({
        title: "Validation Error",
        description: "Please fix the highlighted errors",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/tenants/${tenantId}/saml`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      const data = await response.json()

      if (response.ok) {
        setConfig(prev => ({ ...prev, ...data.samlConfig }))
        toast({
          title: "Success",
          description: "SAML configuration saved successfully",
        })
      } else {
        throw new Error(data.error || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving SAML config:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save SAML configuration",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!config.is_configured || !config.is_enabled) {
      toast({
        title: "Cannot Test",
        description: "Please save and enable the configuration first",
        variant: "destructive",
      })
      return
    }

    const testUrl = `/api/auth/saml/login/${tenantId}?RelayState=${encodeURIComponent('/dashboard')}`
    window.open(testUrl, '_blank')
  }

  const downloadMetadata = async () => {
    try {
      const response = await fetch(`/api/auth/saml/metadata/${tenantId}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `sp-metadata-${tenantSubdomain}.xml`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } else {
        throw new Error('Failed to download metadata')
      }
    } catch (error) {
      console.error('Error downloading metadata:', error)
      toast({
        title: "Error",
        description: "Failed to download metadata",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      })
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            SAML SSO Configuration
            {config.is_configured && config.is_enabled && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                <CheckCircle className="mr-1 h-3 w-3" />
                Active
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Configure SAML Single Sign-On for your organization. Users will be able to sign in using your corporate identity provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="idp" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="idp">Identity Provider</TabsTrigger>
              <TabsTrigger value="sp">Service Provider</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="idp" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="idp_entity_id">Identity Provider Entity ID *</Label>
                  <Input
                    id="idp_entity_id"
                    value={config.idp_entity_id}
                    onChange={(e) => setConfig(prev => ({ ...prev, idp_entity_id: e.target.value }))}
                    placeholder="urn:okta:entity:unique-id"
                    className={validationErrors.idp_entity_id ? 'border-red-500' : ''}
                  />
                  {validationErrors.idp_entity_id && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.idp_entity_id}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="idp_sso_url">Identity Provider SSO URL *</Label>
                  <Input
                    id="idp_sso_url"
                    value={config.idp_sso_url}
                    onChange={(e) => setConfig(prev => ({ ...prev, idp_sso_url: e.target.value }))}
                    placeholder="https://your-idp.example.com/saml/sso"
                    className={validationErrors.idp_sso_url ? 'border-red-500' : ''}
                  />
                  {validationErrors.idp_sso_url && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.idp_sso_url}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="idp_metadata_url">Identity Provider Metadata URL (Optional)</Label>
                  <Input
                    id="idp_metadata_url"
                    value={config.idp_metadata_url || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, idp_metadata_url: e.target.value }))}
                    placeholder="https://your-idp.example.com/saml/metadata"
                  />
                </div>

                <div>
                  <Label htmlFor="idp_certificate" className="flex items-center gap-2">
                    Identity Provider Certificate (X.509) *
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCertificate(!showCertificate)}
                    >
                      {showCertificate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </Label>
                  <Textarea
                    id="idp_certificate"
                    value={config.idp_certificate}
                    onChange={(e) => setConfig(prev => ({ ...prev, idp_certificate: e.target.value }))}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...&#10;-----END CERTIFICATE-----"
                    rows={showCertificate ? 10 : 3}
                    className={`font-mono text-sm ${validationErrors.idp_certificate ? 'border-red-500' : ''} ${!showCertificate ? 'text-transparent' : ''}`}
                  />
                  {validationErrors.idp_certificate && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.idp_certificate}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sp" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  These are the Service Provider details you'll need to configure in your Identity Provider.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="sp_entity_id">Service Provider Entity ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sp_entity_id"
                      value={config.sp_entity_id}
                      onChange={(e) => setConfig(prev => ({ ...prev, sp_entity_id: e.target.value }))}
                      placeholder="docsflow-app"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(config.sp_entity_id, 'Entity ID')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Assertion Consumer Service (ACS) URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={config.sp_acs_url}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(config.sp_acs_url, 'ACS URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Single Logout Service (SLS) URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={config.sp_sls_url || ''}
                      readOnly
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(config.sp_sls_url || '', 'SLS URL')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Name ID Format</Label>
                  <Select
                    value={config.name_id_format}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, name_id_format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">Email Address</SelectItem>
                      <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">Persistent</SelectItem>
                      <SelectItem value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">Transient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={downloadMetadata}
                    disabled={!config.is_configured}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download SP Metadata
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attributes" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="attr_email">Email Attribute</Label>
                  <Input
                    id="attr_email"
                    value={config.attribute_mapping.email}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      attribute_mapping: { ...prev.attribute_mapping, email: e.target.value }
                    }))}
                    placeholder="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
                  />
                </div>

                <div>
                  <Label htmlFor="attr_firstName">First Name Attribute</Label>
                  <Input
                    id="attr_firstName"
                    value={config.attribute_mapping.firstName}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      attribute_mapping: { ...prev.attribute_mapping, firstName: e.target.value }
                    }))}
                    placeholder="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
                  />
                </div>

                <div>
                  <Label htmlFor="attr_lastName">Last Name Attribute</Label>
                  <Input
                    id="attr_lastName"
                    value={config.attribute_mapping.lastName}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      attribute_mapping: { ...prev.attribute_mapping, lastName: e.target.value }
                    }))}
                    placeholder="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
                  />
                </div>

                <div>
                  <Label htmlFor="attr_displayName">Display Name Attribute</Label>
                  <Input
                    id="attr_displayName"
                    value={config.attribute_mapping.displayName}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      attribute_mapping: { ...prev.attribute_mapping, displayName: e.target.value }
                    }))}
                    placeholder="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="want_assertions_signed">Require Signed Assertions</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Require SAML assertions to be signed by the IdP</p>
                  </div>
                  <Switch
                    id="want_assertions_signed"
                    checked={config.want_assertions_signed}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, want_assertions_signed: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="want_name_id">Require NameID</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Require NameID in SAML response</p>
                  </div>
                  <Switch
                    id="want_name_id"
                    checked={config.want_name_id}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, want_name_id: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allow_unencrypted_assertions">Allow Unencrypted Assertions</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Allow unencrypted SAML assertions (not recommended)</p>
                  </div>
                  <Switch
                    id="allow_unencrypted_assertions"
                    checked={config.allow_unencrypted_assertions}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, allow_unencrypted_assertions: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto_provision_users">Auto-provision Users</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatically create user accounts on first SSO login</p>
                  </div>
                  <Switch
                    id="auto_provision_users"
                    checked={config.auto_provision_users}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auto_provision_users: checked }))}
                  />
                </div>

                <div>
                  <Label htmlFor="default_role">Default Role for New Users</Label>
                  <Select
                    value={config.default_role}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, default_role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="default_access_level">Default Access Level for New Users</Label>
                  <Select
                    value={config.default_access_level.toString()}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, default_access_level: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 (Basic)</SelectItem>
                      <SelectItem value="2">Level 2 (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_enabled">Enable SAML SSO</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Allow users to sign in using SAML SSO</p>
                  </div>
                  <Switch
                    id="is_enabled"
                    checked={config.is_enabled}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_enabled: checked }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-6 border-t">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={!config.is_configured || !config.is_enabled}
              >
                Test SSO
              </Button>
            </div>
            
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
