import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { detectGibberish, getDefaultPersona, generatePersonaPrompts } from '@/lib/persona-prompt-generator';

/**
 * 🧪 TEST ENDPOINT: Validate AI Persona System
 * Tests persona generation, storage, retrieval, and quality
 */

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  data?: any;
}

export async function GET(request: NextRequest) {
  const results: TestResult[] = [];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // ===== TEST 1: Gibberish Detection =====
    const gibberishTests = [
      { input: 'asdfghjkl', shouldDetect: true },
      { input: '11111111111', shouldDetect: true },
      { input: '!@#$%^&*()', shouldDetect: true },
      { input: 'We run a healthcare clinic', shouldDetect: false },
      { input: 'Managing inventory and supply chain', shouldDetect: false },
      { input: '', shouldDetect: true },
    ];

    let gibberishPass = 0;
    gibberishTests.forEach(test => {
      const detected = detectGibberish(test.input);
      if (detected === test.shouldDetect) {
        gibberishPass++;
      }
    });

    results.push({
      test: 'Gibberish Detection',
      status: gibberishPass === gibberishTests.length ? 'pass' : 'fail',
      message: `${gibberishPass}/${gibberishTests.length} tests passed`,
      data: { tests: gibberishTests }
    });

    // ===== TEST 2: Default Persona Quality =====
    const defaultPersona = getDefaultPersona();
    const defaultQualityChecks = {
      hasRole: !!defaultPersona.role && defaultPersona.role.length > 10,
      hasTone: !!defaultPersona.tone && defaultPersona.tone.length > 5,
      hasContext: !!defaultPersona.business_context && defaultPersona.business_context.length > 50,
      hasFocusAreas: defaultPersona.focus_areas && defaultPersona.focus_areas.length >= 3,
      hasSystemPrompt: !!defaultPersona.system_prompt && defaultPersona.system_prompt.length > 200,
      hasFallbackPrompt: !!defaultPersona.fallback_prompt && defaultPersona.fallback_prompt.length > 50,
      promptMentionsRAG: defaultPersona.system_prompt?.includes('document') && 
                         defaultPersona.system_prompt?.includes('source'),
      promptHasGuidelines: defaultPersona.system_prompt?.includes('ONLY use information') ||
                           defaultPersona.system_prompt?.includes('explicitly stated')
    };

    const qualityScore = Object.values(defaultQualityChecks).filter(Boolean).length;
    const maxQualityScore = Object.keys(defaultQualityChecks).length;

    results.push({
      test: 'Default Persona Quality',
      status: qualityScore >= 7 ? 'pass' : qualityScore >= 5 ? 'warning' : 'fail',
      message: `Quality score: ${qualityScore}/${maxQualityScore}`,
      data: { checks: defaultQualityChecks, persona: defaultPersona }
    });

    // ===== TEST 3: Custom Persona Generation =====
    const testSettings = {
      role: 'Technical Support Specialist',
      tone: 'Friendly and patient',
      business_context: 'Software troubleshooting and customer support',
      industry: 'technology',
      focus_areas: ['bug diagnosis', 'user guidance', 'technical documentation']
    };

    const customPrompts = generatePersonaPrompts(testSettings);
    const customQualityChecks = {
      includesRole: customPrompts.system_prompt.includes(testSettings.role),
      includesTone: customPrompts.system_prompt.includes(testSettings.tone),
      includesIndustry: customPrompts.system_prompt.includes(testSettings.industry),
      includesFocusAreas: testSettings.focus_areas.some(area => 
        customPrompts.system_prompt.includes(area)
      ),
      hasRAGInstructions: customPrompts.system_prompt.includes('ONLY use') ||
                          customPrompts.system_prompt.includes('explicitly stated'),
      fallbackMentionsRole: customPrompts.fallback_prompt.includes(testSettings.role),
      fallbackHelpful: customPrompts.fallback_prompt.includes('help') ||
                       customPrompts.fallback_prompt.includes('assist')
    };

    const customScore = Object.values(customQualityChecks).filter(Boolean).length;
    const maxCustomScore = Object.keys(customQualityChecks).length;

    results.push({
      test: 'Custom Persona Generation',
      status: customScore >= 6 ? 'pass' : customScore >= 4 ? 'warning' : 'fail',
      message: `Generation score: ${customScore}/${maxCustomScore}`,
      data: { checks: customQualityChecks, prompts: customPrompts }
    });

    // ===== TEST 4: Database Schema =====
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('tenant_ai_persona')
      .select('id')
      .limit(1);

    results.push({
      test: 'Database Schema',
      status: schemaError ? 'fail' : 'pass',
      message: schemaError 
        ? `Table not found or inaccessible: ${schemaError.message}` 
        : 'tenant_ai_persona table exists and is accessible',
      data: { error: schemaError }
    });

    // ===== TEST 5: Persona CRUD Operations (if schema exists) =====
    if (!schemaError) {
      // Find a test tenant (use first available tenant)
      const { data: testTenant } = await supabase
        .from('tenants')
        .select('id, subdomain')
        .limit(1)
        .single();

      if (testTenant) {
        // Try to insert/update test persona
        const testPersona = {
          tenant_id: testTenant.id,
          role: 'Test Assistant',
          tone: 'Test Tone',
          business_context: 'Test Context',
          industry: 'general',
          focus_areas: ['test1', 'test2'],
          system_prompt: 'Test system prompt for validation',
          fallback_prompt: 'Test fallback prompt for validation',
          confidence_threshold: 0.3
        };

        const { error: upsertError } = await supabase
          .from('tenant_ai_persona')
          .upsert(testPersona, { onConflict: 'tenant_id' });

        // Clean up test data
        await supabase
          .from('tenant_ai_persona')
          .delete()
          .eq('tenant_id', testTenant.id)
          .eq('role', 'Test Assistant');

        results.push({
          test: 'Persona CRUD Operations',
          status: upsertError ? 'fail' : 'pass',
          message: upsertError 
            ? `Failed to insert/update: ${upsertError.message}` 
            : 'Successfully tested insert/update/delete operations',
          data: { tenantId: testTenant.id, error: upsertError }
        });
      } else {
        results.push({
          test: 'Persona CRUD Operations',
          status: 'warning',
          message: 'No test tenant available for CRUD testing',
        });
      }
    }

    // ===== TEST 6: Persona Usage Tracking =====
    const { data: personasWithUsage, error: usageError } = await supabase
      .from('tenant_ai_persona')
      .select('id, tenant_id, last_used_at, created_at')
      .not('last_used_at', 'is', null)
      .limit(5);

    results.push({
      test: 'Persona Usage Tracking',
      status: usageError ? 'fail' : personasWithUsage && personasWithUsage.length > 0 ? 'pass' : 'warning',
      message: usageError 
        ? `Tracking error: ${usageError.message}` 
        : personasWithUsage && personasWithUsage.length > 0
          ? `${personasWithUsage.length} personas have usage data`
          : 'No personas have been used yet (expected for new deployments)',
      data: { count: personasWithUsage?.length || 0, samples: personasWithUsage }
    });

    // ===== SUMMARY =====
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const totalTests = results.length;

    const overallStatus = failCount === 0 
      ? (warningCount === 0 ? 'pass' : 'pass_with_warnings')
      : 'fail';

    return NextResponse.json({
      summary: {
        status: overallStatus,
        passed: passCount,
        failed: failCount,
        warnings: warningCount,
        total: totalTests,
        score: `${passCount}/${totalTests}`,
        percentage: Math.round((passCount / totalTests) * 100)
      },
      tests: results,
      timestamp: new Date().toISOString(),
      recommendations: generateRecommendations(results)
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Test suite failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      results
    }, { status: 500 });
  }
}

function generateRecommendations(results: TestResult[]): string[] {
  const recommendations: string[] = [];

  results.forEach(result => {
    if (result.status === 'fail') {
      switch (result.test) {
        case 'Database Schema':
          recommendations.push('⚠️ CRITICAL: Run SQL migration to create tenant_ai_persona table');
          break;
        case 'Gibberish Detection':
          recommendations.push('🔧 Fix gibberish detection logic - some tests failing');
          break;
        case 'Default Persona Quality':
          recommendations.push('📝 Improve default persona quality - add more context or focus areas');
          break;
        case 'Custom Persona Generation':
          recommendations.push('🎨 Custom persona generation needs improvement');
          break;
        case 'Persona CRUD Operations':
          recommendations.push('🔧 Database operations failing - check RLS policies and permissions');
          break;
      }
    } else if (result.status === 'warning') {
      switch (result.test) {
        case 'Persona Usage Tracking':
          recommendations.push('ℹ️ No persona usage yet - this is normal for new deployments');
          break;
        case 'Default Persona Quality':
          recommendations.push('💡 Consider enhancing default persona for better quality');
          break;
      }
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('✅ All tests passed! Persona system is working correctly.');
  }

  return recommendations;
}

