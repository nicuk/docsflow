export const GENERIC_QUESTIONS = [
  {
    id: 'business_overview',
    question: "Tell us about your business",
    subtext: "What do you do? What industry are you in? What makes your company unique?",
    placeholder: "We are a motorcycle dealership that specializes in Harley-Davidson bikes and custom modifications...",
    impactMultiplier: "4.8x",
    impactDescription: "more relevant responses when we understand your business model",
    examples: [
      "We operate a multi-location automotive parts distribution network serving 500+ repair shops across the Southeast, specializing in high-performance aftermarket components with same-day delivery",
      "We're a regional healthcare system with 12 clinics processing 2,000+ patient visits monthly, focusing on preventive care and chronic disease management with integrated EHR systems",
      "We manufacture precision-engineered luxury furniture for Fortune 500 corporate headquarters, managing complex supply chains with 50+ international suppliers and $10M+ annual contracts"
    ]
  },
  {
    id: 'daily_challenges',
    question: "What are your biggest daily challenges?",
    subtext: "What problems slow you down? What keeps you up at night?",
    placeholder: "Our biggest challenge is managing inventory - we never know which bikes will sell fast and which will sit on the lot for months...",
    impactMultiplier: "5.2x",
    impactDescription: "better problem-solving when we know your pain points",
    examples: [
      "Demand forecasting across 847 SKUs - we're constantly either overstocked on slow-movers (tying up $2M+ in dead inventory) or out-of-stock on fast-sellers (losing $50K+ weekly in sales)",
      "Patient no-show rates averaging 23% cost us $180K annually in lost revenue, while emergency walk-ins create scheduling chaos that cascades through our entire day, affecting 40+ other appointments",
      "Quality control bottlenecks where manual inspection of 200+ daily units creates delivery delays, and defects discovered at client sites cost us $25K+ in expedited replacements and reputation damage"
    ]
  },
  {
    id: 'key_decisions',
    question: "What important decisions do you make regularly?",
    subtext: "What choices require data? What decisions impact your bottom line?",
    placeholder: "Every month we decide which bikes to order, how to price trade-ins, and which marketing campaigns to run...",
    impactMultiplier: "4.6x",
    impactDescription: "more actionable insights for your specific decision-making needs",
    examples: [
      "Pricing strategy decisions affecting $5M+ annual revenue - analyzing competitor pricing, cost fluctuations, and demand elasticity to optimize margins while maintaining market share across 25+ product categories",
      "Capacity planning decisions for 150+ staff across multiple shifts - predicting patient volume, balancing specialist availability, and optimizing resource allocation to maintain 95% utilization without burnout",
      "Capital investment decisions for $2M+ annual equipment purchases - evaluating ROI on new machinery, comparing lease vs buy scenarios, and timing investments to maximize tax benefits and operational efficiency"
    ]
  },
  {
    id: 'success_metrics',
    question: "How do you measure success?",
    subtext: "What numbers matter most? What would make you say 'we're winning'?",
    placeholder: "Success for us means turning inventory faster, higher profit margins per bike, and more repeat customers...",
    impactMultiplier: "4.3x",
    impactDescription: "more focused analysis on metrics that actually matter to you",
    examples: [
      "Inventory turnover rate above 12x annually, gross margins maintaining 28%+, customer retention rate exceeding 85%, and same-day fulfillment rate hitting 95%+ while keeping carrying costs under 18% of inventory value",
      "Patient satisfaction scores above 4.8/5.0, appointment utilization rate of 92%+, average revenue per patient visit increasing 8% YoY, and clinical outcome improvements measurable through HbA1c, blood pressure, and preventive screening compliance rates",
      "Production efficiency metrics: OEE (Overall Equipment Effectiveness) above 85%, defect rates below 0.3%, on-time delivery performance of 98%+, and customer quality ratings averaging 4.9/5.0 with repeat order rates exceeding 90%"
    ]
  },
  {
    id: 'information_needs',
    question: "What information do you wish you had easier access to?",
    subtext: "What data would help you make better decisions faster?",
    placeholder: "I wish I could quickly see which bike models are trending, seasonal demand patterns, and competitor pricing...",
    impactMultiplier: "5.1x",
    impactDescription: "more targeted document analysis focusing on your information gaps",
    examples: [
      "Real-time demand signals across all channels (B2B orders, market trends, seasonal patterns), supplier performance analytics (delivery times, quality scores, price volatility), and profitability analysis by SKU including true carrying costs and opportunity costs",
      "Integrated patient journey analytics combining clinical outcomes with financial metrics, population health trends affecting our service area, provider productivity benchmarks, and predictive indicators for chronic disease progression to enable proactive interventions",
      "End-to-end production visibility from raw material costs to delivered product profitability, real-time quality metrics correlated with supplier batch data, customer satisfaction feedback linked to specific production runs, and predictive maintenance schedules optimized for minimal downtime"
    ]
  }
];

export type OnboardingQuestion = typeof GENERIC_QUESTIONS[0];
