#!/usr/bin/env node

/**
 * 🎯 PLAYWRIGHT STYLING DIAGNOSTIC TEST
 * Test the actual styling in the browser to identify the root cause
 */

import { chromium } from 'playwright';

async function testStyling() {
  console.log('🎯 PLAYWRIGHT STYLING DIAGNOSTIC');
  console.log('='.repeat(50));
  console.log('🔧 Testing: Actual browser styling vs expected');
  console.log('🎯 Goal: Identify why Tailwind CSS isn't applying');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the landing page
    console.log('🌐 Navigating to DocsFlow landing page...');
    await page.goto('https://docsflow.app/', { waitUntil: 'networkidle' });
    
    // Check if the page loaded
    const title = await page.title();
    console.log(`📄 Page title: "${title}"`);
    
    // Test 1: Check if Tailwind CSS is loaded
    console.log('\n🔍 TEST 1: Checking Tailwind CSS loading...');
    
    const tailwindCheck = await page.evaluate(() => {
      // Check if any stylesheets contain Tailwind
      const stylesheets = Array.from(document.styleSheets);
      let hasTailwind = false;
      let cssRules = 0;
      
      try {
        stylesheets.forEach(sheet => {
          if (sheet.cssRules) {
            cssRules += sheet.cssRules.length;
            Array.from(sheet.cssRules).forEach(rule => {
              if (rule.cssText && (
                rule.cssText.includes('--tw-') || 
                rule.cssText.includes('tailwind') ||
                rule.cssText.includes('bg-') ||
                rule.cssText.includes('text-')
              )) {
                hasTailwind = true;
              }
            });
          }
        });
      } catch (e) {
        console.log('CORS restriction on stylesheets');
      }
      
      return { hasTailwind, cssRules, stylesheetCount: stylesheets.length };
    });
    
    console.log(`✅ Stylesheets loaded: ${tailwindCheck.stylesheetCount}`);
    console.log(`✅ Total CSS rules: ${tailwindCheck.cssRules}`);
    console.log(`${tailwindCheck.hasTailwind ? '✅' : '❌'} Tailwind CSS detected: ${tailwindCheck.hasTailwind}`);
    
    // Test 2: Check specific element styling
    console.log('\n🔍 TEST 2: Checking specific element styling...');
    
    const elementStyles = await page.evaluate(() => {
      const results = [];
      
      // Check the main heading
      const heading = document.querySelector('h1, h2, .text-4xl, [class*="text-"]');
      if (heading) {
        const styles = window.getComputedStyle(heading);
        results.push({
          element: 'Main heading',
          classes: heading.className,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          color: styles.color,
          margin: styles.margin
        });
      }
      
      // Check a button
      const button = document.querySelector('button, .btn, [class*="bg-"]');
      if (button) {
        const styles = window.getComputedStyle(button);
        results.push({
          element: 'Button/CTA',
          classes: button.className,
          backgroundColor: styles.backgroundColor,
          padding: styles.padding,
          borderRadius: styles.borderRadius,
          color: styles.color
        });
      }
      
      // Check the body
      const body = document.body;
      const bodyStyles = window.getComputedStyle(body);
      results.push({
        element: 'Body',
        classes: body.className,
        fontFamily: bodyStyles.fontFamily,
        backgroundColor: bodyStyles.backgroundColor,
        margin: bodyStyles.margin,
        padding: bodyStyles.padding
      });
      
      return results;
    });
    
    elementStyles.forEach((el, i) => {
      console.log(`\n📊 Element ${i + 1}: ${el.element}`);
      console.log(`   Classes: "${el.classes}"`);
      Object.entries(el).forEach(([key, value]) => {
        if (key !== 'element' && key !== 'classes') {
          console.log(`   ${key}: ${value}`);
        }
      });
    });
    
    // Test 3: Check for CSS custom properties (Tailwind variables)
    console.log('\n🔍 TEST 3: Checking CSS custom properties...');
    
    const customProps = await page.evaluate(() => {
      const root = document.documentElement;
      const rootStyles = window.getComputedStyle(root);
      const props = {};
      
      // Check for common Tailwind/shadcn variables
      const varsToCheck = [
        '--background',
        '--foreground', 
        '--primary',
        '--secondary',
        '--border',
        '--ring',
        '--radius'
      ];
      
      varsToCheck.forEach(varName => {
        props[varName] = rootStyles.getPropertyValue(varName);
      });
      
      return props;
    });
    
    Object.entries(customProps).forEach(([prop, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`   ${status} ${prop}: "${value}"`);
    });
    
    // Test 4: Check for Tailwind classes working
    console.log('\n🔍 TEST 4: Testing Tailwind class application...');
    
    const tailwindTest = await page.evaluate(() => {
      // Create a test element with Tailwind classes
      const testDiv = document.createElement('div');
      testDiv.className = 'bg-blue-500 text-white p-4 rounded-lg shadow-lg';
      testDiv.style.position = 'fixed';
      testDiv.style.top = '10px';
      testDiv.style.right = '10px';
      testDiv.style.zIndex = '9999';
      testDiv.textContent = 'Tailwind Test';
      document.body.appendChild(testDiv);
      
      const styles = window.getComputedStyle(testDiv);
      const result = {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        padding: styles.padding,
        borderRadius: styles.borderRadius,
        boxShadow: styles.boxShadow
      };
      
      // Clean up
      document.body.removeChild(testDiv);
      
      return result;
    });
    
    console.log('   Test element styles:');
    Object.entries(tailwindTest).forEach(([prop, value]) => {
      const isWorking = value && value !== 'rgba(0, 0, 0, 0)' && value !== 'none' && value !== '0px';
      const status = isWorking ? '✅' : '❌';
      console.log(`   ${status} ${prop}: ${value}`);
    });
    
    // Test 5: Check console errors
    console.log('\n🔍 TEST 5: Checking console errors...');
    
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // Wait a moment for any errors
    await page.waitForTimeout(2000);
    
    if (logs.length > 0) {
      console.log('❌ Console errors found:');
      logs.forEach((log, i) => {
        console.log(`   ${i + 1}. ${log}`);
      });
    } else {
      console.log('✅ No console errors detected');
    }
    
    // Final diagnosis
    console.log('\n🎯 DIAGNOSIS:');
    console.log('='.repeat(30));
    
    if (!tailwindCheck.hasTailwind) {
      console.log('🚨 ISSUE: Tailwind CSS is not loading or not compiled');
      console.log('💡 SOLUTION: Check build process and CSS compilation');
    } else if (Object.values(customProps).every(v => !v)) {
      console.log('🚨 ISSUE: CSS custom properties missing');
      console.log('💡 SOLUTION: Check globals.css and CSS variable definitions');
    } else if (Object.values(tailwindTest).every(v => !v || v === 'none')) {
      console.log('🚨 ISSUE: Tailwind classes not applying');
      console.log('💡 SOLUTION: Check Tailwind config and PostCSS setup');
    } else {
      console.log('✅ Styling appears to be working correctly');
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser left open for manual inspection...');
    console.log('Press Ctrl+C to close when done.');
    
    // Keep the test running
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if Playwright is installed
async function checkPlaywright() {
  try {
    await import('playwright');
    return true;
  } catch {
    console.log('❌ Playwright not installed. Installing...');
    return false;
  }
}

async function main() {
  const hasPlaywright = await checkPlaywright();
  
  if (!hasPlaywright) {
    console.log('Run: npm install playwright');
    console.log('Then: npx playwright install');
    return;
  }
  
  await testStyling();
}

main().catch(console.error);
