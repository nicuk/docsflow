import { NextRequest, NextResponse } from 'next/server';
import { getCORSHeaders } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// 5 Strategic Questions for Custom Persona Creation
const ONBOARDING_QUESTIONS = [
  {
    id: 1,
    question: "What type of business do you run?",
    subtitle: "Help us understand your industry",
    options: [
      "Motorcycle Dealership",
      "Warehouse & Distribution", 
      "Manufacturing",
      "Professional Services",
      "Healthcare",
      "Other"
    ]
  },
  {
    id: 2,
    question: "What's your primary role in the company?",
    subtitle: "This helps us tailor the AI's communication style",
    options: [
      "Owner/CEO",
      "Operations Manager", 
      "Sales Manager",
      "Customer Service",
      "Finance Manager",
      "Other"
    ]
  },
  {
    id: 3,
    question: "What business challenges keep you up at night?",
    subtitle: "Our AI will focus on helping solve these specific pain points",
    options: [
      "Managing inventory efficiently",
      "Improving customer response times",
      "Reducing operational costs",
      "Scaling the business",
      "Compliance and documentation",
      "Staff training and knowledge management"
    ]
  },
  {
    id: 4,
    question: "How technical is your team?",
    subtitle: "This determines how the AI explains technical concepts",
    options: [
      "Very technical - use industry jargon",
      "Moderately technical - some technical terms are fine",
      "Non-technical - explain everything in simple terms",
      "Mixed team - adapt based on context"
    ]
  },
  {
    id: 5,
    question: "What's your preferred communication style?",
    subtitle: "The AI will match this tone in all interactions",
    options: [
      "Direct and to-the-point",
      "Friendly and conversational", 
      "Formal and professional",
      "Analytical with detailed explanations",
      "Supportive and encouraging"
    ]
  }
];

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 200, headers: getCORSHeaders(origin) });
}

// GET: Return the 5 onboarding questions
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    return NextResponse.json({
      questions: ONBOARDING_QUESTIONS,
      total: ONBOARDING_QUESTIONS.length
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to fetch onboarding questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding questions' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Process answers and generate custom AI persona
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCORSHeaders(origin);

  try {
    const { answers, userEmail } = await request.json();

    if (!answers || Object.keys(answers).length !== 5) {
      return NextResponse.json(
        { error: 'All 5 questions must be answered' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate custom AI persona based on answers
    const customPersona = await generateCustomPersona(answers);
    
    // Create tenant with custom persona
    const tenant = await createTenantWithPersona(answers, customPersona, userEmail);

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
        industry: tenant.industry
      },
      persona: customPersona,
      redirect_url: `https://${tenant.subdomain}.docsflow.app/dashboard`
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Onboarding processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process onboarding' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Generate custom AI persona using LLM
async function generateCustomPersona(answers: Record<string, string>) {
  const prompt = `
Create a custom AI assistant persona based on these business answers:

1. Business Type: ${answers['1']}
2. User Role: ${answers['2']} 
3. Main Challenges: ${answers['3']}
4. Team Technical Level: ${answers['4']}
5. Communication Style: ${answers['5']}

Generate a custom AI persona with:
1. Role/Identity (who the AI should act as)
2. Communication tone
3. Key focus areas
4. Technical complexity level
5. Specific business context

Return as JSON with: role, tone, focus_areas (array), technical_level, business_context, greeting_message
`;

  try {
    // For now, create rule-based persona (can be replaced with LLM later)
    const persona = createRuleBasedPersona(answers);
    return persona;
  } catch (error) {
    console.error('Persona generation error:', error);
    // Fallback to default persona
    return getDefaultPersona();
  }
}

// Rule-based persona creation (immediate implementation)
function createRuleBasedPersona(answers: Record<string, string>) {
  const businessType = answers['1'];
  const role = answers['2'];
  const challenges = answers['3'];
  const techLevel = answers['4'];
  const commStyle = answers['5'];

  // Map business type to specific context
  const businessContextMap: Record<string, {industry: string, context: string, terminology: string}> = {
    'Motorcycle Dealership': {
      industry: 'motorcycle_dealer',
      context: 'motorcycle sales, service, inventory, and customer relations',
      terminology: 'bikes, parts, service, maintenance, customers'
    },
    'Warehouse & Distribution': {
      industry: 'warehouse_distribution', 
      context: 'logistics, inventory management, shipping, and supply chain operations',
      terminology: 'inventory, logistics, suppliers, orders, distribution'
    }
    // Add more as needed
  };

  const businessInfo = businessContextMap[businessType] || {
    industry: 'general_business',
    context: 'general business operations and management',
    terminology: 'business operations, customers, processes'
  };

  return {
    role: `Expert ${businessType} Assistant specialized in ${businessInfo.context}`,
    tone: commStyle,
    focus_areas: [
      challenges,
      businessInfo.context,
      `${role} responsibilities`,
      'Document analysis and insights'
    ],
    technical_level: techLevel,
    business_context: businessInfo.context,
    industry: businessInfo.industry,
    greeting_message: `Hi! I'm your AI assistant specialized in ${businessInfo.context}. I'm here to help with ${challenges.toLowerCase()} and any questions about your business documents. How can I assist you today?`,
    prompt_template: `
You are an expert AI assistant for a ${businessType} company.

ROLE: ${role} AI Assistant
COMMUNICATION STYLE: ${commStyle}
TECHNICAL LEVEL: ${techLevel}
PRIMARY FOCUS: ${challenges}

INSTRUCTIONS:
- Stay focused on ${businessInfo.context}
- Use ${businessInfo.terminology} terminology appropriately
- Match the ${commStyle.toLowerCase()} communication style
- Adjust technical complexity for: ${techLevel}
- Prioritize helping with: ${challenges}

When answering questions:
1. Reference only relevant business documents provided
2. Provide practical, actionable advice
3. Include source citations and confidence scores
4. Focus on ${businessInfo.context} context
`
  };
}

function getDefaultPersona() {
  return {
    role: 'Business AI Assistant',
    tone: 'Friendly and professional',
    focus_areas: ['General business operations', 'Document analysis'],
    technical_level: 'Moderate',
    business_context: 'general business',
    industry: 'general',
    greeting_message: 'Hello! I\'m your AI assistant. How can I help you today?',
    prompt_template: 'You are a helpful business AI assistant.'
  };
}

// Create tenant with custom persona
async function createTenantWithPersona(answers: Record<string, string>, persona: any, userEmail?: string) {
  const supabase = getSupabaseClient();
  
  const businessType = answers['1'];
  const tenantName = `${businessType} Demo`;
  const subdomain = `${businessType.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;

  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert({
      name: tenantName,
      subdomain: subdomain,
      industry: persona.industry,
      custom_persona: persona,
      created_from_onboarding: true,
      onboarding_answers: answers
    })
    .select()
    .single();

  if (error) {
    console.error('Tenant creation error:', error);
    throw new Error('Failed to create tenant');
  }

  return tenant;
} 