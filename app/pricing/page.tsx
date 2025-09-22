'use client';

import { useState } from 'react';
import { SUBSCRIPTION_PLANS } from '@/lib/tenant-limits';

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleUpgrade = async (planType: string) => {
    setIsLoading(planType);
    
    try {
      // Get current tenant ID (you'll need to implement this based on your auth)
      const tenantId = 'your-tenant-id'; // Replace with actual tenant ID logic
      
      const response = await fetch('/api/stripe/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          tenantId,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session:', data.error);
        alert('Failed to start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Scale your AI-powered lead routing with plans designed for businesses of all sizes
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-lg p-8 relative ${
                plan.id === 'professional' 
                  ? 'ring-2 ring-blue-500 scale-105' 
                  : 'hover:shadow-xl transition-shadow'
              }`}
            >
              {plan.id === 'professional' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-slate-600 mb-4">
                  {plan.description}
                </p>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-slate-900">
                    ${plan.pricePerMonth}
                  </span>
                  <span className="text-slate-600 ml-1">/month</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-slate-700">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isLoading === plan.id}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  plan.id === 'professional'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading === plan.id ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  `Get Started with ${plan.name}`
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-slate-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes are prorated and take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-600">
                We accept all major credit cards, debit cards, and bank transfers through our secure payment processor.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-slate-600">
                Yes, all plans come with a 14-day free trial. No credit card required to start.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600">
                Absolutely. You can cancel your subscription at any time from your billing dashboard. No cancellation fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
