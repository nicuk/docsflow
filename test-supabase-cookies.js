/**
 * TEST SUPABASE COOKIE BEHAVIOR
 * Check what cookies Supabase SSR actually sets/expects
 */

import { chromium } from 'playwright';

async function testSupabaseCookies() {
  console.log('🔍 SUPABASE COOKIE TEST');
  console.log('======================');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n📍 STEP 1: Check initial cookies');
    await page.goto('http://localhost:3001/login');
    
    let cookies = await page.context().cookies();
    console.log('Initial cookies:', cookies.map(c => c.name));
    
    console.log('\n📍 STEP 2: Login and check Supabase cookies');
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    cookies = await page.context().cookies();
    const supabaseCookies = cookies.filter(c => c.name.startsWith('sb-'));
    const customCookies = cookies.filter(c => !c.name.startsWith('sb-'));
    
    console.log('\n🔑 SUPABASE COOKIES:');
    supabaseCookies.forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
      console.log(`    domain: ${cookie.domain}, path: ${cookie.path}`);
    });
    
    console.log('\n🍪 CUSTOM COOKIES:');
    customCookies.forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
      console.log(`    domain: ${cookie.domain}, path: ${cookie.path}`);
    });
    
    console.log('\n📍 STEP 3: Test dashboard with cookie inspection');
    
    // Monitor what cookies are sent
    page.on('request', request => {
      if (request.url().includes('/dashboard')) {
        const cookieHeader = request.headers()['cookie'];
        console.log('\n📤 COOKIES SENT TO /dashboard:');
        if (cookieHeader) {
          const sentCookies = cookieHeader.split(';').map(c => c.trim());
          sentCookies.forEach(cookie => {
            const [name] = cookie.split('=');
            console.log(`  ✅ ${name}`);
          });
        } else {
          console.log('  ❌ NO COOKIES SENT');
        }
      }
    });
    
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(2000);
    
    console.log(`Dashboard result: ${page.url()}`);
    
    // Check if we can manually call Supabase auth
    const authResult = await page.evaluate(async () => {
      try {
        // Try to access Supabase client if available
        if (typeof window !== 'undefined' && window.supabase) {
          const { data: { user } } = await window.supabase.auth.getUser();
          return { hasUser: !!user, userEmail: user?.email };
        }
        return { error: 'Supabase not available' };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('\n🔍 Client-side auth check:', authResult);
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testSupabaseCookies().catch(console.error);
