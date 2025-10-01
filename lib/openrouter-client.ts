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
  timeout?: number; // 🎯 LINT FIX: Add timeout property
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
      // 🎯 SURGICAL FIX: Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutMs = options.timeout ?? 15000; // 15 second default timeout
      const timeoutId = setTimeout(() => {
        console.warn(`⏰ [OPENROUTER] ${model} timeout after ${timeoutMs}ms`);
        controller.abort();
      }, timeoutMs);

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
        signal: controller.signal, // 🎯 Enable request abortion
      });

      clearTimeout(timeoutId); // 🎯 Clear timeout on successful response

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data: OpenRouterResponse = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      // 🎯 SURGICAL FIX: Handle timeout errors specifically
      if (error.name === 'AbortError') {
        console.error(`⏰ [OPENROUTER] ${model} request timeout`);
        throw new Error(`OpenRouter timeout: ${model} took longer than ${options.timeout ?? 15000}ms`);
      }
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

// 🎯 HYBRID MODEL CONFIGS: Strategic model selection with cost guardrails
export const MODEL_CONFIGS = {
  // 🟢 SIMPLE QUERIES (70% of traffic) - Fast & Cheap ($0.05/1M)
  SIMPLE: [
    'mistralai/mistral-7b-instruct',                 // ⚡ FAST: 40-60ms, 6/10 quality
    'qwen/qwen-2.5-7b-instruct',                     // 📚 BALANCED: 50-70ms, 7/10 quality
    'meta-llama/llama-3.1-8b-instruct'              // 🛡️ FALLBACK: 100-200ms, 7/10 quality
  ] as string[],

  // 🟡 MEDIUM QUERIES (20% of traffic) - Balanced ($0.05/1M)
  MEDIUM: [
    'meta-llama/llama-3.1-8b-instruct',             // 🎯 PRIMARY: 100-200ms, 7/10 quality
    'qwen/qwen-2.5-7b-instruct',                     // 📚 ALT: 50-70ms, 7/10 quality
    'mistralai/mistral-7b-instruct'                  // 🛡️ FALLBACK: 40-60ms, 6/10 quality
  ] as string[],

  // 🔴 COMPLEX QUERIES (10% of traffic) - Premium Quality ($3/1M) 🚨 GUARDED
  COMPLEX: [
    'anthropic/claude-3.5-sonnet',                   // 🏆 PREMIUM: 200-400ms, 10/10 quality
    'meta-llama/llama-3.1-8b-instruct',             // 🛡️ FALLBACK: 100-200ms, 7/10 quality
    'qwen/qwen-2.5-7b-instruct'                     // 🛡️ BACKUP: 50-70ms, 7/10 quality
  ] as string[],

  // 📄 Document Processing - EXTRACTION SPECIALISTS ($0.05/1M)
  DOCUMENT_PROCESSING: [
    'qwen/qwen-2.5-7b-instruct',                     // 🔍 DOC MASTER: Best at understanding documents
    'mistralai/mistral-7b-instruct',                 // 🧠 ANALYSIS: Great for complex document parsing
    'meta-llama/llama-3.1-8b-instruct'              // 📊 STRUCTURED: Good at extracting data
  ] as string[],

  // 🔗 RAG Pipeline - RETRIEVAL SPECIALISTS ($0.05/1M)
  RAG_PIPELINE: [
    'meta-llama/llama-3.1-8b-instruct',             // 🎯 RAG CHAMPION: Best reasoning for context
    'qwen/qwen-2.5-7b-instruct',                     // 📚 KNOWLEDGE: Great at combining info
    'mistralai/mistral-7b-instruct'                  // ⚡ FAST RAG: Quick retrieval responses
  ] as string[],

  // 🧠 Persona Generation
  PERSONA_GENERATION: [
    'qwen/qwen-2.5-7b-instruct',                     // 💰 $0.05/1M - Creative tasks
    'meta-llama/llama-3.1-8b-instruct'              // 💎 $0.05/1M - Good reasoning
  ] as string[],

  // 🎯 Deep Search
  DEEP_SEARCH: [
    'meta-llama/llama-3.1-8b-instruct',             // 💎 $0.05/1M - Best reasoning for price
    'qwen/qwen-2.5-7b-instruct'                     // 💰 $0.05/1M - Deep analysis
  ] as string[],

  // 🖼️ Vision/OCR
  VISION: [
    'mistralai/mistral-7b-instruct',                 // 🔥 $0.05/1M - Basic vision
    'meta-llama/llama-3.1-8b-instruct'              // 💎 $0.05/1M - Backup
  ] as string[],

  // 💬 Legacy Chat (for backward compatibility)
  CHAT: [
    'meta-llama/llama-3.1-8b-instruct',
    'mistralai/mistral-7b-instruct',
    'qwen/qwen-2.5-7b-instruct'
  ] as string[]
};

export type ModelConfigKey = keyof typeof MODEL_CONFIGS;
