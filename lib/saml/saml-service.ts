import { SAML } from '@node-saml/node-saml';
import { createClient } from '@supabase/supabase-js';
import { SecureTenantService } from '@/lib/secure-database';

export interface SAMLConfig {
  // Identity Provider settings
  entryPoint: string; // IdP SSO URL
  issuer: string; // SP Entity ID
  cert: string; // IdP X.509 certificate
  
  // Service Provider settings
  callbackUrl: string; // ACS URL
  audience: string; // SP Entity ID
  
  // Optional settings
  logoutUrl?: string;
  logoutCallbackUrl?: string;
  nameIDFormat?: string;
  wantAssertionsSigned?: boolean;
  wantNameId?: boolean;
  allowUnencryptedAssertions?: boolean;
}

export interface SAMLUserProfile {
  nameID: string;
  nameIDFormat: string;
  attributes: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    [key: string]: any;
  };
}

export interface TenantSAMLConfig {
  id: string;
  tenant_id: string;
  idp_entity_id: string;
  idp_sso_url: string;
  idp_certificate: string;
  idp_metadata_url?: string;
  sp_entity_id: string;
  sp_acs_url: string;
  sp_sls_url?: string;
  name_id_format: string;
  want_assertions_signed: boolean;
  want_name_id: boolean;
  allow_unencrypted_assertions: boolean;
  attribute_mapping: Record<string, string>;
  auto_provision_users: boolean;
  default_role: string;
  default_access_level: number;
  is_enabled: boolean;
  is_configured: boolean;
}

export class SAMLService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Get SAML configuration for a tenant
   */
  async getTenantSAMLConfig(tenantId: string): Promise<TenantSAMLConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_saml_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_enabled', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Get SAML configuration by subdomain
   */
  async getTenantSAMLConfigBySubdomain(subdomain: string): Promise<TenantSAMLConfig | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_saml_configs')
        .select(`
          *,
          tenants!inner(subdomain)
        `)
        .eq('tenants.subdomain', subdomain)
        .eq('is_enabled', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Create SAML instance for tenant
   */
  createSAMLInstance(tenantConfig: TenantSAMLConfig, callbackUrl: string): SAML {
    const samlConfig: SAMLConfig = {
      entryPoint: tenantConfig.idp_sso_url,
      issuer: tenantConfig.sp_entity_id,
      cert: tenantConfig.idp_certificate,
      callbackUrl: callbackUrl,
      audience: tenantConfig.sp_entity_id,
      nameIDFormat: tenantConfig.name_id_format,
      wantAssertionsSigned: tenantConfig.want_assertions_signed,
      wantNameId: tenantConfig.want_name_id,
      allowUnencryptedAssertions: tenantConfig.allow_unencrypted_assertions,
    };

    return new SAML(samlConfig as any);
  }

  /**
   * Generate SAML login URL
   */
  async generateLoginURL(tenantId: string, relayState?: string): Promise<string | null> {
    try {
      const tenantConfig = await this.getTenantSAMLConfig(tenantId);
      if (!tenantConfig) {
        throw new Error('SAML not configured for tenant');
      }

      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/callback/${tenantId}`;
      const saml = this.createSAMLInstance(tenantConfig, callbackUrl);

      const loginUrl = await (saml as any).getAuthorizeUrlAsync(relayState || '', {});
      return loginUrl || null;
    } catch {
      return null;
    }
  }

  /**
   * Validate SAML response and extract user profile
   */
  async validateSAMLResponse(
    tenantId: string, 
    samlResponse: string
  ): Promise<SAMLUserProfile | null> {
    try {
      const tenantConfig = await this.getTenantSAMLConfig(tenantId);
      if (!tenantConfig) {
        throw new Error('SAML not configured for tenant');
      }

      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/callback/${tenantId}`;
      const saml = this.createSAMLInstance(tenantConfig, callbackUrl);

      const result = await (saml as any).validatePostResponseAsync({ SAMLResponse: samlResponse });
      return result?.profile as SAMLUserProfile || null;
    } catch {
      return null;
    }
  }

  /**
   * Map SAML attributes to user data
   */
  mapSAMLAttributesToUser(
    profile: SAMLUserProfile, 
    attributeMapping: Record<string, string>
  ): {
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
  } {
    const { attributes } = profile;
    
    const email = this.getAttributeValue(attributes, attributeMapping.email || 'email');
    const firstName = this.getAttributeValue(attributes, attributeMapping.firstName || 'firstName');
    const lastName = this.getAttributeValue(attributes, attributeMapping.lastName || 'lastName');
    const displayName = this.getAttributeValue(attributes, attributeMapping.displayName || 'displayName');
    
    // Construct full name
    let name = displayName;
    if (!name && firstName && lastName) {
      name = `${firstName} ${lastName}`;
    } else if (!name && firstName) {
      name = firstName;
    } else if (!name && lastName) {
      name = lastName;
    } else if (!name) {
      name = email.split('@')[0]; // Fallback to email prefix
    }

    if (!email) {
      throw new Error('Email attribute is required but not found in SAML response');
    }

    return {
      email,
      name,
      firstName,
      lastName,
    };
  }

  /**
   * Helper to get attribute value from SAML response
   */
  private getAttributeValue(attributes: any, attributeName: string): string {
    if (!attributes || !attributeName) return '';
    
    const value = attributes[attributeName];
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return value || '';
  }

  /**
   * Create or update user from SAML profile
   */
  async provisionUserFromSAML(
    tenantId: string,
    userProfile: {
      email: string;
      name: string;
      firstName?: string;
      lastName?: string;
    },
    tenantConfig: TenantSAMLConfig
  ): Promise<any> {
    try {
      // Check if user already exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', userProfile.email)
        .eq('tenant_id', tenantId)
        .single();

      if (existingUser) {
        // Update existing user
        const { data: updatedUser, error } = await this.supabase
          .from('users')
          .update({
            name: userProfile.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (error) throw error;
        return updatedUser;
      } else {
        // Create new user if auto-provisioning is enabled
        if (!tenantConfig.auto_provision_users) {
          throw new Error('User does not exist and auto-provisioning is disabled');
        }

        const { data: newUser, error } = await this.supabase
          .from('users')
          .insert({
            email: userProfile.email,
            name: userProfile.name,
            tenant_id: tenantId,
            role: tenantConfig.default_role,
            access_level: tenantConfig.default_access_level,
            auth_provider: 'saml',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return newUser;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate SP metadata XML
   */
  async generateSPMetadata(tenantId: string): Promise<string | null> {
    try {
      const tenantConfig = await this.getTenantSAMLConfig(tenantId);
      if (!tenantConfig) {
        throw new Error('SAML not configured for tenant');
      }

      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/saml/callback/${tenantId}`;
      const saml = this.createSAMLInstance(tenantConfig, callbackUrl);

      return (saml as any).generateServiceProviderMetadata(null, null);
    } catch {
      return null;
    }
  }
}

export const samlService = new SAMLService();
