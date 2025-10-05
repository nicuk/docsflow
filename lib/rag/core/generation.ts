/**
 * Answer Generation
 * 
 * Uses OpenRouter to access OpenAI LLM for generating answers.
 * Atomic operation: (query + context) → answer
 * WITH LANGSMITH TRACING!
 */

import { ChatOpenAI } from '@langchain/openai';
import { traceable } from 'langsmith/traceable';
import type { RetrievedChunk } from './retrieval';
import { GenerationError } from '../utils/errors';
import { RAG_CONFIG } from '../config';

// Initialize LLM (lazy-loaded singleton)
let llmInstance: ChatOpenAI | null = null;

function getLLM(): ChatOpenAI {
  if (!llmInstance) {
    // For local testing, prefer OpenAI (simpler, no special headers needed)
    // For production, use OpenRouter (access to multiple models)
    const hasOpenRouter = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.startsWith('sk-or-');
    const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');
    
    if (hasOpenAI) {
      // Prefer OpenAI for local testing (easier to configure)
      console.log('[Generation] Using direct OpenAI API (local testing mode)');
      llmInstance = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-4o-mini',
        temperature: RAG_CONFIG.llm.temperature,
        maxTokens: RAG_CONFIG.llm.maxTokens,
      });
    } else if (hasOpenRouter) {
      console.log('[Generation] Using OpenRouter (production mode)');
      llmInstance = new ChatOpenAI({
        openAIApiKey: RAG_CONFIG.openrouter.apiKey,
        modelName: RAG_CONFIG.llm.model,
        temperature: RAG_CONFIG.llm.temperature,
        maxTokens: RAG_CONFIG.llm.maxTokens,
        configuration: {
          baseURL: RAG_CONFIG.openrouter.baseURL,
        },
      });
    } else {
      throw new Error('No LLM API key found. Set either OPENAI_API_KEY (for local testing) or OPENROUTER_API_KEY (for production)');
    }
  }
  return llmInstance;
}

export interface GenerationResult {
  answer: string;
  model: string;
  tokensUsed?: number;
}

/**
 * Generate answer from query and retrieved context
 * WITH LANGSMITH TRACING to see what's happening!
 * 
 * @param query - User's question
 * @param context - Retrieved relevant chunks
 * @returns Generated answer with metadata
 */
export const generateAnswer = traceable(
  async function generateAnswer(input: {
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
  
  try {
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
    
    console.log(`[Generation] Generating answer for query: "${query}"`);
    console.log(`[Generation] Context chunks: ${context.length}`);
    
    const llm = getLLM();
    const response = await llm.invoke(prompt);
    
    const answer = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    console.log(`[Generation] Generated answer (${answer.length} chars)`);
    
    return {
      answer,
      model: RAG_CONFIG.llm.model,
      tokensUsed: (response as any).usage?.total_tokens,
    };
  } catch (error: any) {
    console.error('[Generation] Error:', error);
    throw new GenerationError(`Failed to generate answer: ${error.message}`, {
      query: input.query,
      contextChunks: input.context.length,
    });
  }
  },
  {
    name: 'generateAnswer',
    run_type: 'llm',
  }
);

