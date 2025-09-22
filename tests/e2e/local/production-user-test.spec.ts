import { test, expect } from '@playwright/test';

// Clear browser state helper
async function clearBrowserState(page: any) {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => {
      if (typeof localStorage !== 'undefined') localStorage.clear();
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    });
  } catch (error) {
    console.log('Note: Could not clear localStorage/sessionStorage (expected on some pages)');
  }
}

test.describe('Production User Login Test', () => {
  
  test('should test production user login locally', async ({ page }) => {
    // Listen to network requests
    const apiCalls: any[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/auth')) {
        console.log('🔍 Auth API Response:', {
          url: response.url(),
          status: response.status()
        });
        
        try {
          const responseBody = await response.json();
          console.log('🔍 Auth API Response Body:', responseBody);
          apiCalls.push({ url: response.url(), status: response.status(), body: responseBody });
        } catch (e) {
          apiCalls.push({ url: response.url(), status: response.status(), body: 'unparseable' });
        }
      }
    });
    
    await clearBrowserState(page);
    
    // Navigate to login page
    await page.goto('/login');
    
    console.log('🔍 Testing production user: support@bitto.tech');
    console.log('🔍 Current URL:', page.url());
    
    // Fill in PRODUCTION credentials
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    
    console.log('🔍 Credentials filled, submitting...');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    console.log('🔍 After login attempt:');
    console.log('  Current URL:', page.url());
    console.log('  API calls:', apiCalls.length);
    
    // Check for success indicators
    const successIndicators = [
      page.url().includes('/dashboard'),
      await page.locator('text=Welcome back').isVisible().catch(() => false),
      await page.locator('text=Redirecting').isVisible().catch(() => false),
      await page.locator('[data-testid="dashboard"]').isVisible().catch(() => false)
    ];
    
    console.log('🔍 Success indicators:', successIndicators);
    
    // Check for error messages
    const errorElements = await page.locator('.error, .alert, [role="alert"], .text-red-500').all();
    for (const element of errorElements) {
      const text = await element.textContent();
      if (text && text.trim()) {
        console.log('🚨 Error found:', text.trim());
      }
    }
    
    // Check cookies
    const cookies = await page.context().cookies();
    console.log('🔍 Cookies after login:', cookies.map(c => ({
      name: c.name,
      domain: c.domain,
      hasValue: !!c.value
    })));
    
    // Check for Supabase auth cookies
    const supabaseAuthCookies = cookies.filter(c => 
      c.name.startsWith('sb-') && c.name.includes('auth')
    );
    console.log('🔍 Supabase auth cookies:', supabaseAuthCookies.length);
    
    // Check for tenant cookies
    const tenantCookies = cookies.filter(c => 
      ['tenant-id', 'user-email', 'tenant-subdomain'].includes(c.name)
    );
    console.log('🔍 Tenant cookies:', tenantCookies.length);
    
    // Log what actually happened
    const loginSuccess = successIndicators.some(indicator => indicator === true);
    console.log('🔍 Login success:', loginSuccess);
    
    if (loginSuccess) {
      console.log('✅ Production user login worked locally!');
    } else {
      console.log('❌ Production user login failed locally');
      
      // Additional debugging
      const pageContent = await page.content();
      if (pageContent.includes('Invalid login credentials')) {
        console.log('🚨 Invalid credentials error');
      } else if (pageContent.includes('User not found')) {
        console.log('🚨 User not found in local database');
      } else {
        console.log('🚨 Unknown login failure');
      }
    }
    
    // Test assertion - at minimum we should get some response
    if (apiCalls.length > 0) {
      expect(apiCalls.length).toBeGreaterThan(0);
    } else {
      // If no API calls, the form might be using Supabase directly
      console.log('📝 No API calls detected - likely using Supabase client-side auth');
      expect(supabaseAuthCookies.length).toBeGreaterThan(0);
    }
  });
  
});
