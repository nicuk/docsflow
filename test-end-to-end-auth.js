#!/usr/bin/env node

/**
 * END-TO-END AUTH TEST
 * Complete flow: Login → Session verification → Conversation creation → AI chat
 * This will reveal if our surgical fixes actually work or if we're still broken
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bitto.docsflow.app';

async function testCompleteAuthFlow() {
  console.log('🔍 TESTING COMPLETE AUTH FLOW...\n');
  console.log(`🌐 Testing against: ${BASE_URL}\n`);

  let authCookies = '';
  let accessToken = '';

  try {
    // STEP 1: Test login API (should set cookies)
    console.log('📋 STEP 1: Testing login API');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'support@bitto.tech',
        password: 'Testing123?',
        rememberMe: true
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login API failed:', loginResponse.status, loginResponse.statusText);
      const errorText = await loginResponse.text();
      console.log('🔍 Error details:', errorText.substring(0, 300));
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login API successful:', {
      success: loginData.success,
      hasUser: !!loginData.user,
      hasSession: !!loginData.session,
      userEmail: loginData.user?.email
    });

    // Extract cookies from response
    const setCookieHeaders = loginResponse.headers.get('set-cookie');
    if (setCookieHeaders) {
      // Parse Set-Cookie headers and create Cookie header
      const cookies = setCookieHeaders.split(',').map(cookie => {
        const [nameValue] = cookie.trim().split(';');
        return nameValue;
      }).join('; ');
      authCookies = cookies;
      console.log('🍪 Extracted cookies for future requests');
    }

    accessToken = loginData.session?.access_token || '';

    // STEP 2: Test session API (should recognize our session)
    console.log('\n📋 STEP 2: Testing session API with login cookies');
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        'Cookie': authCookies,
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'EndToEndTest/1.0'
      }
    });

    if (!sessionResponse.ok) {
      console.log('❌ Session API failed:', sessionResponse.status, sessionResponse.statusText);
      const errorText = await sessionResponse.text();
      console.log('🔍 Error details:', errorText.substring(0, 300));
    } else {
      const sessionData = await sessionResponse.json();
      console.log('✅ Session API response:', {
        authenticated: sessionData.authenticated,
        hasUser: !!sessionData.user,
        userEmail: sessionData.user?.email,
        hasTenant: !!sessionData.user?.tenant
      });

      if (!sessionData.authenticated) {
        console.log('❌ CRITICAL: Session API shows user as NOT authenticated despite successful login');
        console.log('🔍 This indicates our session persistence fix did not work');
      }
    }

    // STEP 3: Test conversation creation (should work with authenticated session)
    console.log('\n📋 STEP 3: Testing conversation creation');
    const conversationResponse = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Authorization': `Bearer ${accessToken}`,
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/dashboard/chat`
      },
      body: JSON.stringify({
        title: 'End-to-End Test Conversation'
      })
    });

    if (!conversationResponse.ok) {
      console.log('❌ Conversation creation failed:', conversationResponse.status, conversationResponse.statusText);
      const errorText = await conversationResponse.text();
      console.log('🔍 Error details:', errorText.substring(0, 300));
    } else {
      const conversationData = await conversationResponse.json();
      console.log('✅ Conversation creation successful:', {
        hasConversation: !!conversationData.conversation,
        conversationId: conversationData.conversation?.id,
        title: conversationData.conversation?.title
      });
    }

    // STEP 4: Test AI chat (should find documents)
    console.log('\n📋 STEP 4: Testing AI chat functionality');
    const chatResponse = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookies,
        'Authorization': `Bearer ${accessToken}`,
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/dashboard/chat`
      },
      body: JSON.stringify({
        message: 'What documents did I upload? Tell me about my SAFT agreement.',
        conversationId: 'test-conversation-id'
      })
    });

    if (!chatResponse.ok) {
      console.log('❌ AI chat failed:', chatResponse.status, chatResponse.statusText);
      const errorText = await chatResponse.text();
      console.log('🔍 Error details:', errorText.substring(0, 300));
    } else {
      const chatData = await chatResponse.json();
      console.log('✅ AI chat response:', {
        hasResponse: !!chatData.response,
        responseLength: chatData.response?.length || 0,
        hasSources: !!chatData.sources && chatData.sources.length > 0,
        sourceCount: chatData.sources?.length || 0,
        responsePreview: chatData.response?.substring(0, 100) + '...'
      });

      if (chatData.sources && chatData.sources.length > 0) {
        console.log('📄 Document sources found:', chatData.sources.map(s => s.filename || s.content?.substring(0, 50)));
      }
    }

    // STEP 5: Test documents API (should show uploaded files)
    console.log('\n📋 STEP 5: Testing documents API');
    const documentsResponse = await fetch(`${BASE_URL}/api/documents`, {
      headers: {
        'Cookie': authCookies,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!documentsResponse.ok) {
      console.log('❌ Documents API failed:', documentsResponse.status, documentsResponse.statusText);
    } else {
      const documentsData = await documentsResponse.json();
      console.log('✅ Documents API response:', {
        hasDocuments: !!documentsData.documents,
        documentCount: documentsData.documents?.length || 0,
        documentNames: documentsData.documents?.slice(0, 3).map(d => d.filename) || []
      });
    }

    // FINAL ASSESSMENT
    console.log('\n📊 END-TO-END TEST SUMMARY:');
    console.log('=====================================');
    
    const loginWorks = loginResponse.ok && loginData.success;
    const sessionWorks = sessionResponse.ok && (await sessionResponse.json()).authenticated;
    const conversationWorks = conversationResponse.ok;
    const chatWorks = chatResponse.ok;
    const documentsWork = documentsResponse.ok;

    console.log(`Login API: ${loginWorks ? '✅' : '❌'}`);
    console.log(`Session Persistence: ${sessionWorks ? '✅' : '❌'}`);
    console.log(`Conversation Creation: ${conversationWorks ? '✅' : '❌'}`);
    console.log(`AI Chat: ${chatWorks ? '✅' : '❌'}`);
    console.log(`Documents Access: ${documentsWork ? '✅' : '❌'}`);

    const overallScore = [loginWorks, sessionWorks, conversationWorks, chatWorks, documentsWork]
      .filter(Boolean).length;

    console.log(`\n🎯 OVERALL SCORE: ${overallScore}/5 (${Math.round(overallScore/5*100)}%)`);

    if (overallScore === 5) {
      console.log('🎉 SUCCESS: All systems working! The surgical fixes were successful.');
    } else if (overallScore >= 3) {
      console.log('⚠️  PARTIAL: Some systems working, but issues remain.');
    } else {
      console.log('💥 FAILURE: Major issues persist. The surgical fixes did not resolve the problems.');
    }

    // Specific diagnostics based on failures
    if (loginWorks && !sessionWorks) {
      console.log('\n🔍 DIAGNOSIS: Session persistence still broken despite fix');
      console.log('   → Our custom auth-token cookie fix may not be working properly');
    }

    if (sessionWorks && !conversationWorks) {
      console.log('\n🔍 DIAGNOSIS: Conversation creation still broken despite fix');
      console.log('   → Our user ID fix may not be working, or other RLS issues exist');
    }

    if (conversationWorks && !chatWorks) {
      console.log('\n🔍 DIAGNOSIS: AI chat system has separate issues');
      console.log('   → Vector search, confidence thresholds, or RAG pipeline problems');
    }

  } catch (error) {
    console.error('💥 End-to-end test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the complete test
console.log('🚀 Starting comprehensive end-to-end authentication test...\n');
testCompleteAuthFlow().then(() => {
  console.log('\n✅ End-to-end test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal test error:', error);
  process.exit(1);
});
