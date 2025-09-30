/**
 * Visual Clerk Test - Browser Stays Open
 * 
 * Opens Chrome to /sign-in-clerk so you can inspect what's happening
 */

const { chromium } = require('playwright');

async function visualTest() {
  console.log('🧪 Opening browser for visual inspection...\n');
  console.log('This will:');
  console.log('1. Open Chrome browser');
  console.log('2. Navigate to /sign-in-clerk');
  console.log('3. Stay open so you can inspect');
  console.log('4. Press Ctrl+C in terminal to close when done\n');
  console.log('Starting in 2 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // Slow down actions so you can see them
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  console.log('📱 Opening /sign-in-clerk...');
  await page.goto('http://localhost:3000/sign-in-clerk');
  await page.waitForLoadState('networkidle');
  
  console.log('\n✅ Page loaded!');
  console.log('\n🔍 Inspect the page:');
  console.log('   - Do you see the Clerk sign-in form?');
  console.log('   - Or do you see a 404 / error page?');
  console.log('   - Check the browser console (F12) for errors');
  
  console.log('\n📋 URLs to test manually:');
  console.log('   http://localhost:3000/sign-in-clerk  (Clerk)');
  console.log('   http://localhost:3000/login          (Supabase)');
  console.log('   http://localhost:3000/dashboard-clerk (Clerk)');
  console.log('   http://localhost:3000/dashboard       (Supabase)');
  
  console.log('\n⏸️  Browser will stay open...');
  console.log('   Press Ctrl+C in terminal when done inspecting\n');
  
  // Keep browser open indefinitely
  await new Promise(() => {}); // Never resolves
}

visualTest().catch(console.error);
