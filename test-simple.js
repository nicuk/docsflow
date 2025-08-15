// Simple test to check if Gemini is configured
console.log('Testing Gemini 2.0 Flash configuration...');

// Check if we can import the providers
try {
  const path = require('path');
  const fs = require('fs');
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  const envExists = fs.existsSync(envPath);
  console.log('✓ .env file exists:', envExists);
  
  if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasGoogleKey = envContent.includes('GOOGLE_GENERATIVE_AI_API_KEY') || envContent.includes('GOOGLE_AI_API_KEY');
    console.log('✓ Google API key configured:', hasGoogleKey);
    
    if (hasGoogleKey) {
      console.log('✅ Gemini should be working - API key is configured');
    } else {
      console.log('❌ No Google API key found in .env file');
    }
  } else {
    console.log('❌ No .env file found - Gemini will use mock provider');
  }
  
  // Check the providers file
  const providersPath = path.join(__dirname, 'lib', 'ai', 'providers.ts');
  if (fs.existsSync(providersPath)) {
    const providersContent = fs.readFileSync(providersPath, 'utf8');
    const hasGemini20 = providersContent.includes('gemini-2.0-flash');
    console.log('✓ Using Gemini 2.0 Flash:', hasGemini20);
  }
  
} catch (error) {
  console.error('❌ Test error:', error.message);
}

console.log('\nTo test the actual API, make sure:');
console.log('1. .env file exists with GOOGLE_GENERATIVE_AI_API_KEY');
console.log('2. Development server is running (npm run dev)');
console.log('3. Try the chat API at http://localhost:3000/api/chat');
