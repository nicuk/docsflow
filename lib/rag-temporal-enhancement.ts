import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface TemporalDocument {
  id: string;
  uploadDate: Date;
  documentDate: Date;
  extractedDates: {
    contractStart?: Date;
    contractEnd?: Date;
    signedDate?: Date;
    effectiveDate?: Date;
  };
  entities: {
    companies: string[];
    people: string[];
    locations: string[];
  };
  relationships: {
    relatedDocIds: string[];
    relationshipType: 'amendment' | 'renewal' | 'supersedes' | 'references';
  }[];
}

interface QueryContext {
  temporalScope: 'latest' | 'historical' | 'all';
  entityResolution: boolean;
  relationshipMapping: boolean;
  conflictResolution: 'latest_upload' | 'latest_document_date' | 'highest_confidence';
}

export class TemporalRAGEnhancement {
  private supabase: any;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private tenantId: string; // 🎯 SCHEMA FIX: Store tenant context

  constructor(tenantId: string) { // 🎯 SCHEMA FIX: Accept tenant ID
    this.tenantId = tenantId;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: `You are a temporal document analysis expert. Extract and analyze:
1. Document dates (creation, signing, effective dates)
2. Entity relationships (companies, people, contracts)
3. Document relationships (amendments, renewals, supersedes)
4. Temporal conflicts and resolutions`
    });
  }

  /**
   * Extract temporal metadata from document content
   */
  async extractTemporalMetadata(
    documentContent: string,
    documentMetadata: any
  ): Promise<TemporalDocument> {
    const prompt = `
Analyze this document and extract temporal information:

Content: ${documentContent.substring(0, 3000)}
Upload Date: ${documentMetadata.uploadDate}
Filename: ${documentMetadata.filename}

Extract:
1. Document Date (when was this document created/signed)
2. Contract Start/End dates if applicable
3. Company names mentioned
4. People names mentioned
5. References to other documents

Return JSON format:
{
  "documentDate": "YYYY-MM-DD",
  "extractedDates": {
    "contractStart": "YYYY-MM-DD",
    "contractEnd": "YYYY-MM-DD",
    "signedDate": "YYYY-MM-DD",
    "effectiveDate": "YYYY-MM-DD"
  },
  "entities": {
    "companies": ["Company A", "Company B"],
    "people": ["John Doe"],
    "locations": ["New York"]
  },
  "documentType": "contract|invoice|report|memo",
  "confidence": 0.95
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text()
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '');
      
      const extracted = JSON.parse(response);
      
      return {
        id: documentMetadata.id,
        uploadDate: new Date(documentMetadata.uploadDate),
        documentDate: new Date(extracted.documentDate || documentMetadata.uploadDate),
        extractedDates: {
          contractStart: extracted.extractedDates?.contractStart ? new Date(extracted.extractedDates.contractStart) : undefined,
          contractEnd: extracted.extractedDates?.contractEnd ? new Date(extracted.extractedDates.contractEnd) : undefined,
          signedDate: extracted.extractedDates?.signedDate ? new Date(extracted.extractedDates.signedDate) : undefined,
          effectiveDate: extracted.extractedDates?.effectiveDate ? new Date(extracted.extractedDates.effectiveDate) : undefined,
        },
        entities: extracted.entities || { companies: [], people: [], locations: [] },
        relationships: []
      };
    } catch (error) {
      console.error('Temporal extraction failed:', error);
      return {
        id: documentMetadata.id,
        uploadDate: new Date(documentMetadata.uploadDate),
        documentDate: new Date(documentMetadata.uploadDate),
        extractedDates: {},
        entities: { companies: [], people: [], locations: [] },
        relationships: []
      };
    }
  }

  /**
   * Resolve entity relationships across documents
   */
  async resolveEntityRelationships(
    documents: TemporalDocument[],
    tenantId: string
  ): Promise<Map<string, TemporalDocument[]>> {
    const entityMap = new Map<string, TemporalDocument[]>();
    
    // Group documents by company entities
    for (const doc of documents) {
      for (const company of doc.entities.companies) {
        const normalizedCompany = this.normalizeEntityName(company);
        if (!entityMap.has(normalizedCompany)) {
          entityMap.set(normalizedCompany, []);
        }
        entityMap.get(normalizedCompany)!.push(doc);
      }
    }
    
    // Sort documents within each entity group by document date
    for (const [entity, docs] of entityMap) {
      docs.sort((a, b) => b.documentDate.getTime() - a.documentDate.getTime());
    }
    
    return entityMap;
  }

  /**
   * Handle temporal conflicts in search results
   */
  async resolveTemporalConflicts(
    searchResults: any[],
    queryContext: QueryContext
  ): Promise<any[]> {
    // Group results by entity
    const entityGroups = new Map<string, any[]>();
    
    for (const result of searchResults) {
      const entities = result.metadata?.entities?.companies || [];
      for (const entity of entities) {
        const normalized = this.normalizeEntityName(entity);
        if (!entityGroups.has(normalized)) {
          entityGroups.set(normalized, []);
        }
        entityGroups.get(normalized)!.push(result);
      }
    }
    
    // Apply conflict resolution strategy
    const resolvedResults: any[] = [];
    
    for (const [entity, docs] of entityGroups) {
      let selectedDoc: any;
      
      switch (queryContext.conflictResolution) {
        case 'latest_upload':
          selectedDoc = docs.sort((a, b) => 
            new Date(b.metadata?.uploadDate || 0).getTime() - 
            new Date(a.metadata?.uploadDate || 0).getTime()
          )[0];
          break;
          
        case 'latest_document_date':
          selectedDoc = docs.sort((a, b) => 
            new Date(b.metadata?.documentDate || b.metadata?.uploadDate || 0).getTime() - 
            new Date(a.metadata?.documentDate || a.metadata?.uploadDate || 0).getTime()
          )[0];
          break;
          
        case 'highest_confidence':
          selectedDoc = docs.sort((a, b) => 
            (b.similarity || 0) - (a.similarity || 0)
          )[0];
          break;
          
        default:
          selectedDoc = docs[0];
      }
      
      // Add relationship context
      selectedDoc.relatedDocuments = docs.filter(d => d.id !== selectedDoc.id);
      selectedDoc.temporalContext = {
        totalVersions: docs.length,
        isLatest: selectedDoc === docs[0],
        entity: entity
      };
      
      resolvedResults.push(selectedDoc);
    }
    
    return resolvedResults;
  }

  /**
   * Enhanced query with temporal understanding
   */
  async queryWithTemporalContext(
    query: string,
    tenantId: string,
    context: QueryContext = {
      temporalScope: 'latest',
      entityResolution: true,
      relationshipMapping: true,
      conflictResolution: 'latest_document_date'
    }
  ): Promise<any> {
    // First, perform standard vector search
    const queryEmbedding = await this.getEmbedding(query);
    const { data: searchResults, error } = await this.supabase
      .rpc('similarity_search', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 20,
        p_tenant_id: tenantId
      });
    
    if (error || !searchResults) {
      throw new Error('Search failed');
    }
    
    // Extract temporal metadata for each result
    const temporalDocs: TemporalDocument[] = [];
    for (const result of searchResults) {
      const temporalDoc = await this.extractTemporalMetadata(
        result.content,
        result.metadata
      );
      temporalDocs.push(temporalDoc);
    }
    
    // Resolve entity relationships
    const entityMap = await this.resolveEntityRelationships(temporalDocs, tenantId);
    
    // Apply temporal conflict resolution
    const resolvedResults = await this.resolveTemporalConflicts(
      searchResults,
      context
    );
    
    // Generate enhanced response with temporal context
    const enhancedResponse = await this.generateTemporalResponse(
      query,
      resolvedResults,
      entityMap
    );
    
    return {
      results: resolvedResults,
      entityRelationships: Array.from(entityMap.entries()),
      response: enhancedResponse,
      metadata: {
        totalDocuments: searchResults.length,
        uniqueEntities: entityMap.size,
        conflictResolution: context.conflictResolution,
        temporalScope: context.temporalScope
      }
    };
  }

  private normalizeEntityName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+inc\.?|\s+llc\.?|\s+ltd\.?|\s+corp\.?/gi, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private async getEmbedding(text: string): Promise<number[]> {
    // This would call your embedding service
    // For now, returning placeholder
    return new Array(1536).fill(0).map(() => Math.random());
  }

  private async generateTemporalResponse(
    query: string,
    results: any[],
    entityMap: Map<string, TemporalDocument[]>
  ): Promise<string> {
    const prompt = `
Based on these search results with temporal context, answer the query:

Query: ${query}

Documents found:
${results.map(r => `
- ${r.metadata?.filename || 'Unknown'}
  Upload Date: ${r.metadata?.uploadDate}
  Document Date: ${r.metadata?.documentDate || 'Unknown'}
  Entities: ${r.metadata?.entities?.companies?.join(', ') || 'None'}
  Content: ${r.content?.substring(0, 500)}
`).join('\n')}

Entity Relationships:
${Array.from(entityMap.entries()).map(([entity, docs]) => `
${entity}: ${docs.length} documents spanning ${
  docs[docs.length - 1].documentDate.toISOString().split('T')[0]
} to ${
  docs[0].documentDate.toISOString().split('T')[0]
}`).join('\n')}

Provide a comprehensive answer that:
1. Identifies the most recent/relevant information
2. Notes any conflicts or superseded information
3. Provides temporal context (when things happened/changed)
4. Confidence level for the answer`;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}
