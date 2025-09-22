import { test, expect } from '@playwright/test';

test.describe('Cookie Domain Cross-Subdomain Test', () => {
  
  test('should verify cookie accessibility across domains', async ({ page }) => {
    // Clear all cookies first
    await page.context().clearCookies();
    
    console.log('🧪 Testing cookie cross-subdomain accessibility...');
    
    // Step 1: Login at main domain (localhost:3000)
    await page.goto('http://localhost:3000/login');
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'test1@example.com');
    await page.fill('input[type="password"]', 'Testing123?');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForTimeout(3000);
    
    // Step 2: Check cookies set during login
    const cookiesAfterLogin = await page.context().cookies();
    console.log('🔍 Cookies after login:', cookiesAfterLogin.map(c => ({
      name: c.name,
      domain: c.domain,
      value: c.value.substring(0, 20) + '...'
    })));
    
    // Find Supabase auth cookies
    const supabaseAuthCookies = cookiesAfterLogin.filter(c => 
      c.name.startsWith('sb-') && c.name.includes('auth')
    );
    
    // Find custom tenant cookies
    const tenantCookies = cookiesAfterLogin.filter(c => 
      ['tenant-id', 'user-email', 'tenant-subdomain', 'tenant-context'].includes(c.name)
    );
    
    console.log('🔍 Supabase auth cookies:', supabaseAuthCookies.map(c => ({
      name: c.name,
      domain: c.domain,
      accessible: c.domain === '.docsflow.app' || c.domain === 'localhost' || c.domain === '.localhost'
    })));
    
    console.log('🔍 Custom tenant cookies:', tenantCookies.map(c => ({
      name: c.name,
      domain: c.domain,
      accessible: c.domain === '.docsflow.app' || c.domain === 'localhost' || c.domain === '.localhost'
    })));
    
    // Step 3: Check if we can access cookies with different domain configurations
    const currentUrl = page.url();
    console.log('🔍 Current URL after login:', currentUrl);
    
    // Step 4: Test navigation to dashboard and check cookie accessibility
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(1000);
    
    const cookiesOnDashboard = await page.context().cookies();
    console.log('🔍 Cookies accessible on dashboard:', cookiesOnDashboard.map(c => c.name));
    
    // Check that all important cookies are still accessible
    const dashboardSupabaseCookies = cookiesOnDashboard.filter(c => 
      c.name.startsWith('sb-') && c.name.includes('auth')
    );
    const dashboardTenantCookies = cookiesOnDashboard.filter(c => 
      ['tenant-id', 'user-email', 'tenant-subdomain'].includes(c.name)
    );
    
    console.log('🔍 Supabase cookies on dashboard:', dashboardSupabaseCookies.length);
    console.log('🔍 Tenant cookies on dashboard:', dashboardTenantCookies.length);
    
    // Critical assertions
    expect(supabaseAuthCookies.length).toBeGreaterThan(0);
    expect(dashboardSupabaseCookies.length).toEqual(supabaseAuthCookies.length);
    expect(dashboardTenantCookies.length).toBeGreaterThan(0);
    
    // Check that auth cookies have proper domain configuration
    const authCookieWithBadDomain = supabaseAuthCookies.find(c => 
      c.domain === 'localhost' && !c.domain.startsWith('.')
    );
    
    if (authCookieWithBadDomain) {
      console.warn('⚠️ Found Supabase auth cookie with domain that may not work across subdomains!');
      console.warn('   Cookie:', authCookieWithBadDomain.name, 'Domain:', authCookieWithBadDomain.domain);
    }
    
    // Final check - verify middleware can read the cookies
    const middlewareRequiredCookies = {
      hasSupabaseAuth: dashboardSupabaseCookies.length > 0,
      hasTenantId: dashboardTenantCookies.some(c => c.name === 'tenant-id'),
      hasUserEmail: dashboardTenantCookies.some(c => c.name === 'user-email'),
      hasTenantSubdomain: dashboardTenantCookies.some(c => c.name === 'tenant-subdomain')
    };
    
    console.log('🔍 Middleware cookie requirements:', middlewareRequiredCookies);
    
    // This should all be true for successful cross-subdomain auth
    expect(middlewareRequiredCookies.hasSupabaseAuth).toBeTruthy();
    expect(middlewareRequiredCookies.hasTenantId).toBeTruthy();
    expect(middlewareRequiredCookies.hasUserEmail).toBeTruthy();
    expect(middlewareRequiredCookies.hasTenantSubdomain).toBeTruthy();
  });
  
});
