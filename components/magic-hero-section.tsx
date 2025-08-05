"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, FileText, Clock, DollarSign, ArrowRight, Zap } from "lucide-react"

export default function MagicHeroSection() {
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentDemo, setCurrentDemo] = useState(0)

  const demoScenarios = [
    {
      icon: "🏗️",
      question: "What outlets are specified for the kitchen?",
      answer: "GFCI outlets, 20-amp circuits, stainless steel finish as per electrical plan Sheet E-2",
      timeSaved: "2 hours → 8 seconds",
      business: "Contractor"
    },
    {
      icon: "🍕", 
      question: "What's my cost for premium mozzarella?",
      answer: "$4.80/lb from Tony's Dairy (Contract expires March 2024), $5.20/lb from Metro Foods",
      timeSaved: "$300/month saved",
      business: "Restaurant Owner"
    },
    {
      icon: "💼",
      question: "What was included in Johnson's Phase 2 deliverables?",
      answer: "Website redesign, 3 landing pages, SEO audit, 2 rounds of revisions - SOW signed June 15th",
      timeSaved: "Dispute resolved instantly",
      business: "Consultant"
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDemo((prev) => (prev + 1) % demoScenarios.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const triggerMagicDemo = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 3000)
  }

  const currentScenario = demoScenarios[currentDemo]

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-800 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="floating-documents animate-float">📄📊📋💼</div>
      </div>
      
      <div className="container max-w-6xl px-4 z-10">
        <div className="text-center">
          {/* Problem Hook (Emotional) */}
          <div className="bg-red-600 text-white px-6 py-3 rounded-full inline-block mb-6 text-lg font-bold animate-pulse">
            ⚠️ STOP: Are You Still Manually Searching Business Documents?
          </div>
          
          {/* The Magic Promise */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            Ask Any Question About Your Business Files
            <br />
            <span className="text-yellow-400 animate-pulse">Get Answers in 10 Seconds</span>
          </h1>
          
          {/* Concrete Value */}
          <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto leading-relaxed opacity-90">
            Upload contracts, invoices, reports, policies → Ask in plain English → 
            Get instant answers with exact page references. 
            <strong className="text-yellow-400">Save 10+ hours every week.</strong>
          </p>
          
          {/* Live Magic Demo */}
          <Card className="bg-white text-gray-900 rounded-2xl p-8 mb-8 max-w-4xl mx-auto shadow-2xl">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <span className="text-2xl">{currentScenario.icon}</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">{currentScenario.business}: Live Business Document</p>
                <p className="text-gray-600">Just uploaded • Processing complete</p>
              </div>
            </div>
            
            {/* Interactive Demo */}
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <p className="text-sm text-blue-600 font-semibold">👤 BUSINESS OWNER ASKS:</p>
                <p className="text-xl font-bold">"{currentScenario.question}"</p>
              </div>
              
              <div className="flex justify-center">
                {isAnimating ? (
                  <div className="animate-spin text-blue-600 font-bold flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Processing...
                  </div>
                ) : (
                  <Button 
                    onClick={triggerMagicDemo}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Watch The Magic
                  </Button>
                )}
              </div>
              
              {!isAnimating && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg text-left">
                  <p className="text-sm text-green-600 font-semibold">🤖 INSTANT ANSWER (3.2 seconds):</p>
                  <p className="text-lg mb-2">"{currentScenario.answer}"</p>
                  <div className="flex items-center text-sm text-blue-600">
                    <span className="mr-2">📍</span>
                    <span className="font-semibold">Found with exact source | Confidence: 98%</span>
                  </div>
                  <Badge className="mt-2 bg-yellow-100 text-yellow-800">
                    {currentScenario.timeSaved}
                  </Badge>
                </div>
              )}
            </div>
          </Card>

          {/* ROI Quick Calculator */}
          <Card className="bg-blue-600 text-white rounded-2xl p-6 mb-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">📊 Your Time = Your Money</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold">10 hrs</div>
                <p className="text-sm">Weekly search time</p>
              </div>
              <div>
                <div className="text-3xl font-bold">× $50</div>
                <p className="text-sm">Your hourly value</p>
              </div>
              <div className="bg-yellow-400 text-gray-900 p-3 rounded-lg">
                <div className="text-3xl font-bold">$2,000</div>
                <p className="text-sm font-bold">Monthly savings</p>
              </div>
            </div>
            <p className="text-lg mt-4">
              Our cost: $297/month | Your savings: $2,000/month = <strong className="text-yellow-300">574% ROI</strong>
            </p>
          </Card>
          
          {/* Irresistible CTA */}
          <div className="space-y-4">
            <Button 
              asChild
              className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-12 py-6 text-2xl font-bold rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              <a href="/signup">
                🎯 Try This Magic With YOUR Documents (Free Setup)
              </a>
            </Button>
            
            <p className="text-lg opacity-80">
              ✅ $1,000 setup fee waived for first 50 businesses<br />
              ✅ Upload your actual files and test immediately<br />
              ✅ No credit card required
            </p>
            
            <Button 
              variant="outline" 
              className="border-2 border-white text-white px-8 py-4 text-lg rounded-lg hover:bg-white hover:text-blue-900 transition-all duration-200"
            >
              📺 Watch 2-Minute Magic Demo
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .floating-documents {
          font-size: 3rem;
          position: absolute;
          top: 20%;
          left: 10%;
          animation: float 8s ease-in-out infinite;
        }
        .floating-documents:nth-child(2) {
          top: 40%;
          right: 10%;
          animation-delay: -2s;
        }
        .floating-documents:nth-child(3) {
          bottom: 30%;
          left: 20%;
          animation-delay: -4s;
        }
      `}</style>
    </section>
  )
}