// DIAGNOSTIC SCRIPT: Check LLM and Security Issues
// Run this in Node.js to test the exact issues

console.log('🔍 DIAGNOSTIC: LLM and Security Issues');
console.log('=====================================');

// 1. Check Environment Variables
console.log('\n1. ENVIRONMENT VARIABLES:');
console.log('GOOGLE_GENERATIVE_AI_API_KEY:', process.env.GOOGLE_GENERATIVE_AI_API_KEY ? 'EXISTS' : 'MISSING ❌');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'EXISTS' : 'MISSING ❌');

// 2. Test AI Provider Import
console.log('\n2. AI PROVIDER TEST:');
try {
  const { aiProvider, isRealAIAvailable } = require('./lib/ai/providers');
  console.log('AI Provider imported:', '✅');
  console.log('Real AI Available:', isRealAIAvailable() ? '✅' : '❌ (using mock)');
  
  // Test generatePersona function
  console.log('generatePersona function exists:', typeof aiProvider.generatePersona === 'function' ? '✅' : '❌');
  
} catch (error) {
  console.log('AI Provider import failed:', '❌', error.message);
}

// 3. Test Mock Persona Generation
console.log('\n3. MOCK PERSONA GENERATION TEST:');
async function testMockPersona() {
  try {
    const { aiProvider } = require('./lib/ai/providers');
    const result = await aiProvider.generatePersona('Test prompt for healthcare business');
    console.log('Mock persona generation:', '✅');
    console.log('Response type:', typeof result);
    console.log('Response preview:', result.substring(0, 100) + '...');
    
    // Test JSON parsing
    const parsed = JSON.parse(result);
    console.log('JSON parsing:', '✅');
    console.log('Persona role:', parsed.role);
    
  } catch (error) {
    console.log('Mock persona generation failed:', '❌', error.message);
  }
}

testMockPersona();

// 4. Security Analysis
console.log('\n4. SECURITY ANALYSIS:');
console.log('Current subdomain admin check: POTENTIALLY INSECURE ⚠️');
console.log('- Relies on users table data (could be manipulated)');
console.log('- Should use auth metadata or service role verification');
console.log('- Recommendation: Cross-reference auth.users with custom users table');

console.log('\n5. RECOMMENDATIONS:');
console.log('LLM Issue: Add GOOGLE_GENERATIVE_AI_API_KEY to production environment');
console.log('Security Issue: Implement multi-source admin verification');
console.log('Debug: Add more logging to onboarding API for LLM persona step');
