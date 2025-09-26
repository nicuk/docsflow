#!/usr/bin/env node

/**
 * SESSION REFRESH DIAGNOSTIC
 * Test why Supabase session cookies are missing and refresh tokens aren't working
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseSessionRefresh() {
  console.log('🔍 DIAGNOSING SESSION REFRESH ISSUES...\n');

  try {
    // 1. Test normal login flow
    console.log('📋 STEP 1: Testing normal login flow');
    const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
      email: 'support@bitto.tech',
      password: 'Testing123?'
    });

    if (authError) {
      console.log('❌ Login failed:', authError.message);
      return;
    }

    console.log('✅ Login successful');
    console.log('🔍 Session details:', {
      hasUser: !!authData.user,
      hasSession: !!authData.session,
      accessTokenLength: authData.session?.access_token?.length || 0,
      refreshTokenLength: authData.session?.refresh_token?.length || 0,
      expiresIn: authData.session?.expires_in,
      expiresAt: authData.session?.expires_at
    });

    // 2. Test session persistence
    console.log('\n📋 STEP 2: Testing session persistence');
    const { data: sessionData, error: sessionError } = await supabaseAnon.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session retrieval failed:', sessionError.message);
    } else {
      console.log('✅ Session retrieved:', {
        hasSession: !!sessionData.session,
        sameAccessToken: sessionData.session?.access_token === authData.session?.access_token
      });
    }

    // 3. Test refresh token manually
    console.log('\n📋 STEP 3: Testing refresh token manually');
    const refreshToken = authData.session?.refresh_token;
    
    if (refreshToken) {
      const { data: refreshData, error: refreshError } = await supabaseAnon.auth.refreshSession({
        refresh_token: refreshToken
      });

      if (refreshError) {
        console.log('❌ Refresh token failed:', refreshError.message);
      } else {
        console.log('✅ Refresh token successful:', {
          hasNewSession: !!refreshData.session,
          newAccessTokenLength: refreshData.session?.access_token?.length || 0,
          tokensChanged: refreshData.session?.access_token !== authData.session?.access_token
        });
      }
    }

    // 4. Test API endpoint behavior
    console.log('\n📋 STEP 4: Testing session API endpoint');
    
    try {
      // Create cookies like the browser would
      const cookies = [
        `auth-token=${authData.session?.access_token}`,
        `refresh-token=${authData.session?.refresh_token}`,
        `user-email=support@bitto.tech`,
        `tenant-id=122928f6-f34e-484b-9a69-7e1f25caf45c`,
        `tenant-subdomain=bitto`
      ].join('; ');

      const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://bitto.docsflow.app'}/api/auth/session`, {
        headers: {
          'Cookie': cookies,
          'User-Agent': 'SessionDiagnostic/1.0'
        }
      });

      if (sessionResponse.ok) {
        const sessionResult = await sessionResponse.json();
        console.log('✅ Session API response:', {
          authenticated: sessionResult.authenticated,
          hasUser: !!sessionResult.user,
          userEmail: sessionResult.user?.email
        });
      } else {
        console.log('❌ Session API failed:', sessionResponse.status, sessionResponse.statusText);
        const errorText = await sessionResponse.text();
        console.log('🔍 Error details:', errorText.substring(0, 200));
      }
    } catch (apiError) {
      console.log('❌ Session API error:', apiError.message);
    }

    // 5. Test conversation creation with session
    console.log('\n📋 STEP 5: Testing conversation creation');
    
    // Use the authenticated client
    const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session?.access_token}`
        }
      }
    });

    try {
      const conversationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://bitto.docsflow.app'}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session?.access_token}`,
          'Cookie': [
            `auth-token=${authData.session?.access_token}`,
            `refresh-token=${authData.session?.refresh_token}`,
            `user-email=support@bitto.tech`,
            `tenant-id=122928f6-f34e-484b-9a69-7e1f25caf45c`,
            `tenant-subdomain=bitto`
          ].join('; ')
        },
        body: JSON.stringify({
          title: 'Diagnostic Test Conversation'
        })
      });

      if (conversationResponse.ok) {
        const conversationResult = await conversationResponse.json();
        console.log('✅ Conversation creation successful:', {
          hasConversation: !!conversationResult.conversation,
          conversationId: conversationResult.conversation?.id
        });
      } else {
        console.log('❌ Conversation creation failed:', conversationResponse.status);
        const errorText = await conversationResponse.text();
        console.log('🔍 Error details:', errorText.substring(0, 300));
      }
    } catch (convError) {
      console.log('❌ Conversation creation error:', convError.message);
    }

    // 6. Test cookie expiration simulation
    console.log('\n📋 STEP 6: Testing expired session handling');
    
    // Wait a moment then test if session is still valid
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: laterSession, error: laterError } = await supabaseAnon.auth.getSession();
    
    if (laterError) {
      console.log('❌ Session expired or invalid:', laterError.message);
    } else {
      console.log('✅ Session still valid:', {
        hasSession: !!laterSession.session,
        timeRemaining: laterSession.session ? 
          Math.floor((laterSession.session.expires_at * 1000 - Date.now()) / 1000) : 0
      });
    }

    // 7. Cleanup - logout
    console.log('\n📋 STEP 7: Cleanup');
    await supabaseAnon.auth.signOut();
    console.log('✅ Logged out successfully');

  } catch (error) {
    console.error('💥 Diagnostic failed:', error.message);
    console.error(error.stack);
  }
}

// Create environment check
function checkEnvironment() {
  console.log('🔍 Environment Check:');
  console.log('- Supabase URL:', supabaseUrl ? '✅' : '❌');
  console.log('- Anon Key:', supabaseAnonKey ? '✅' : '❌');
  console.log('- Service Key:', supabaseServiceKey ? '✅' : '❌');
  console.log('- App URL:', process.env.NEXT_PUBLIC_APP_URL || 'Using default');
  console.log();
}

// Run the diagnostic
checkEnvironment();
diagnoseSessionRefresh().then(() => {
  console.log('\n✅ Session refresh diagnosis complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
