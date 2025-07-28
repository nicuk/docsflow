import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, Brain, Zap, Target, TrendingUp } from 'lucide-react';

const GENERIC_QUESTIONS = [
  {
    id: 'business_overview',
    question: "Tell us about your business",
    subtext: "What do you do? What industry are you in? What makes your company unique?",
    placeholder: "We are a motorcycle dealership that specializes in Harley-Davidson bikes and custom modifications...",
    impactMultiplier: "3.2x",
    impactDescription: "more relevant responses when we understand your business model",
    examples: [
      "We run a warehouse distribution center for automotive parts",
      "We're a dental practice with 3 locations serving families",
      "We manufacture custom furniture for high-end hotels"
    ]
  },
  {
    id: 'daily_challenges',
    question: "What are your biggest daily challenges?",
    subtext: "What problems slow you down? What keeps you up at night?",
    placeholder: "Our biggest challenge is managing inventory - we never know which bikes will sell fast and which will sit on the lot for months...",
    impactMultiplier: "4.1x",
    impactDescription: "better problem-solving when we know your pain points",
    examples: [
      "Inventory management - too much of slow items, not enough of popular ones",
      "Customer scheduling - lots of no-shows and last-minute cancellations",
      "Quality control - catching defects before they reach customers"
    ]
  },
  {
    id: 'key_decisions',
    question: "What important decisions do you make regularly?",
    subtext: "What choices require data? What decisions impact your bottom line?",
    placeholder: "Every month we decide which bikes to order, how to price trade-ins, and which marketing campaigns to run...",
    impactMultiplier: "2.8x",
    impactDescription: "more actionable insights for your specific decision-making needs",
    examples: [
      "Pricing decisions - what to charge for products/services",
      "Staffing decisions - when to hire, schedule, or reassign people",
      "Investment decisions - what equipment or software to buy"
    ]
  },
  {
    id: 'success_metrics',
    question: "How do you measure success?",
    subtext: "What numbers matter most? What would make you say 'we're winning'?",
    placeholder: "Success for us means turning inventory faster, higher profit margins per bike, and more repeat customers...",
    impactMultiplier: "2.5x",
    impactDescription: "more focused analysis on metrics that actually matter to you",
    examples: [
      "Profit margins, customer satisfaction scores, inventory turnover",
      "Patient satisfaction, appointment efficiency, revenue per visit",
      "Production efficiency, defect rates, on-time delivery"
    ]
  },
  {
    id: 'information_needs',
    question: "What information do you wish you had easier access to?",
    subtext: "What data would help you make better decisions faster?",
    placeholder: "I wish I could quickly see which bike models are trending, seasonal demand patterns, and competitor pricing...",
    impactMultiplier: "3.7x",
    impactDescription: "more targeted document analysis focusing on your information gaps",
    examples: [
      "Real-time inventory levels, supplier performance, cost breakdowns",
      "Patient history, treatment outcomes, insurance claim status",
      "Production schedules, quality metrics, maintenance needs"
    ]
  }
];

export default function GenericOnboardingFlow() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState({});
  const [currentResponse, setCurrentResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPersonality, setCustomPersonality] = useState(null);

  const progress = ((currentQuestion + 1) / GENERIC_QUESTIONS.length) * 100;
  const question = GENERIC_QUESTIONS[currentQuestion];
  const isLastQuestion = currentQuestion === GENERIC_QUESTIONS.length - 1;

  const handleNext = () => {
    const updatedResponses = {
      ...responses,
      [question.id]: currentResponse
    };
    setResponses(updatedResponses);

    if (isLastQuestion) {
      generateCustomPersonality(updatedResponses);
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentResponse('');
    }
  };

  const generateCustomPersonality = async (allResponses) => {
    setIsGenerating(true);
    
    // Call your backend API to generate custom AI personality
    try {
      const response = await fetch('/api/generate-personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: allResponses,
          timestamp: new Date().toISOString()
        })
      });

      const personality = await response.json();
      setCustomPersonality(personality);
    } catch (error) {
      console.error('Error generating personality:', error);
      // Fallback to mock personality
      setCustomPersonality({
        businessType: "Motorcycle Dealership",
        focusAreas: ["inventory management", "sales optimization", "customer retention"],
        personalityTraits: ["detail-oriented", "profit-focused", "customer-centric"],
        customPrompt: "You are a specialized motorcycle dealership assistant focused on inventory optimization and sales performance."
      });
    }
    
    setIsGenerating(false);
  };

  if (customPersonality) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Your AI Assistant is Ready!</h2>
                <p className="text-gray-600">We've created a custom AI personality based on your responses</p>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Business Type Detected</h3>
                  <p className="text-blue-700">{customPersonality.businessType}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">AI Focus Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {customPersonality.focusAreas?.map((area, index) => (
                      <span key={index} className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-2">Personality Traits</h3>
                  <div className="flex flex-wrap gap-2">
                    {customPersonality.personalityTraits?.map((trait, index) => (
                      <span key={index} className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-sm">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={() => window.location.href = '/dashboard'} className="w-full mt-6" size="lg">
                Start Using My Custom AI Assistant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold mb-2">Creating Your Custom AI Assistant</h2>
              <p className="text-gray-600 mb-6">Analyzing your responses to build the perfect business intelligence partner...</p>
              
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {currentQuestion + 1} of {GENERIC_QUESTIONS.length}
            </span>
            <span className="text-sm text-gray-600">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Impact Explanation */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">
                  Why we're asking these questions
                </h3>
                <p className="text-blue-700 text-sm mb-2">
                  Each detailed response helps us create an AI assistant that understands your specific business. 
                  Generic answers get generic results - detailed answers get AI that thinks like your industry expert.
                </p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800 font-medium text-sm">
                    Detailed responses = {question.impactMultiplier} {question.impactDescription}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Question Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {currentQuestion + 1}
              </div>
              <div>
                <CardTitle className="text-xl">{question.question}</CardTitle>
                <CardDescription className="text-base mt-1">
                  {question.subtext}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Examples */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Good examples:
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                {question.examples.map((example, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Response Input */}
            <div className="space-y-2">
              <Label htmlFor="response" className="text-base font-medium">
                Your response (be specific for better results):
              </Label>
              <Textarea
                id="response"
                placeholder={question.placeholder}
                value={currentResponse}
                onChange={(e) => setCurrentResponse(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {currentResponse.length > 50 ? '✅ Great detail!' : '⚠️ More detail = better AI'}
                </span>
                <span>{currentResponse.length} characters</span>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
              {currentQuestion > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentQuestion(currentQuestion - 1)}
                  className="flex-1"
                >
                  Previous
                </Button>
              )}
              <Button 
                onClick={handleNext}
                disabled={currentResponse.trim().length < 20}
                className="flex-1"
              >
                {isLastQuestion ? 'Create My AI Assistant' : 'Next Question'}
                {!isLastQuestion && <ArrowRight className="w-4 h-4 ml-2" />}
                {isLastQuestion && <Brain className="w-4 h-4 ml-2" />}
              </Button>
            </div>

            {/* Encourage detailed responses */}
            {currentResponse.trim().length < 20 && (
              <div className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                💡 Add more detail to unlock better AI responses (minimum 20 characters)
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}