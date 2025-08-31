interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: { type: 'json_object' };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private siteUrl: string;
  private siteName: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY!;
    this.siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    this.siteName = 'AI Lead Router SaaS';
    
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }

  async generate(
    model: string,
    messages: OpenRouterMessage[],
    options: OpenRouterOptions = {}
  ): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 2048,
          top_p: options.top_p ?? 0.95,
          frequency_penalty: options.frequency_penalty ?? 0,
          presence_penalty: options.presence_penalty ?? 0,
          response_format: options.response_format,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data: OpenRouterResponse = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      console.error(`OpenRouter API call failed for model ${model}:`, error);
      throw error;
    }
  }

  async generateWithFallback(
    models: string[],
    messages: OpenRouterMessage[],
    options: OpenRouterOptions = {}
  ): Promise<{ response: string; modelUsed: string; fallbackCount: number }> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      
      try {
        console.log(`🤖 Attempting ${model} (attempt ${i + 1}/${models.length})`);
        const response = await this.generate(model, messages, options);
        
        return {
          response,
          modelUsed: model,
          fallbackCount: i
        };
      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ Model ${model} failed:`, error);
        
        // If this is the last model, throw the error
        if (i === models.length - 1) {
          throw new Error(`All models failed. Last error: ${lastError.message}`);
        }
        
        // Wait before trying next model
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error('Unexpected end of fallback chain');
  }
}

// Model configurations for different use cases
export const MODEL_CONFIGS = {
  // 🤖 Chat Interface - Fast, efficient Q&A
  CHAT: [
    'deepseek/deepseek-r1-0528-qwen3-8b:free',  // 🚀 Best reasoning model
    'deepseek/deepseek-v3-0324:free',           // Fallback: Latest V3
    'mistralai/mistral-7b-instruct:free'        // Emergency fallback
  ] as string[],
  
  // 🔍 Document Processing - Structured outputs, metadata extraction
  DOCUMENT_PROCESSING: [
    'deepseek/deepseek-r1-0528-qwen3-8b:free',  // Best for structured analysis
    'deepseek/deepseek-v3-0324:free',           // Strong alternative
    'mistralai/mistral-7b-instruct:free'
  ] as string[],
  
  // 📈 RAG Pipeline - Search, reranking, synthesis
  RAG_PIPELINE: [
    'deepseek/deepseek-r1-0528-qwen3-8b:free',  // Superior reasoning for RAG
    'deepseek/deepseek-v3-0324:free',           // Latest generation
    'deepseek/deepseek-v3:free'                 // Stable V3 fallback
  ] as string[],
  
  // 🧠 Persona Generation - Creative, business context
  PERSONA_GENERATION: [
    'deepseek/deepseek-r1-0528-qwen3-8b:free',  // Creative reasoning
    'deepseek/deepseek-v3-0324:free',
    'google/gemini-2.0-flash-exp:free'
  ] as string[],
  
  // 🎯 Deep Search - Complex multi-doc analysis  
  DEEP_SEARCH: [
    'deepseek/deepseek-r1-0528-qwen3-8b:free',  // Best reasoning capabilities
    'deepseek/deepseek-v3-0324:free',           // Strong backup
    'mistralai/mistral-7b-instruct:free'
  ] as string[],
  
  // 🖼️ Vision/OCR - Keep existing Gemini for reliability
  VISION: [
    'google/gemini-2.0-flash-exp:free',
    'deepseek/deepseek-r1-0528-qwen3-8b:free'   // Backup for text analysis
  ] as string[]
};

export type ModelConfigKey = keyof typeof MODEL_CONFIGS;
