/**
 * Answer Generation
 * 
 * Uses OpenRouter to access OpenAI LLM for generating answers.
 * Atomic operation: (query + context) → answer
 */

import { ChatOpenAI } from '@langchain/openai';
import type { RetrievedChunk } from './retrieval';
import { GenerationError } from '../utils/errors';
import { RAG_CONFIG } from '../config';

// Initialize LLM (lazy-loaded singleton)
let llmInstance: ChatOpenAI | null = null;

function getLLM(): ChatOpenAI {
  if (!llmInstance) {
    llmInstance = new ChatOpenAI({
      openAIApiKey: RAG_CONFIG.openrouter.apiKey,
      modelName: RAG_CONFIG.llm.model,
      temperature: RAG_CONFIG.llm.temperature,
      maxTokens: RAG_CONFIG.llm.maxTokens,
      configuration: {
        baseURL: RAG_CONFIG.openrouter.baseURL,
      },
    });
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
  
  try {
    // Build context from retrieved chunks
    const contextText = context
      .map((chunk, i) => {
        const source = chunk.metadata.filename || 'Unknown Document';
        const page = chunk.metadata.pageNumber ? ` (Page ${chunk.metadata.pageNumber})` : '';
        return `[Source ${i + 1}: ${source}${page}]\n${chunk.content}`;
      })
      .join('\n\n---\n\n');
    
    // Generate answer with LLM
    const prompt = `You are a helpful assistant. Answer the user's question based ONLY on the provided context.

Context:
${contextText}

Instructions:
- Answer the question directly and concisely
- ONLY use information from the context above
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
      query,
      contextChunks: context.length,
    });
  }
}

