/**
 * DIRECT SESSION API TEST
 * Test session API with manual cookie extraction
 */

import { chromium } from 'playwright';

async function testDirectSession() {
  console.log('🔍 DIRECT SESSION TEST');
  console.log('=====================');
  
  const browser = await chromium.launch({ 
    headless: false
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('\n📍 STEP 1: Login');
    await page.goto('http://localhost:3001/login');
    await page.fill('input[type="email"]', 'support@bitto.tech');
    await page.fill('input[type="password"]', 'Testing123?');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('\n📍 STEP 2: Extract cookies manually');
    const cookies = await page.context().cookies();
    const supabaseCookie = cookies.find(c => c.name.startsWith('sb-'));
    
    if (supabaseCookie) {
      console.log('✅ Found Supabase cookie:', supabaseCookie.name);
      
      // Make manual API request with cookie
      const apiResult = await page.evaluate(async (cookieData) => {
        try {
          const response = await fetch('/api/auth/session', {
            method: 'GET',
            headers: {
              'Cookie': `${cookieData.name}=${cookieData.value}`
            }
          });
          
          const text = await response.text();
          
          return {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: text,
            bodyLength: text.length
          };
        } catch (error) {
          return {
            error: error.message
          };
        }
      }, { name: supabaseCookie.name, value: supabaseCookie.value });
      
      console.log('\n🔍 API RESULT:');
      console.log('Status:', apiResult.status);
      console.log('Body length:', apiResult.bodyLength);
      
      if (apiResult.body && apiResult.bodyLength < 1000) {
        console.log('Response body:', apiResult.body);
      } else if (apiResult.body) {
        console.log('Response preview:', apiResult.body.substring(0, 200) + '...');
      }
      
      if (apiResult.error) {
        console.log('❌ Error:', apiResult.error);
      }
      
    } else {
      console.log('❌ No Supabase cookie found');
    }
    
    console.log('\n📍 STEP 3: Test dashboard navigation');
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForTimeout(2000);
    
    console.log('Final URL:', page.url());
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testDirectSession().catch(console.error);
