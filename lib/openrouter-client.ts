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
  timeout?: number;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private siteUrl: string;
  private siteName: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY!;
    this.siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    this.siteName = 'DocsFlow';
    
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
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutMs = options.timeout ?? 15000; // 15 second default timeout
      const timeoutId = setTimeout(() => {
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
      }

      const data: OpenRouterResponse = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      // Handle timeout errors specifically
      if (error.name === 'AbortError') {
        throw new Error(`OpenRouter timeout: ${model} took longer than ${options.timeout ?? 15000}ms`);
      }
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
        const response = await this.generate(model, messages, options);
        
        return {
          response,
          modelUsed: model,
          fallbackCount: i
        };
      } catch (error) {
        lastError = error as Error;
        
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

// Model configs: strategic model selection with cost guardrails
export const MODEL_CONFIGS = {
  // Simple queries (70% of traffic) - Fast & cheap ($0.05/1M)
  SIMPLE: [
    'mistralai/mistral-7b-instruct',                 // 40-60ms, 6/10 quality
    'qwen/qwen-2.5-7b-instruct',                     // 50-70ms, 7/10 quality
    'meta-llama/llama-3.1-8b-instruct'              // 100-200ms, 7/10 quality (fallback)
  ] as string[],

  // Medium queries (20% of traffic) - Balanced ($0.05/1M)
  // Mistral 7B primary (3x faster than Llama)
  MEDIUM: [
    'mistralai/mistral-7b-instruct',                 // 40-60ms, 6/10 quality (primary)
    'qwen/qwen-2.5-7b-instruct',                     // 50-70ms, 7/10 quality
    'meta-llama/llama-3.1-8b-instruct'              // 100-200ms, 7/10 quality (fallback)
  ] as string[],

  // Complex queries (10% of traffic) - Cost-optimized ($0.05/1M)
  // Cost-optimized: Claude removed ($3/1M) -> 90% AI cost reduction
  // Claude available as premium add-on (+$199/month)
  COMPLEX: [
    'qwen/qwen-2.5-7b-instruct',                     // 50-70ms, 7/10 quality, $0.05/1M
    'meta-llama/llama-3.1-8b-instruct',             // 100-200ms, 7/10 quality, $0.05/1M
    'mistralai/mistral-7b-instruct'                  // 40-60ms, 6/10 quality, $0.05/1M
  ] as string[],
  
  // Premium (optional add-on: +$199/month)
  PREMIUM: [
    'anthropic/claude-3.5-sonnet',                   // 200-400ms, 10/10 quality, $3/1M
    'openai/gpt-4-turbo',                            // 300-500ms, 9/10 quality, $10/1M
  ] as string[],

  // Document processing - extraction specialists ($0.05/1M)
  DOCUMENT_PROCESSING: [
    'qwen/qwen-2.5-7b-instruct',                     // Best at understanding documents
    'mistralai/mistral-7b-instruct',                 // Great for complex document parsing
    'meta-llama/llama-3.1-8b-instruct'              // Good at extracting data
  ] as string[],

  // RAG pipeline - retrieval specialists ($0.05/1M)
  RAG_PIPELINE: [
    'meta-llama/llama-3.1-8b-instruct',             // Best reasoning for context
    'qwen/qwen-2.5-7b-instruct',                     // Great at combining info
    'mistralai/mistral-7b-instruct'                  // Quick retrieval responses
  ] as string[],

  // Persona generation
  PERSONA_GENERATION: [
    'qwen/qwen-2.5-7b-instruct',                     // $0.05/1M - creative tasks
    'meta-llama/llama-3.1-8b-instruct'              // $0.05/1M - good reasoning
  ] as string[],

  // Deep search
  DEEP_SEARCH: [
    'meta-llama/llama-3.1-8b-instruct',             // $0.05/1M - best reasoning for price
    'qwen/qwen-2.5-7b-instruct'                     // $0.05/1M - deep analysis
  ] as string[],

  // Vision/OCR
  VISION: [
    'mistralai/mistral-7b-instruct',                 // $0.05/1M - basic vision
    'meta-llama/llama-3.1-8b-instruct'              // $0.05/1M - backup
  ] as string[],

  // Legacy chat (for backward compatibility)
  CHAT: [
    'meta-llama/llama-3.1-8b-instruct',
    'mistralai/mistral-7b-instruct',
    'qwen/qwen-2.5-7b-instruct'
  ] as string[]
};

export type ModelConfigKey = keyof typeof MODEL_CONFIGS;
