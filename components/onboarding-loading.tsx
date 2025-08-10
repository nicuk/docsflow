'use client'

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Brain } from 'lucide-react';

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-lg">
          <CardContent className="p-8 text-center">
            <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">Creating Your Custom AI Assistant</h2>
            <p className="text-muted-foreground mb-6">Analyzing your responses to build the perfect business intelligence partner...</p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-left">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span>Understanding your business model...</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-200"></div>
                <span>Identifying your key challenges...</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-400"></div>
                <span>Customizing AI personality...</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-600"></div>
                <span>Optimizing for your success metrics...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
