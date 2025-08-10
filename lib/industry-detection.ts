export interface IndustryDetectionResult {
  industry: string;
  confidence: number;
  reason: string;
}

// Smart multi-layer industry detection system
export const smartIndustryDetection = (allResponses: any): IndustryDetectionResult => {
  // 1. Multi-Response Analysis - Check all 5 answers for industry signals
  const industryScore: Record<string, number> = {};
  const responseTexts = Object.values(allResponses).join(' ').toLowerCase();
  
  // Industry detection patterns with weighted scoring
  const industryPatterns = {
    motorcycle_dealer: {
      keywords: ['motorcycle', 'bike', 'dealership', 'harley', 'honda', 'yamaha', 'trade-in', 'showroom'],
      weight: 1.2 // Higher weight for specific industry
    },
    warehouse_distribution: {
      keywords: ['warehouse', 'distribution', 'logistics', 'shipping', 'fulfillment', 'supply chain', 'inventory turnover', 'sku'],
      weight: 1.2
    },
    healthcare: {
      keywords: ['healthcare', 'medical', 'patient', 'clinic', 'hospital', 'appointment', 'treatment', 'clinical'],
      weight: 1.2
    },
    manufacturing: {
      keywords: ['manufacturing', 'production', 'factory', 'assembly', 'quality control', 'equipment', 'machinery'],
      weight: 1.2
    },
    retail: {
      keywords: ['retail', 'store', 'customer', 'sales', 'shopping', 'merchandise', 'checkout'],
      weight: 1.0
    },
    finance: {
      keywords: ['finance', 'banking', 'investment', 'loan', 'credit', 'portfolio', 'financial'],
      weight: 1.0
    },
    general: {
      keywords: ['business', 'company', 'organization', 'revenue', 'profit', 'operations'],
      weight: 0.5 // Lower weight for generic terms
    }
  };
  
  // Score each industry based on keyword matches
  Object.entries(industryPatterns).forEach(([industry, { keywords, weight }]) => {
    let matches = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const keywordMatches = (responseTexts.match(regex) || []).length;
      matches += keywordMatches;
    });
    
    if (matches > 0) {
      industryScore[industry] = matches * weight;
    }
  });
  
  // 2. Find top industry and calculate confidence
  const sortedIndustries = Object.entries(industryScore)
    .sort(([,a], [,b]) => b - a);
  
  if (sortedIndustries.length === 0) {
    return { industry: 'general', confidence: 0.3, reason: 'No clear industry signals detected' };
  }
  
  const [topIndustry, topScore] = sortedIndustries[0];
  const [secondIndustry, secondScore] = sortedIndustries[1] || ['', 0];
  
  // Calculate confidence based on score dominance
  const totalScore = Object.values(industryScore).reduce((sum, score) => sum + score, 0);
  const dominance = topScore / totalScore;
  const separation = secondScore > 0 ? (topScore - secondScore) / topScore : 1;
  
  let confidence = dominance * separation;
  let reason = '';
  
  // 3. Confidence-based decision making
  if (confidence > 0.7) {
    reason = `Strong ${topIndustry.replace('_', ' ')} signals detected`;
    return { industry: topIndustry, confidence, reason };
  } else if (confidence > 0.4) {
    reason = `Moderate ${topIndustry.replace('_', ' ')} signals, some mixed indicators`;
    return { industry: topIndustry, confidence, reason };
  } else {
    // Mixed or unclear signals - check for random template usage
    const uniqueIndustries = sortedIndustries.filter(([,score]) => score > 1).length;
    if (uniqueIndustries >= 3) {
      reason = 'Multiple industry signals detected - possible template mixing';
    } else {
      reason = 'Unclear industry signals';
    }
    return { industry: 'general', confidence: 0.3, reason };
  }
};

// Legacy fallback for single text analysis
export const determineIndustry = (businessOverview: string): string => {
  const overview = businessOverview.toLowerCase();
  if (overview.includes('motorcycle') || overview.includes('dealership') || overview.includes('bike')) {
    return 'motorcycle_dealer';
  } else if (overview.includes('warehouse') || overview.includes('distribution') || overview.includes('inventory')) {
    return 'warehouse_distribution';  
  } else if (overview.includes('healthcare') || overview.includes('medical') || overview.includes('patient')) {
    return 'healthcare';
  } else if (overview.includes('manufacturing') || overview.includes('production') || overview.includes('factory')) {
    return 'manufacturing';
  }
  return 'general';
};

export const extractCompanyName = (businessOverview: string): string => {
  // Extract company name from business overview or use first few words
  const words = businessOverview.split(' ').slice(0, 3);
  return words.join(' ').replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Company';
};

export const generateSubdomain = (businessOverview: string): string => {
  // Generate a safe subdomain based on business name - consistent with signup logic
  const cleanSubdomain = businessOverview
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 20) // Shorter limit for random suffix
    || 'company'; // Fallback
  
  // Add random suffix for uniqueness
  return cleanSubdomain + '-' + Math.random().toString(36).substring(2, 6);
};
