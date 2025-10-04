/**
 * RAG Configuration
 * 
 * Centralized configuration for the RAG system.
 * All settings in one place for easy adjustment.
 */

export const RAG_CONFIG = {
  // Embeddings
  embeddings: {
    model: 'openai/text-embedding-3-small',
    dimensions: 1536,
    provider: 'openrouter', // Using OpenRouter to access OpenAI
  },
  
  // LLM
  llm: {
    model: 'openai/gpt-4o-mini',
    temperature: 0,
    maxTokens: 1000,
    provider: 'openrouter',
  },
  
  // Retrieval
  retrieval: {
    topK: 5, // Number of chunks to retrieve
    minScore: 0.7, // Minimum cosine similarity (maps to 40% confidence)
  },
  
  // Pinecone
  pinecone: {
    index: process.env.PINECONE_INDEX || 'emerald-oak',
    // Namespace = tenantId for multi-tenant isolation
  },
  
  // OpenRouter
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
  },
} as const;

/**
 * Validate required environment variables
 */
export function validateConfig() {
  const required = [
    'PINECONE_API_KEY',
    'PINECONE_INDEX',
    'OPENROUTER_API_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

