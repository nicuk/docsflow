/**
 * Sparse Vector Generation for Hybrid Search
 * 
 * Generates BM25-style sparse vectors for keyword-based search.
 * Complements dense vectors (semantic) with exact keyword matching.
 * 
 * Key Benefits:
 * - Filenames: "image_720.png" gets high weight
 * - Specific terms: "cryptocurrency", "trading" get preserved
 * - Acronyms: "AI", "ML", "PDF" maintain importance
 */

export interface SparseVector {
  indices: number[];
  values: number[];
}

/**
 * Simple tokenizer: lowercase, remove special chars, split on whitespace
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ') // Keep dots and hyphens for filenames
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * BM25-inspired term weighting
 * Higher weight for:
 * - Rare terms (IDF)
 * - Terms that appear multiple times (TF)
 * - Short documents (length normalization)
 */
function calculateBM25Weight(
  termFreq: number,
  docLength: number,
  avgDocLength: number = 100,
  k1: number = 1.2,
  b: number = 0.75
): number {
  // BM25 formula (simplified without IDF since we don't have corpus stats)
  // TF component with saturation
  const numerator = termFreq * (k1 + 1);
  const denominator = termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
  
  return numerator / denominator;
}

/**
 * Generate sparse vector from text
 * 
 * @param text - Input text to convert to sparse vector
 * @returns Sparse vector with indices (hashed tokens) and values (weights)
 */
export function generateSparseVector(text: string): SparseVector {
  if (!text || text.trim().length === 0) {
    return { indices: [], values: [] };
  }
  
  // Tokenize
  const tokens = tokenize(text);
  
  if (tokens.length === 0) {
    return { indices: [], values: [] };
  }
  
  // Calculate term frequencies
  const termFreq = new Map<string, number>();
  tokens.forEach(token => {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  });
  
  // Calculate weights
  const weights = new Map<number, number>();
  const docLength = tokens.length;
  
  termFreq.forEach((freq, term) => {
    // Simple hash function for token -> index mapping
    // FNV-1a hash (fast and good distribution)
    let hash = 2166136261;
    for (let i = 0; i < term.length; i++) {
      hash ^= term.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    // Keep hash positive and within reasonable range
    const index = Math.abs(hash) % 100000;
    
    // Calculate BM25 weight
    const weight = calculateBM25Weight(freq, docLength);
    
    // Accumulate weights for same index (hash collision)
    weights.set(index, (weights.get(index) || 0) + weight);
  });
  
  // Convert to sorted arrays (Pinecone requires sorted indices)
  const entries = Array.from(weights.entries())
    .sort((a, b) => a[0] - b[0]); // Sort by index
  
  // Normalize values to [0, 1] range
  const maxWeight = Math.max(...entries.map(e => e[1]));
  
  return {
    indices: entries.map(e => e[0]),
    values: entries.map(e => e[1] / maxWeight), // Normalize
  };
}

/**
 * Boost specific keywords (filenames, important terms)
 * Useful for queries where certain terms should have extra weight
 * 
 * @param sparseVector - Base sparse vector
 * @param boostTerms - Terms to boost (e.g., detected filename)
 * @param boostFactor - Multiplier for boost (default: 2.0)
 */
export function boostKeywords(
  sparseVector: SparseVector,
  boostTerms: string[],
  boostFactor: number = 2.0
): SparseVector {
  if (boostTerms.length === 0) {
    return sparseVector;
  }
  
  // Hash boost terms
  const boostIndices = new Set<number>();
  boostTerms.forEach(term => {
    const tokens = tokenize(term);
    tokens.forEach(token => {
      let hash = 2166136261;
      for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      boostIndices.add(Math.abs(hash) % 100000);
    });
  });
  
  // Boost matching indices
  const boostedValues = sparseVector.values.map((value, i) => {
    const index = sparseVector.indices[i];
    return boostIndices.has(index) ? value * boostFactor : value;
  });
  
  // Re-normalize
  const maxValue = Math.max(...boostedValues);
  
  return {
    indices: sparseVector.indices,
    values: boostedValues.map(v => v / maxValue),
  };
}

/**
 * Combine text from multiple sources with different weights
 * Useful for documents where filename should have more weight than content
 * 
 * @param sources - Array of { text, weight } objects
 */
export function generateWeightedSparseVector(
  sources: Array<{ text: string; weight: number }>
): SparseVector {
  const combinedWeights = new Map<number, number>();
  
  sources.forEach(({ text, weight }) => {
    const sv = generateSparseVector(text);
    sv.indices.forEach((index, i) => {
      const value = sv.values[i] * weight;
      combinedWeights.set(index, (combinedWeights.get(index) || 0) + value);
    });
  });
  
  // Convert and normalize
  const entries = Array.from(combinedWeights.entries())
    .sort((a, b) => a[0] - b[0]);
  
  const maxWeight = Math.max(...entries.map(e => e[1]));
  
  return {
    indices: entries.map(e => e[0]),
    values: entries.map(e => e[1] / maxWeight),
  };
}
