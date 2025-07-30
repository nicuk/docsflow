// Backend AI Provider - Based on working aichatbot implementation
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.PLAYWRIGHT ||
  process.env.CI_PLAYWRIGHT ||
  process.env.NODE_ENV === 'test'
);

export function isRealAIAvailable(): boolean {
  return !isTestEnvironment && Boolean(process.env.GOOGLE_AI_API_KEY);
}

export interface PersonaData {
  role: string;
  tone: string;
  focus_areas: string[];
  business_context: string;
  prompt_template: string;
  industry: string;
  created_from: string;
}

const mockProvider = {
  generatePersona: async (prompt: string): Promise<PersonaData> => {
    console.log('🔄 Using mock AI provider (no GOOGLE_AI_API_KEY)');
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

const realProvider = {
  generatePersona: async (prompt: string): Promise<PersonaData> => {
    try {
      const result = await generateText({
        model: google('models/gemma-3n-e4b-it'), // Using Gemma 3n E4B
        prompt,
        maxTokens: 1000,
        temperature: 0.7,
      });

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

class AIProvider {
  async generatePersona(prompt: string): Promise<PersonaData | null> {
    const provider = (() => {
      if (isTestEnvironment) {
        return mockProvider;
      }
      if (!process.env.GOOGLE_AI_API_KEY) {
        console.warn('⚠️ GOOGLE_AI_API_KEY not found - using mock AI provider');
        return mockProvider;
      }
      console.log('✅ Using real Gemma 3n E4B AI provider');
      return realProvider;
    })();

    try {
      return await provider.generatePersona(prompt);
    } catch (error) {
      console.error('AI Provider Error:', error);
      // Fallback to mock provider on error
      return await mockProvider.generatePersona(prompt);
    }
  }

  private isValidPersona(persona: any): boolean {
    return (
      persona &&
      typeof persona.role === 'string' &&
      typeof persona.tone === 'string' &&
      Array.isArray(persona.focus_areas) &&
      typeof persona.business_context === 'string' &&
      typeof persona.prompt_template === 'string'
    );
  }
}

export const aiProvider = new AIProvider();
