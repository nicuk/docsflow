import { MultimodalDocumentParser } from '../lib/rag-multimodal-parser';
import { isFeatureEnabled, getEnabledFeatures } from '../lib/feature-flags';

describe('MultimodalDocumentParser', () => {
  let parser1: MultimodalDocumentParser;
  let parser2: MultimodalDocumentParser;
  
  beforeEach(() => {
    // Create parsers for different tenants
    parser1 = new MultimodalDocumentParser('tenant1');
    parser2 = new MultimodalDocumentParser('tenant2');
  });
  
  describe('Tenant Isolation', () => {
    it('should maintain tenant isolation in parsed documents', async () => {
      const testPDF = Buffer.from('Sample PDF content');
      
      const result1 = await parser1.parseDocument(testPDF, 'application/pdf', 'test.pdf');
      const result2 = await parser2.parseDocument(testPDF, 'application/pdf', 'test.pdf');
      
      expect(result1.metadata.tenant_id).toBe('tenant1');
      expect(result2.metadata.tenant_id).toBe('tenant2');
      expect(result1.metadata.tenant_id).not.toBe(result2.metadata.tenant_id);
    });
    
    it('should not leak tenant data across parsers', async () => {
      const confidentialData = Buffer.from('Confidential: Tenant1 Secret Data');
      const publicData = Buffer.from('Public information');
      
      const confidential = await parser1.parseDocument(confidentialData, 'text/plain');
      const publicDoc = await parser2.parseDocument(publicData, 'text/plain');
      
      expect(publicDoc.text).not.toContain('Tenant1 Secret');
      expect(publicDoc.metadata.tenant_id).toBe('tenant2');
    });
  });
  
  describe('Fallback Mechanism', () => {
    it('should fallback to basic parsing on corrupted PDF', async () => {
      const corruptedPDF = Buffer.from('Not a real PDF');
      
      const result = await parser1.parseDocument(corruptedPDF, 'application/pdf');
      
      expect(result).toBeDefined();
      expect(result.metadata.parse_method).toBe('basic');
      expect(result.chunks.length).toBeGreaterThan(0);
    });
    
    it('should handle empty buffer gracefully', async () => {
      const emptyBuffer = Buffer.from('');
      
      const result = await parser1.parseDocument(emptyBuffer, 'text/plain');
      
      expect(result).toBeDefined();
      expect(result.text).toBe('');
      expect(result.metadata.tenant_id).toBe('tenant1');
    });
    
    it('should handle unknown mime types', async () => {
      const unknownFile = Buffer.from('Unknown format data');
      
      const result = await parser1.parseDocument(unknownFile, 'application/unknown');
      
      expect(result).toBeDefined();
      expect(result.metadata.parse_method).toBe('basic');
    });
  });
  
  describe('Table Extraction', () => {
    it('should extract markdown tables', async () => {
      const markdownText = `
        # Document with Table
        
        | Column 1 | Column 2 | Column 3 |
        |----------|----------|----------|
        | Data 1   | Data 2   | Data 3   |
        | Data 4   | Data 5   | Data 6   |
        
        Some text after table.
      `;
      
      const result = await parser1.parseDocument(
        Buffer.from(markdownText), 
        'text/plain'
      );
      
      expect(result.metadata.tables).toBeDefined();
      expect(result.metadata.tables.length).toBeGreaterThan(0);
      expect(result.metadata.tables[0].type).toBe('markdown');
    });
    
    it('should extract CSV tables', async () => {
      const csvData = `Name,Age,City
John,30,New York
Jane,25,Los Angeles
Bob,35,Chicago`;
      
      const result = await parser1.parseDocument(
        Buffer.from(csvData),
        'text/csv'
      );
      
      expect(result.metadata.tables).toBeDefined();
      expect(result.metadata.tables.length).toBe(1);
      expect(result.metadata.tables[0].headers).toEqual(['Name', 'Age', 'City']);
    });
  });
  
  describe('Chunking', () => {
    it('should create overlapping chunks', async () => {
      const longText = 'A'.repeat(3000); // 3000 characters
      
      const result = await parser1.parseDocument(
        Buffer.from(longText),
        'text/plain'
      );
      
      expect(result.chunks.length).toBeGreaterThan(2);
      expect(result.chunks[0].type).toBe('text');
      expect(result.chunks[0].position).toBe(0);
    });
    
    it('should preserve chunk order', async () => {
      const text = 'Section 1\n\nSection 2\n\nSection 3';
      
      const result = await parser1.parseDocument(
        Buffer.from(text),
        'text/plain'
      );
      
      const positions = result.chunks.map(c => c.position);
      const sortedPositions = [...positions].sort((a, b) => a - b);
      
      expect(positions).toEqual(sortedPositions);
    });
  });
});

describe('Feature Flags', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.FF_MULTIMODAL_PARSING;
    delete process.env.FF_MULTIMODAL_TENANTS;
    delete process.env.FF_MULTIMODAL_PCT;
  });
  
  it('should disable features by default', () => {
    expect(isFeatureEnabled('MULTIMODAL_PARSING', 'any-tenant')).toBe(false);
  });
  
  it('should enable for whitelisted tenants', () => {
    process.env.FF_MULTIMODAL_PARSING = 'true';
    process.env.FF_MULTIMODAL_TENANTS = 'tenant1,tenant2';
    
    // Need to re-import to pick up env changes
    jest.resetModules();
    const { isFeatureEnabled } = require('../lib/feature-flags');
    
    expect(isFeatureEnabled('MULTIMODAL_PARSING', 'tenant1')).toBe(true);
    expect(isFeatureEnabled('MULTIMODAL_PARSING', 'tenant2')).toBe(true);
    expect(isFeatureEnabled('MULTIMODAL_PARSING', 'tenant3')).toBe(false);
  });
  
  it('should respect percentage rollout', () => {
    process.env.FF_MULTIMODAL_PARSING = 'true';
    process.env.FF_MULTIMODAL_PCT = '50';
    
    jest.resetModules();
    const { isFeatureEnabled } = require('../lib/feature-flags');
    
    // With 50% rollout, some tenants should be enabled, some not
    const enabledCount = Array.from({ length: 100 }, (_, i) => 
      isFeatureEnabled('MULTIMODAL_PARSING', `tenant${i}`)
    ).filter(Boolean).length;
    
    // Should be roughly 50% (with some variance)
    expect(enabledCount).toBeGreaterThan(30);
    expect(enabledCount).toBeLessThan(70);
  });
  
  it('should list all enabled features for a tenant', () => {
    process.env.FF_MULTIMODAL_PARSING = 'true';
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://test.supabase.co';
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-key';
    process.env['GOOGLE_GENERATIVE_AI_API_KEY'] = 'test-api-key';
    process.env.FF_MULTIMODAL_TENANTS = 'demo-tenant';
    process.env.FF_KG = 'true';
    process.env.FF_KG_TENANTS = 'demo-tenant';
    
    jest.resetModules();
    const { getEnabledFeatures } = require('../lib/feature-flags');
    
    const features = getEnabledFeatures('demo-tenant');
    
    expect(features).toContain('MULTIMODAL_PARSING');
    expect(features).toContain('KNOWLEDGE_GRAPH');
    expect(features).not.toContain('VLM_QUERIES');
  });
});
