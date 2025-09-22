import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up production tests against Vercel deployment...');
  
  // Test if the production site is accessible
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🔍 Checking production site accessibility...');
    await page.goto('https://docsflow.app', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Production site is accessible');
    
    // Check if login page is accessible
    await page.goto('https://docsflow.app/login', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Login page is accessible');
    
    // Take a screenshot for reference
    await page.screenshot({ path: 'test-results/production-login-page.png', fullPage: true });
    
  } catch (error) {
    console.error('❌ Production site check failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('✅ Production test setup complete');
}

export default globalSetup;
