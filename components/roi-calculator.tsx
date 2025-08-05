'use client';

import { useEffect } from 'react';
import { ROICalculator } from '@/lib/roi-calculator';

export default function ROICalculatorComponent() {
  useEffect(() => {
    // Initialize calculator on component mount
    ROICalculator.initialize();
  }, []);

  return (
    <div id="roi-calculator" className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/20 group">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-primary/10 p-2 rounded-lg transition-transform duration-300 group-hover:scale-110">
          <span className="text-xl">📊</span>
        </div>
        <h3 className="text-xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary">
          See How Much You're Losing
        </h3>
      </div>
      
      <div className="space-y-6">
        {/* Hours Slider */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-3">
            Hours spent searching documents weekly:
          </label>
          <input 
            type="range" 
            id="hoursSlider" 
            min="1" 
            max="20" 
            defaultValue="10"
            className="slider w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>1hr</span>
            <span id="hoursValue" className="font-semibold text-foreground">10 hours</span>
            <span>20hrs</span>
          </div>
        </div>
        
        {/* Rate Slider */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Your hourly business value:
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-muted border border-border rounded-full cursor-help hover:bg-muted/80 transition-colors"
                  title="Your expertise has significant value. Every hour spent manually searching through documents is time that could be invested in strategic decision-making, client relationships, or business growth initiatives. Consider what your specialized knowledge and experience is worth per hour in terms of revenue generation and business impact.">
              <svg className="w-3 h-3 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
            </span>
          </label>
          <input 
            type="range" 
            id="rateSlider" 
            min="25" 
            max="200" 
            defaultValue="75"
            className="slider w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>$25</span>
            <span id="rateValue" className="font-semibold text-foreground">$75/hr</span>
            <span>$200</span>
          </div>
        </div>
        
        {/* Results Display */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 group-hover:bg-primary/5">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-foreground transition-colors duration-300 group-hover:text-primary" id="monthlySavings">$3,000</div>
            <div className="text-sm text-muted-foreground">Monthly time savings value</div>
            <div className="text-xs text-muted-foreground">DocsFlow Professional: Starting at $99/month (2 users)</div>
            <div className="text-lg font-bold text-primary transition-all duration-300 group-hover:scale-110" id="roiMultiple">30x ROI</div>
          </div>
        </div>
      </div>

      {/* Slider Styles */}
      <style jsx>{`
        .slider {
          @apply appearance-none bg-muted rounded-lg h-2 cursor-pointer transition-all duration-300;
        }
        
        .slider::-webkit-slider-thumb {
          @apply appearance-none h-5 w-5 rounded-full bg-primary shadow-md cursor-pointer transition-all duration-300;
        }
        
        .slider::-moz-range-thumb {
          @apply h-5 w-5 rounded-full bg-primary border-none shadow-md cursor-pointer transition-all duration-300;
        }
        
        .slider:hover {
          @apply h-3;
        }
        
        .slider:hover::-webkit-slider-thumb {
          @apply scale-110 shadow-lg;
        }
        
        .slider:hover::-moz-range-thumb {
          @apply scale-110 shadow-lg;
        }
      `}</style>
    </div>
  );
}
