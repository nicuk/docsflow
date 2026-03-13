/**
 * Document Summarization Module
 * Phase 1A: Generate document-level summaries for hierarchical retrieval
 * 
 * Purpose: Create 1-2 sentence summaries of documents to enable
 * two-stage retrieval (document-level → chunk-level)
 */

import { ChatOpenAI } from '@langchain/openai';

export interface SummarizationInput {
  text: string;
  filename: string;
  wordCount: number;
  mimeType?: string;
}

/**
 * Generate a concise 1-2 sentence summary of a document
 * 
 * Strategy:
 * - Short docs (<100 words): Use first 200 chars
 * - Long docs: Use LLM to summarize first 3000 chars
 * - Fallback: Always return something (never null)
 */
export async function generateDocumentSummary(
  input: SummarizationInput
): Promise<string> {
  const { text, filename, wordCount, mimeType } = input;
  
  // Edge case: Empty or very short documents
  if (!text || text.trim().length < 50) {
    return `Empty or minimal content document: ${filename}`;
  }
  
  // Strategy 1: For short documents, use truncated content as summary
  if (wordCount < 100) {
    const truncated = text.slice(0, 200);
    const suffix = text.length > 200 ? '...' : '';
    return truncated + suffix;
  }
  
  // Strategy 2: For longer documents, use LLM to generate summary
  try {
    const llm = new ChatOpenAI({
      modelName: 'openai/gpt-4o-mini', // Cost-effective for summaries
      temperature: 0,
      maxTokens: 150, // ~1-2 sentences
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'https://docsflow.ai',
          'X-Title': 'DocsFlow RAG Summarization',
        },
      },
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    
    // Include file type context if available
    const fileTypeHint = getFileTypeHint(mimeType, filename);
    
    // Use first 3000 characters (roughly 750 tokens)
    const contentPreview = text.slice(0, 3000);
    
    const prompt = `Summarize this ${fileTypeHint} in 1-2 clear sentences. Focus on the main topic and purpose.

Document: ${filename}
Content:
${contentPreview}

Summary (1-2 sentences):`;

    const response = await llm.invoke(prompt);
    const summary = response.content.toString().trim();
    
    return summary;
    
  } catch (error) {
    // Fallback: Use first sentence or first 200 chars
    const firstSentence = text.match(/[^.!?]+[.!?]+/)?.[0]?.trim();
    if (firstSentence && firstSentence.length < 300) {
      return firstSentence;
    }
    
    const fallback = text.slice(0, 200) + '...';
    return fallback;
  }
}

/**
 * Get a hint about the file type for better summarization prompts
 */
function getFileTypeHint(mimeType?: string, filename?: string): string {
  if (!mimeType && !filename) return 'document';
  
  // Check mime type first
  if (mimeType?.includes('pdf')) return 'PDF document';
  if (mimeType?.includes('word') || mimeType?.includes('document')) return 'Word document';
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'spreadsheet';
  if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return 'presentation';
  if (mimeType?.includes('image')) return 'image with extracted text';
  if (mimeType?.includes('text')) return 'text file';
  
  // Fallback to filename extension
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'PDF document';
    if (ext === 'docx' || ext === 'doc') return 'Word document';
    if (ext === 'xlsx' || ext === 'xls') return 'spreadsheet';
    if (ext === 'pptx' || ext === 'ppt') return 'presentation';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'image with extracted text';
    if (ext === 'txt') return 'text file';
  }
  
  return 'document';
}

/**
 * Batch generate summaries for multiple documents
 * Useful for backfilling existing documents
 */
export async function batchGenerateSummaries(
  documents: Array<{
    id: string;
    text: string;
    filename: string;
    wordCount: number;
    mimeType?: string;
  }>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<Map<string, string>> {
  const { concurrency = 3, onProgress } = options;
  const summaries = new Map<string, string>();
  
  // Process in batches
  for (let i = 0; i < documents.length; i += concurrency) {
    const batch = documents.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(async (doc) => {
        try {
          const summary = await generateDocumentSummary({
            text: doc.text,
            filename: doc.filename,
            wordCount: doc.wordCount,
            mimeType: doc.mimeType,
          });
          return { id: doc.id, summary };
        } catch (error) {
          return { id: doc.id, summary: `Document: ${doc.filename}` };
        }
      })
    );
    
    // Store results
    for (const result of batchResults) {
      summaries.set(result.id, result.summary);
    }
    
    // Report progress
    const completed = Math.min(i + concurrency, documents.length);
    if (onProgress) {
      onProgress(completed, documents.length);
    }
    
  }
  
  return summaries;
}
