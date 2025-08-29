// Backend AI Provider - Based on working aichatbot implementation
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { OpenRouterClient, MODEL_CONFIGS } from '@/lib/openrouter-client';

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
    return JSON.stringify({
      role: "Business Intelligence Assistant",
      tone: "Professional and helpful",
      focus_areas: ["document analysis", "business insights", "decision support"],
      business_context: "AI-powered business intelligence",
      prompt_template: "You are an AI assistant focused on providing helpful, accurate information.",
      industry: "general",
      created_from: "onboarding_answers_fallback"
    });
  },
  getApiKey: () => 'mock-api-key-for-testing',
  getEmbeddingModel: () => null as any // Mock will not be called if key is absent
};

// Enhanced provider with OpenRouter + Gemini fallback
const enhancedProvider = {
  generatePersona: async (prompt: string) => {
    try {
      const openRouterClient = new OpenRouterClient();
      
      const messages = [
        {
          role: 'system' as const,
          content: 'You are an expert at creating business personas. Generate a comprehensive persona in valid JSON format with the specified fields.'
        },
        {
          role: 'user' as const,
          content: prompt
        }
      ];

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI generation timeout')), 25000);
      });

      try {
        // Try OpenRouter models first (Llama-4 Maverick for creativity)
        const openRouterPromise = openRouterClient.generateWithFallback(
          MODEL_CONFIGS.PERSONA_GENERATION,
          messages,
          {
            max_tokens: 800,
            temperature: 0.8,
            response_format: { type: 'json_object' }
          }
        );

        const result = await Promise.race([openRouterPromise, timeoutPromise]);
        console.log(`🧠 Persona generated using ${result.modelUsed} (${result.fallbackCount} fallbacks)`);
        
        // Parse and enhance the response
        const parsed = JSON.parse(result.response);
        const enhancedResponse = {
          ...parsed,
          created_from: "onboarding_answers",
          model_used: result.modelUsed
        };
        
        return JSON.stringify(enhancedResponse);
        
      } catch (openRouterError) {
        console.warn('OpenRouter failed for persona generation, using Gemini fallback:', openRouterError);
        
        // Fallback to Gemini
        const generatePromise = generateText({
          model: google('gemini-2.0-pro'),
          prompt: messages.map(m => m.content).join('\n\n'),
          maxTokens: 800,
          temperature: 0.8,
        });

        const result = await Promise.race([generatePromise, timeoutPromise]) as any;
        
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const enhancedResponse = {
            ...parsed,
            created_from: "onboarding_answers",
            model_used: "gemini-2.0-pro (fallback)"
          };
          return JSON.stringify(enhancedResponse);
        }
        
        throw new Error('Failed to parse AI response from both OpenRouter and Gemini');
      }
      
    } catch (error) {
      console.error('Persona Generation Error:', error);
      throw error;
    }
  },
  getApiKey: () => process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  getEmbeddingModel: () => google.textEmbedding('text-embedding-004'),
};

// Export the provider based on environment (like working aichatbot)
export const aiProvider = (() => {
  // If in test environment, use mock
  if (isTestEnvironment) {
    return mockProvider;
  }
  
  // If no API keys, use mock
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.warn('⚠️ No AI API keys found - using mock AI provider');
    return mockProvider;
  }
  
  // Use enhanced provider with OpenRouter + Gemini
  console.log('✅ Using enhanced AI provider (OpenRouter + Gemini fallback)');
  return enhancedProvider;
})();

// Helper function to check if real AI is available
export const isRealAIAvailable = () => {
  return !isTestEnvironment && Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
};