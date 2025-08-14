/**
 * Persona Quality Scoring System
 * Evaluates the quality of AI-generated personas on a 0-10 scale
 */

export interface PersonaScore {
  overall: number; // 0-10
  breakdown: {
    roleClarity: number;      // How clear and specific the role is
    focusAreaRelevance: number; // How relevant focus areas are to the business
    toneAppropriate: number;   // How appropriate the tone is
    contextDepth: number;      // How well the business context is understood
    promptQuality: number;     // How actionable the prompt template is
  };
  suggestions: string[];
}

export function scorePersona(persona: any, businessOverview: string, industry: string): PersonaScore {
  const breakdown = {
    roleClarity: 0,
    focusAreaRelevance: 0,
    toneAppropriate: 0,
    contextDepth: 0,
    promptQuality: 0
  };
  const suggestions: string[] = [];

  // Score Role Clarity (0-2 points)
  if (persona.role) {
    if (persona.role.length > 50) {
      breakdown.roleClarity = 0.5;
      suggestions.push("Role title is too long. Consider a more concise title.");
    } else if (persona.role.includes(industry) || persona.role.includes('Chief') || persona.role.includes('Director')) {
      breakdown.roleClarity = 2;
    } else if (persona.role !== 'Business Advisor' && persona.role !== `${industry} Business Advisor`) {
      breakdown.roleClarity = 1.5;
    } else {
      breakdown.roleClarity = 1;
      suggestions.push("Role could be more specific to your business type.");
    }
  }

  // Score Focus Areas (0-2 points)
  if (persona.focus_areas && Array.isArray(persona.focus_areas)) {
    const relevantKeywords = extractKeywords(businessOverview);
    const focusKeywords = persona.focus_areas.join(' ').toLowerCase();
    let relevanceCount = 0;
    
    relevantKeywords.forEach(keyword => {
      if (focusKeywords.includes(keyword.toLowerCase())) {
        relevanceCount++;
      }
    });

    if (persona.focus_areas.length >= 3 && persona.focus_areas.length <= 5) {
      breakdown.focusAreaRelevance += 1;
    } else if (persona.focus_areas.length < 3) {
      suggestions.push("Add more focus areas for comprehensive coverage.");
    } else {
      suggestions.push("Too many focus areas. Consider consolidating to 3-5 key areas.");
    }

    if (relevanceCount >= 2) {
      breakdown.focusAreaRelevance += 1;
    } else {
      suggestions.push("Focus areas could be more aligned with your business description.");
    }
  }

  // Score Tone (0-2 points)
  if (persona.tone) {
    const appropriateTones = ['professional', 'friendly', 'technical', 'consultative', 'data-driven', 'solution-oriented'];
    const toneWords = persona.tone.toLowerCase().split(/[,\s]+/);
    const hasAppropriateTone = toneWords.some(word => 
      appropriateTones.some(appropriate => appropriate.includes(word) || word.includes(appropriate))
    );
    
    if (hasAppropriateTone) {
      breakdown.toneAppropriate = 2;
    } else {
      breakdown.toneAppropriate = 1;
      suggestions.push("Consider a more professional or industry-appropriate tone.");
    }
  }

  // Score Business Context (0-2 points)
  if (persona.business_context) {
    const contextLength = persona.business_context.length;
    const mentionsIndustry = persona.business_context.toLowerCase().includes(industry.toLowerCase());
    const hasMetrics = /\d+/.test(persona.business_context);
    
    if (contextLength > 100 && mentionsIndustry) {
      breakdown.contextDepth = hasMetrics ? 2 : 1.5;
    } else if (contextLength > 50) {
      breakdown.contextDepth = 1;
      suggestions.push("Business context could be more detailed with specific metrics or goals.");
    } else {
      breakdown.contextDepth = 0.5;
      suggestions.push("Business context is too brief. Add more details about your operations.");
    }
  }

  // Score Prompt Template (0-2 points)
  if (persona.prompt_template) {
    const hasPlaceholders = persona.prompt_template.includes('[') || persona.prompt_template.includes('{');
    const isActionable = persona.prompt_template.length > 100;
    const isPersonalized = persona.prompt_template.includes(industry) || 
                          (persona.business_context && persona.prompt_template.includes(persona.role));
    
    if (hasPlaceholders && isActionable) {
      breakdown.promptQuality = 2;
    } else if (isPersonalized && isActionable) {
      breakdown.promptQuality = 1.5;
    } else if (isActionable) {
      breakdown.promptQuality = 1;
      suggestions.push("Prompt template could include placeholders for dynamic content.");
    } else {
      breakdown.promptQuality = 0.5;
      suggestions.push("Prompt template needs to be more detailed and actionable.");
    }
  }

  // Calculate overall score
  const overall = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

  // Add general suggestions based on overall score
  if (overall < 5) {
    suggestions.unshift("Consider regenerating the persona with more detailed business information.");
  } else if (overall < 7) {
    suggestions.unshift("Your persona is good but could be enhanced with more specific details.");
  } else if (overall >= 8) {
    suggestions.unshift("Excellent persona! Well-tailored to your business needs.");
  }

  return {
    overall: Math.min(10, overall), // Cap at 10
    breakdown,
    suggestions
  };
}

function extractKeywords(text: string): string[] {
  // Extract important keywords from business overview
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were']);
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  // Count word frequency
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });
  
  // Return top keywords
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

export function improvePersona(
  currentPersona: any,
  score: PersonaScore,
  businessOverview: string,
  industry: string
): any {
  const improved = { ...currentPersona };
  
  // Improve based on suggestions
  if (score.breakdown.roleClarity < 1.5) {
    // Generate a better role title
    const industryRoles = {
      healthcare: ['Chief Medical Operations Officer', 'Healthcare Analytics Director', 'Clinical Excellence Officer'],
      retail: ['Chief Retail Strategy Officer', 'Customer Experience Director', 'Retail Operations Manager'],
      technology: ['Chief Technology Strategist', 'Digital Transformation Officer', 'Tech Operations Director'],
      manufacturing: ['Production Excellence Director', 'Supply Chain Optimization Officer', 'Quality Assurance Director'],
      general: ['Chief Operational Intelligence Officer', 'Business Strategy Director', 'Operations Excellence Manager']
    };
    
    const roles = industryRoles[industry.toLowerCase()] || industryRoles.general;
    improved.role = roles[Math.floor(Math.random() * roles.length)];
  }
  
  // Enhance focus areas if needed
  if (score.breakdown.focusAreaRelevance < 1.5) {
    const keywords = extractKeywords(businessOverview);
    const enhancedFocusAreas = [
      ...improved.focus_areas.slice(0, 2),
      `${keywords[0] ? keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1) : 'Business'} Optimization`,
      'Data-Driven Decision Support'
    ].slice(0, 5);
    improved.focus_areas = enhancedFocusAreas;
  }
  
  // Add improvement metadata
  improved.quality_score = score.overall;
  improved.improvement_suggestions = score.suggestions;
  improved.last_improved = new Date().toISOString();
  
  return improved;
}
