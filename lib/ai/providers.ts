// Backend AI Provider - Based on working aichatbot implementation
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// Environment-based configuration like the working aichatbot
const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.PLAYWRIGHT ||
  process.env.CI_PLAYWRIGHT ||
  process.env.NODE_ENV === 'test'
);

// Mock provider for development when no API key
const mockProvider = {
  generatePersona: async (prompt: string) => {
    console.log('🔄 Using mock AI provider (no GOOGLE_GENERATIVE_AI_API_KEY)');
    return {
      role: "Business Intelligence Assistant",
      tone: "Professional and helpful", 
      focus_areas: ["document analysis", "business insights", "decision support"],
      business_context: "AI-powered business intelligence",
      prompt_template: "You are an AI assistant focused on providing helpful, accurate information.",
      industry: "general",
      created_from: "onboarding_answers_fallback"
    };
  }
};

// Real Gemini provider (like working aichatbot)
const realProvider = {
  generatePersona: async (prompt: string) => {
    try {
      const result = await generateText({
        model: google('gemini-1.5-flash'),
        prompt,
        maxTokens: 1000,
        temperature: 0.7,
      });
      
      // Extract JSON from response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          created_from: "onboarding_answers"
        };
      }
      
      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }
};

// Export the provider based on environment (like working aichatbot)
export const aiProvider = (() => {
  // If in test environment, use mock
  if (isTestEnvironment) {
    return mockProvider;
  }
  
  // If no API key, use mock
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn('⚠️ GOOGLE_GENERATIVE_AI_API_KEY not found - using mock AI provider');
    return mockProvider;
  }
  
  // Use real Gemini
  console.log('✅ Using real Gemini AI provider');
  return realProvider;
})();

// Helper function to check if real AI is available
export const isRealAIAvailable = () => {
  return !isTestEnvironment && Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
};