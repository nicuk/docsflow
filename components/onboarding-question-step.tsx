'use client'

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, Brain, Zap, Target, TrendingUp } from 'lucide-react';
import { OnboardingQuestion } from '@/lib/onboarding-questions';

interface OnboardingQuestionStepProps {
  currentQuestion: number;
  questionData: OnboardingQuestion;
  currentResponse: string;
  onResponseChange: (response: string) => void;
  onNext: () => void;
  onboardingData: any;
  totalSteps: number;
  currentStep: number;
  userRole: 'admin' | 'user' | 'technician';
  isLastQuestion: boolean;
}

export default function OnboardingQuestionStep({
  currentQuestion,
  questionData,
  currentResponse,
  onResponseChange,
  onNext,
  onboardingData,
  totalSteps,
  currentStep,
  userRole,
  isLastQuestion
}: OnboardingQuestionStepProps) {
  const questionProgress = (currentStep / totalSteps) * 100;

  return (
    <div className="h-screen bg-background p-2 sm:p-4 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col h-full">
        {/* Compact Organization Info Header */}
        {onboardingData && (
          <div className="mb-2 bg-muted/50 p-2 sm:p-3 rounded-lg border border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm sm:text-lg font-semibold text-foreground">
                  Setting up AI for {onboardingData.displayName}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Subdomain: {onboardingData.subdomain}.docsflow.app • Industry: {onboardingData.industry}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-primary">
                  Step {currentStep + 1} of {totalSteps}
                </div>
                <div className="text-xs sm:text-sm font-medium text-foreground">
                  {userRole === 'admin' ? 'Admin Setup' : 'User Setup'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ultra Compact Progress Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-3 bg-card p-2 sm:p-3 rounded-lg shadow-sm border border-border flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm sm:text-base">
              {currentQuestion + 1}
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-bold text-foreground">{questionData.question}</h1>
              <p className="text-xs text-muted-foreground">Question {currentQuestion + 1} of 5 • {Math.round(questionProgress)}% complete</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-primary">{questionData.impactMultiplier}</div>
              <div className="text-xs text-muted-foreground">impact</div>
            </div>
            <Progress value={questionProgress} className="w-16 sm:w-24" />
          </div>
        </div>

        {/* Main Content - Fills Remaining Space */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 min-h-0">
          
          {/* Left Column: Examples & Impact */}
          <div className="flex flex-col gap-2 sm:gap-3 min-h-0">
            {/* Impact Explanation - Ultra Compact */}
            <Card className="border-primary/20 bg-primary/10 flex-shrink-0">
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Why This Matters</h3>
                </div>
                <p className="text-muted-foreground text-xs mb-2">
                  {questionData.subtext}
                </p>
                <div className="flex items-center gap-1 bg-muted p-1 rounded text-xs">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-foreground font-medium">
                    Detailed = {questionData.impactMultiplier} better results
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Examples - Scrollable */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <CardTitle className="text-sm text-green-600 dark:text-green-400">High-Value Examples</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto min-h-0">
                <div className="space-y-2">
                  {questionData.examples.map((example: string, index: number) => (
                    <div key={index} className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <p className="text-xs text-green-800 dark:text-green-200 font-medium">{example}</p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      💡 <strong>Pro Tip:</strong> Copy and adapt these examples
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Response Input */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="pb-2 flex-shrink-0">
              <CardTitle className="text-sm sm:text-base">Your Response</CardTitle>
              <CardDescription className="text-xs">Be specific - more detail = better AI results</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                <Textarea
                  id="response"
                  placeholder={questionData.placeholder}
                  value={currentResponse}
                  onChange={(e) => onResponseChange(e.target.value)}
                  className="resize-none h-full w-full text-sm"
                />
              </div>
              
              {/* Response Quality Indicator - Compact */}
              <div className="mt-2 p-2 rounded-lg bg-muted/50 flex-shrink-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-foreground">
                    {currentResponse.length > 100 ? '🎯 Excellent!' : 
                     currentResponse.length > 50 ? '✅ Good!' : 
                     currentResponse.length > 20 ? '⚠️ More detail' : 
                     '❌ Too brief'}
                  </span>
                  <span className="text-xs text-muted-foreground">{currentResponse.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all ${
                      currentResponse.length > 100 ? 'bg-green-500' :
                      currentResponse.length > 50 ? 'bg-primary' :
                      currentResponse.length > 20 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, (currentResponse.length / 150) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3 flex-shrink-0">
                <Button 
                  onClick={onNext}
                  disabled={currentResponse.length < 10}
                  className="w-full text-xs sm:text-sm"
                  size="sm"
                >
                  {isLastQuestion ? (
                    <>
                      <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Create AI
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
