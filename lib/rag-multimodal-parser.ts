import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfParse from 'pdf-parse';

export interface ParsedDocument {
  text: string;
  metadata: {
    tenant_id: string;
    mime_type: string;
    pages?: number;
    tables?: any[];
    images?: any[];
    equations?: any[];
    parse_method: 'advanced' | 'basic';
  };
  chunks: DocumentChunk[];
}

export interface DocumentChunk {
  content: string;
  type: 'text' | 'table' | 'image' | 'equation';
  metadata: Record<string, any>;
  embedding?: number[];
  position: number;
}

export class MultimodalDocumentParser {
  private tenantId: string;
  private supabase: any;
  private genAI: GoogleGenerativeAI;
  private model: any;
  
  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        systemInstruction: 'You are a document parsing expert. Extract structured information including tables, lists, and key entities.'
      });
    }
  }
  
  async parseDocument(file: Buffer, mimeType: string, fileName?: string): Promise<ParsedDocument> {
    try {
      // Route to appropriate parser based on mime type
      if (mimeType.includes('pdf')) {
        return await this.parsePDF(file, fileName);
      } else if (mimeType.includes('image')) {
        return await this.parseImage(file, mimeType);
      } else if (mimeType.includes('text') || mimeType.includes('plain')) {
        return await this.parseText(file);
      } else if (mimeType.includes('csv')) {
        return await this.parseCSV(file);
      }
      
      // Fallback to basic text extraction
      return await this.parseBasic(file, mimeType);
    } catch (error) {
      console.error('Multimodal parsing failed, using fallback:', error);
      return await this.parseBasic(file, mimeType);
    }
  }
  
  private async parsePDF(buffer: Buffer, fileName?: string): Promise<ParsedDocument> {
    try {
      // Advanced PDF parsing
      const data = await pdfParse(buffer);
      
      // Extract tables using pattern matching
      const tables = this.extractTables(data.text);
      
      // Extract structured chunks
      const chunks = await this.createChunks(data.text, tables);
      
      return {
        text: data.text,
        metadata: {
          tenant_id: this.tenantId,
          mime_type: 'application/pdf',
          pages: data.numpages,
          tables: tables,
          images: [], // TODO: Implement image extraction
          equations: [], // TODO: Implement equation extraction
          parse_method: 'advanced'
        },
        chunks
      };
    } catch (error) {
      console.warn('Advanced PDF parsing failed:', error);
      return this.parseBasic(buffer, 'application/pdf');
    }
  }
  
  private async parseImage(buffer: Buffer, mimeType: string): Promise<ParsedDocument> {
    if (!this.model) {
      return this.parseBasic(buffer, mimeType);
    }
    
    try {
      // Use Gemini Vision for OCR and understanding
      const base64Image = buffer.toString('base64');
      const result = await this.model.generateContent([
        'Extract all text from this image. If there are tables, format them clearly. If there are diagrams, describe them.',
        {
          inlineData: {
            mimeType,
            data: base64Image
          }
        }
      ]);
      
      const extractedText = result.response.text();
      const chunks = await this.createChunks(extractedText, []);
      
      return {
        text: extractedText,
        metadata: {
          tenant_id: this.tenantId,
          mime_type: mimeType,
          tables: [],
          images: [{ type: 'original', extracted: true }],
          equations: [],
          parse_method: 'advanced'
        },
        chunks
      };
    } catch (error) {
      console.error('Image parsing failed:', error);
      return this.parseBasic(buffer, mimeType);
    }
  }
  
  private async parseText(buffer: Buffer): Promise<ParsedDocument> {
    const text = buffer.toString('utf-8');
    const tables = this.extractTables(text);
    const chunks = await this.createChunks(text, tables);
    
    return {
      text,
      metadata: {
        tenant_id: this.tenantId,
        mime_type: 'text/plain',
        tables: tables,
        images: [],
        equations: [],
        parse_method: 'advanced'
      },
      chunks
    };
  }
  
  private async parseCSV(buffer: Buffer): Promise<ParsedDocument> {
    const text = buffer.toString('utf-8');
    const lines = text.split('\n');
    const headers = lines[0]?.split(',') || [];
    
    // Convert CSV to table format
    const table = {
      type: 'table',
      headers,
      rows: lines.slice(1).map(line => line.split(','))
    };
    
    const chunks = await this.createChunks(text, [table]);
    
    return {
      text,
      metadata: {
        tenant_id: this.tenantId,
        mime_type: 'text/csv',
        tables: [table],
        images: [],
        equations: [],
        parse_method: 'advanced'
      },
      chunks
    };
  }
  
  private async parseBasic(buffer: Buffer, mimeType: string): Promise<ParsedDocument> {
    // Fallback parser - just extract text
    const text = buffer.toString('utf-8').substring(0, 100000); // Limit to 100k chars
    
    return {
      text,
      metadata: {
        tenant_id: this.tenantId,
        mime_type: mimeType,
        tables: [],
        images: [],
        equations: [],
        parse_method: 'basic'
      },
      chunks: [{
        content: text,
        type: 'text',
        metadata: { fallback: true },
        position: 0
      }]
    };
  }
  
  private extractTables(text: string): any[] {
    const tables = [];
    
    // Pattern 1: Markdown-style tables
    const markdownTablePattern = /\|.*\|[\r\n]+\|[-:\s|]+\|[\r\n]+((\|.*\|[\r\n]*)+)/g;
    const markdownMatches = text.match(markdownTablePattern) || [];
    
    for (const match of markdownMatches) {
      const lines = match.split('\n').filter(line => line.trim());
      if (lines.length > 2) {
        tables.push({
          type: 'markdown',
          content: match,
          rows: lines.length - 2 // Exclude header and separator
        });
      }
    }
    
    // Pattern 2: Tab-separated tables
    const tabPattern = /([^\t\n]+\t[^\t\n]+[\t\n])+/g;
    const tabMatches = text.match(tabPattern) || [];
    
    for (const match of tabMatches) {
      const lines = match.split('\n').filter(line => line.includes('\t'));
      if (lines.length > 1) {
        tables.push({
          type: 'tsv',
          content: match,
          rows: lines.length
        });
      }
    }
    
    return tables;
  }
  
  private async createChunks(text: string, tables: any[]): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const chunkSize = 1000; // Characters per chunk
    const overlap = 100; // Overlap between chunks
    
    // Create text chunks
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.substring(i, i + chunkSize);
      chunks.push({
        content: chunk,
        type: 'text',
        metadata: {
          start: i,
          end: Math.min(i + chunkSize, text.length)
        },
        position: chunks.length
      });
    }
    
    // Add table chunks
    for (const table of tables) {
      chunks.push({
        content: table.content,
        type: 'table',
        metadata: {
          tableType: table.type,
          rows: table.rows
        },
        position: chunks.length
      });
    }
    
    return chunks;
  }
  
  // Method to generate embeddings for chunks (to be called separately)
  async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    if (!this.model) return chunks;
    
    try {
      for (const chunk of chunks) {
        // Use Gemini to generate embeddings
        const result = await this.model.embedContent(chunk.content);
        chunk.embedding = result.embedding.values;
      }
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
    }
    
    return chunks;
  }
}
