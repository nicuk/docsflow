/**
 * COOKIE DOMAIN DEBUG
 * Check exact domain/cookie matching
 */

import { chromium } from 'playwright';

async function testCookieDomain() {
  console.log('🌐 COOKIE DOMAIN DEBUG');
  console.log('=====================');
  
  const browser = await chromium.launch({ 
    headless: false
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n📍 STEP 1: Check current domain and login');
    await page.goto('http://localhost:3001/login');
    
    const currentDomain = await page.evaluate(() => {
      return {
        hostname: window.location.hostname,
        origin: window.location.origin,
        protocol: window.location.protocol,
        port: window.location.port
      };
    });
    
    console.log('Current domain info:', currentDomain);
    
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('\n📍 STEP 2: Analyze cookies vs domain');
    const cookies = await page.context().cookies();
    
    console.log('\n🍪 ALL COOKIES:');
    cookies.forEach(cookie => {
      console.log(`- ${cookie.name}`);
      console.log(`  Domain: ${cookie.domain}`);
      console.log(`  Path: ${cookie.path}`);
      console.log(`  Secure: ${cookie.secure}`);
      console.log(`  SameSite: ${cookie.sameSite}`);
      console.log(`  HttpOnly: ${cookie.httpOnly}`);
      console.log('');
    });
    
    console.log('\n📍 STEP 3: Test cookie sending with different methods');
    
    // Method 1: Check document.cookie
    const documentCookies = await page.evaluate(() => {
      return {
        documentCookie: document.cookie,
        cookieLength: document.cookie.length
      };
    });
    
    console.log('Document.cookie length:', documentCookies.cookieLength);
    
    // Method 2: Manual fetch with explicit cookies
    const manualFetch = await page.evaluate(() => {
      return fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',  // This should include cookies
        headers: {
          'Accept': 'application/json'
        }
      }).then(r => ({
        status: r.status,
        ok: r.ok
      })).catch(e => ({
        error: e.message
      }));
    });
    
    console.log('\n🔍 Manual fetch result:', manualFetch);
    
    // Method 3: Check if it's a CORS issue
    const corsTest = await page.evaluate(() => {
      return fetch('http://localhost:3001/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        mode: 'cors'
      }).then(r => ({
        status: r.status,
        ok: r.ok
      })).catch(e => ({
        error: e.message
      }));
    });
    
    console.log('CORS test result:', corsTest);
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testCookieDomain().catch(console.error);
