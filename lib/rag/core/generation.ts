/**
 * Answer Generation with 3-Tier Fallback System
 * 
 * Primary: Llama 3.3 70B (best quality)
 * Backup 1: GPT-4o-mini (reliable fallback)
 * Backup 2: Claude 3 Haiku (fast emergency backup)
 * 
 * Atomic operation: (query + context) → answer
 * WITH LANGSMITH TRACING!
 */

import { ChatOpenAI } from '@langchain/openai';
import type { RetrievedChunk } from './retrieval';
import { GenerationError } from '../utils/errors';
import { RAG_CONFIG } from '../config';

/**
 * Create LLM instance for a specific model
 */
function createLLM(modelName: string, temperature: number, maxTokens: number): ChatOpenAI {
  return new ChatOpenAI({
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    modelName,
    temperature,
    maxTokens,
    configuration: {
      baseURL: RAG_CONFIG.openrouter.baseURL,
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://docsflow.app',
        'X-Title': 'DocsFlow AI',
      },
    },
  });
}

/**
 * Try to generate answer with a specific model
 */
async function tryGenerateWithModel(
  modelName: string,
  prompt: string,
  temperature: number,
  maxTokens: number
): Promise<{ answer: string; model: string; tokensUsed?: number }> {
  const llm = createLLM(modelName, temperature, maxTokens);
  const response = await llm.invoke(prompt);
  
  const answer = typeof response.content === 'string' 
    ? response.content 
    : JSON.stringify(response.content);
  
  return {
    answer,
    model: modelName,
    tokensUsed: (response as any).usage?.total_tokens,
  };
}

export interface GenerationResult {
  answer: string;
  model: string;
  tokensUsed?: number;
  fallbackUsed?: boolean;
}

/**
 * Generate answer from query and retrieved context
 * WITH 3-TIER FALLBACK SYSTEM + LANGSMITH TRACING
 * 
 * @param query - User's question
 * @param context - Retrieved relevant chunks
 * @returns Generated answer with metadata
 */
export async function generateAnswer(input: {
  query: string;
  context: RetrievedChunk[];
}): Promise<GenerationResult> {
  const { query, context } = input;
  
  if (!query || query.trim().length === 0) {
    throw new GenerationError('Query is required for generation');
  }
  
  if (!context || context.length === 0) {
    throw new GenerationError('Context is required for generation');
  }
  
  // Build context from retrieved chunks (include metadata for stats questions)
  const contextText = context
    .map((chunk, i) => {
      const source = chunk.metadata.filename || 'Unknown Document';
      const page = chunk.metadata.pageNumber ? ` (Page ${chunk.metadata.pageNumber})` : '';
      const stats = chunk.metadata.documentStats || '';
      const metadata = stats ? `\n[Document Info: ${stats}]` : '';
      return `[Source ${i + 1}: ${source}${page}]${metadata}\n${chunk.content}`;
    })
    .join('\n\n---\n\n');
  
  // Generate answer with LLM
  const prompt = `You are a helpful assistant. Answer the user's question based ONLY on the provided context.

Context:
${contextText}

Instructions:
- Answer the question directly and concisely
- ONLY use information from the context above (including Document Info metadata)
- For questions about document length/pages/stats, check the [Document Info] section
- If the context doesn't contain enough information, say "I don't have enough information to answer that question"
- Cite sources when possible (e.g., "According to [document name]...")
- Be accurate and factual

Question: ${query}

Answer:`;
  
  // Try primary model first
  const primary = RAG_CONFIG.llm.primary;
  
  try {
    const result = await tryGenerateWithModel(
      primary.model,
      prompt,
      primary.temperature,
      primary.maxTokens
    );
    return { ...result, fallbackUsed: false };
  } catch (primaryError: any) {
    
    // Try fallback models in order
    for (let i = 0; i < RAG_CONFIG.llm.fallbacks.length; i++) {
      const fallback = RAG_CONFIG.llm.fallbacks[i];
      
      try {
        const result = await tryGenerateWithModel(
          fallback.model,
          prompt,
          fallback.temperature,
          fallback.maxTokens
        );
        return { ...result, fallbackUsed: true };
      } catch (fallbackError: any) {
        // Continue to next fallback
      }
    }
    
    // All models failed
    throw new GenerationError(`All models failed. Primary: ${primaryError.message}`, {
      query: input.query,
      contextChunks: input.context.length,
      primaryModel: primary.model,
      primaryError: primaryError.message,
    });
  }
}

