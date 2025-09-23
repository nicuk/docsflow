#!/usr/bin/env node

/**
 * 🎯 STYLING DIAGNOSTIC TOOL
 * Check all styling-related files and configs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🎯 STYLING DIAGNOSTIC REPORT');
console.log('='.repeat(50));

// Check 1: Package.json dependencies
console.log('\n🔍 CHECK 1: Styling Dependencies');
console.log('-'.repeat(30));

try {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  
  const stylingDeps = [
    'tailwindcss',
    'tailwindcss-animate', 
    'autoprefixer',
    'postcss',
    '@radix-ui/react-accordion',
    'class-variance-authority',
    'next-themes'
  ];
  
  stylingDeps.forEach(dep => {
    const installed = pkg.dependencies?.[dep] || pkg.devDependencies?.[dep];
    console.log(`${installed ? '✅' : '❌'} ${dep}: ${installed || 'MISSING'}`);
  });
  
  // Check for problematic type module
  console.log(`${pkg.type === 'module' ? '🚨' : '✅'} type: ${pkg.type || 'undefined'}`);
  
} catch (e) {
  console.log('❌ Could not read package.json');
}

// Check 2: Tailwind Config
console.log('\n🔍 CHECK 2: Tailwind Configuration');
console.log('-'.repeat(30));

const tailwindConfigs = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs'];
let tailwindConfig = null;

for (const config of tailwindConfigs) {
  if (existsSync(config)) {
    console.log(`✅ Found: ${config}`);
    try {
      const content = readFileSync(config, 'utf8');
      
      // Check for key config elements
      console.log(`${content.includes('tailwindcss-animate') ? '✅' : '❌'} Has tailwindcss-animate plugin`);
      console.log(`${content.includes('./app/**') ? '✅' : '❌'} Includes app directory in content`);
      console.log(`${content.includes('./components/**') ? '✅' : '❌'} Includes components directory`);
      console.log(`${content.includes('darkMode') ? '✅' : '❌'} Has dark mode config`);
      
      tailwindConfig = content;
      break;
    } catch (e) {
      console.log(`❌ Could not read ${config}`);
    }
  }
}

if (!tailwindConfig) {
  console.log('🚨 NO TAILWIND CONFIG FOUND!');
}

// Check 3: PostCSS Config
console.log('\n🔍 CHECK 3: PostCSS Configuration');
console.log('-'.repeat(30));

const postcssConfigs = ['postcss.config.js', 'postcss.config.mjs', 'postcss.config.json'];
let hasPostCSS = false;

for (const config of postcssConfigs) {
  if (existsSync(config)) {
    console.log(`✅ Found: ${config}`);
    try {
      const content = readFileSync(config, 'utf8');
      console.log(`${content.includes('tailwindcss') ? '✅' : '❌'} Includes Tailwind CSS`);
      console.log(`${content.includes('autoprefixer') ? '✅' : '❌'} Includes Autoprefixer`);
      hasPostCSS = true;
      break;
    } catch (e) {
      console.log(`❌ Could not read ${config}`);
    }
  }
}

if (!hasPostCSS) {
  console.log('🚨 NO POSTCSS CONFIG FOUND!');
}

// Check 4: Global CSS
console.log('\n🔍 CHECK 4: Global CSS File');
console.log('-'.repeat(30));

const globalCSSPaths = ['app/globals.css', 'styles/globals.css', 'src/app/globals.css'];
let hasGlobalCSS = false;

for (const cssPath of globalCSSPaths) {
  if (existsSync(cssPath)) {
    console.log(`✅ Found: ${cssPath}`);
    try {
      const content = readFileSync(cssPath, 'utf8');
      console.log(`${content.includes('@tailwind base') ? '✅' : '❌'} Has @tailwind base`);
      console.log(`${content.includes('@tailwind components') ? '✅' : '❌'} Has @tailwind components`);
      console.log(`${content.includes('@tailwind utilities') ? '✅' : '❌'} Has @tailwind utilities`);
      console.log(`${content.includes('--background') ? '✅' : '❌'} Has CSS variables`);
      hasGlobalCSS = true;
      break;
    } catch (e) {
      console.log(`❌ Could not read ${cssPath}`);
    }
  }
}

if (!hasGlobalCSS) {
  console.log('🚨 NO GLOBAL CSS FOUND!');
}

// Check 5: Next.js Config
console.log('\n🔍 CHECK 5: Next.js Configuration');
console.log('-'.repeat(30));

const nextConfigs = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
let hasNextConfig = false;

for (const config of nextConfigs) {
  if (existsSync(config)) {
    console.log(`✅ Found: ${config}`);
    hasNextConfig = true;
    break;
  }
}

if (!hasNextConfig) {
  console.log('🚨 NO NEXT.JS CONFIG FOUND!');
}

// Check 6: Sample Component Classes
console.log('\n🔍 CHECK 6: Component Tailwind Classes');
console.log('-'.repeat(30));

const componentPaths = [
  'app/page.tsx',
  'app/layout.tsx', 
  'components/ui/button.tsx',
  'components/ui/card.tsx'
];

componentPaths.forEach(path => {
  if (existsSync(path)) {
    try {
      const content = readFileSync(path, 'utf8');
      const hasTailwindClasses = /className=["'][^"']*(?:bg-|text-|p-|m-|flex|grid|border)/g.test(content);
      console.log(`${hasTailwindClasses ? '✅' : '❌'} ${path}: ${hasTailwindClasses ? 'Has Tailwind classes' : 'No Tailwind classes found'}`);
    } catch (e) {
      console.log(`❌ Could not read ${path}`);
    }
  } else {
    console.log(`⚠️ ${path}: File not found`);
  }
});

// Final Diagnosis
console.log('\n🎯 DIAGNOSIS & RECOMMENDATIONS');
console.log('='.repeat(50));

const issues = [];
const fixes = [];

// Add specific diagnostic logic
if (!hasPostCSS) {
  issues.push('Missing PostCSS configuration');
  fixes.push('Create postcss.config.js with Tailwind and Autoprefixer');
}

if (!hasGlobalCSS) {
  issues.push('Missing global CSS file');
  fixes.push('Ensure app/globals.css exists with @tailwind directives');
}

if (!tailwindConfig) {
  issues.push('Missing Tailwind configuration');
  fixes.push('Create tailwind.config.js with proper content paths');
}

if (issues.length === 0) {
  console.log('✅ All styling configurations appear correct');
  console.log('💡 Issue might be in build process or deployment');
  console.log('🔧 Try: npm run build to check for CSS compilation errors');
} else {
  console.log('🚨 ISSUES FOUND:');
  issues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
  });
  
  console.log('\n💡 RECOMMENDED FIXES:');
  fixes.forEach((fix, i) => {
    console.log(`   ${i + 1}. ${fix}`);
  });
}

console.log('\n🎯 NEXT STEPS:');
console.log('1. Fix any red ❌ items above');
console.log('2. Run npm run build to test compilation');
console.log('3. Check browser dev tools for CSS loading errors');
console.log('4. Compare with last working git commit');
