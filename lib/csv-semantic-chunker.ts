/**
 * CSV Semantic Chunker
 * Converts raw CSV delimiter spam into meaningful semantic chunks
 * 
 * BEFORE: "Frame Type;Manufacturer;ID;Version;;;;;;;;;;;;;;;;;;;;;;;;"
 * AFTER:  "Device Frame Type: [value], Manufacturer: [value], Device ID: [value], Version: [value]"
 */

interface SemanticChunk {
  content: string;
  metadata: {
    row_number?: number;
    columns?: string[];
    has_data: boolean;
  };
}

export class CSVSemanticChunker {
  /**
   * Parse CSV and create semantic chunks instead of raw delimiter text
   */
  static parseCSVToSemanticChunks(csvText: string, filename: string): SemanticChunk[] {
    const lines = csvText.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return [];
    }

    // Detect delimiter (semicolon or comma)
    const delimiter = lines[0].includes(';') ? ';' : ',';
    
    // Parse header row
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const chunks: SemanticChunk[] = [];

    // Add document overview chunk
    chunks.push({
      content: `Document: ${filename}\nType: CSV/Tabular Data\nColumns: ${headers.length}\nRows: ${lines.length - 1}\nKey Fields: ${headers.slice(0, 10).join(', ')}${headers.length > 10 ? '...' : ''}`,
      metadata: {
        columns: headers,
        has_data: true
      }
    });

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim());
      
      // Filter out rows with mostly empty values
      const nonEmptyCount = values.filter(v => v && v.length > 0).length;
      if (nonEmptyCount < 3) {
        continue; // Skip rows with less than 3 non-empty values
      }

      // Create semantic description
      const semanticPairs: string[] = [];
      for (let j = 0; j < Math.min(headers.length, values.length); j++) {
        if (values[j] && values[j].length > 0) {
          // Only include non-empty values
          const header = headers[j] || `Column ${j + 1}`;
          semanticPairs.push(`${header}: ${values[j]}`);
        }
      }

      if (semanticPairs.length > 0) {
        chunks.push({
          content: `Row ${i} of ${filename}\n${semanticPairs.join('\n')}`,
          metadata: {
            row_number: i,
            columns: headers,
            has_data: true
          }
        });
      }
    }

    // If no data rows were created, create a summary chunk
    if (chunks.length === 1) {
      chunks.push({
        content: `${filename} is a CSV file with ${headers.length} columns: ${headers.join(', ')}. The file appears to contain mostly empty data.`,
        metadata: {
          columns: headers,
          has_data: false
        }
      });
    }

    return chunks;
  }

  /**
   * Batch chunks to prevent overwhelming the system
   * Groups related rows together for better context
   */
  static batchChunks(chunks: SemanticChunk[], maxChunks: number = 20): SemanticChunk[] {
    if (chunks.length <= maxChunks) {
      return chunks;
    }

    // Keep overview chunk + sample of data chunks
    const overview = chunks[0];
    const dataChunks = chunks.slice(1);
    
    // Sample evenly across the dataset
    const step = Math.ceil(dataChunks.length / (maxChunks - 1));
    const sampledChunks = [overview];
    
    for (let i = 0; i < dataChunks.length; i += step) {
      sampledChunks.push(dataChunks[i]);
    }

    return sampledChunks.slice(0, maxChunks);
  }

  /**
   * Convert semantic chunks to format expected by enhanced-chunking
   */
  static toEnhancedChunkFormat(semanticChunks: SemanticChunk[]): Array<{
    content: string;
    metadata: any;
  }> {
    return semanticChunks.map(chunk => ({
      content: chunk.content,
      metadata: chunk.metadata
    }));
  }
}

