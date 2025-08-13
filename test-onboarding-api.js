// Test the onboarding completion API directly
const https = require('https');
const http = require('http');

async function testOnboardingCompletion() {
  console.log('🧪 Testing onboarding completion API...');
  
  // This simulates what the frontend should be sending
  const testData = {
    responses: {
      business_overview: "We are a motorcycle dealership that specializes in Harley-Davidson bikes",
      daily_challenges: "Managing inventory and customer relationships",
      key_decisions: "Which bikes to order and how to price them",
      success_metrics: "Sales volume and customer satisfaction",
      information_needs: "Market trends and inventory analytics"
    },
    businessName: "Bitto Motorcycles",
    subdomain: "bitto",
    industry: "motorcycle_dealer",
    userRole: "admin",
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch('http://localhost:3000/api/onboarding/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This won't have auth headers, so we expect it to fail with 401
        // But we should see the API being called in the logs
      },
      body: JSON.stringify(testData)
    });

    const result = await response.text();
    
    console.log('📊 API Response:', {
      status: response.status,
      statusText: response.statusText,
      body: result
    });

  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

testOnboardingCompletion();
