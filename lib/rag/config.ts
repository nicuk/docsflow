/**
 * RAG Configuration
 * 
 * Centralized configuration for the RAG system.
 * All settings in one place for easy adjustment.
 */

export const RAG_CONFIG = {
  // LangSmith Tracing (for debugging - you have this!)
  langsmith: {
    enabled: !!process.env.LANGCHAIN_TRACING_V2,
    projectName: process.env.LANGCHAIN_PROJECT || 'docsflow',
  },
  
  // Embeddings (Vercel AI Gateway)
  embeddings: {
    model: 'text-embedding-3-small', // OpenAI model name
    dimensions: 1536,
    provider: 'vercel-ai-gateway', // Uses Vercel AI Gateway (OpenRouter doesn't support /embeddings)
  },
  
  // LLM with fallback strategy
  llm: {
    // Primary model (best quality)
    primary: {
      model: 'meta-llama/llama-3.3-70b-instruct',
      temperature: 0,
      maxTokens: 1000,
      provider: 'openrouter',
    },
    // Backup models (in order of preference)
    fallbacks: [
      {
        model: 'openai/gpt-4o-mini',
        temperature: 0,
        maxTokens: 1000,
        provider: 'openrouter',
        reason: 'Reliable fallback with good quality',
      },
      {
        model: 'anthropic/claude-3-haiku',
        temperature: 0,
        maxTokens: 1000,
        provider: 'openrouter',
        reason: 'Fast emergency backup',
      },
    ],
  },
  
  // Retrieval (HYBRID SEARCH)
  retrieval: {
    topK: 5, // Number of chunks to retrieve
    minScore: 0.25, // Minimum hybrid score (semantic + keyword)
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
    'OPENROUTER_API_KEY', // For LLM completions only
  ];
  
  // Either AI Gateway key OR OpenAI key is required for embeddings
  const hasEmbeddingAuth = process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
  
  if (!hasEmbeddingAuth) {
    throw new Error(
      'Missing embedding authentication: Either AI_GATEWAY_API_KEY or OPENAI_API_KEY is required'
    );
  }
}

