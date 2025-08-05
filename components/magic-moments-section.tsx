"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign, CheckCircle } from "lucide-react"

export default function MagicMomentsSection() {
  const magicMoments = [
    {
      emoji: "🏗️",
      title: "Contractor's \"Holy Shit\" Moment",
      before: {
        pain: "Client calls asking about electrical specs. I spend 2 hours digging through project folders, emails, and change orders. Client gets frustrated waiting.",
        color: "bg-red-50 border-red-200"
      },
      after: {
        magic: "What outlets are specified for the kitchen?",
        answer: "GFCI outlets, 20-amp circuits, stainless steel finish as per electrical plan Sheet E-2",
        result: "8 seconds",
        color: "bg-green-50 border-green-200"
      },
      savings: {
        time: "2 hours → 8 seconds",
        impact: "Client satisfaction: 📈 Through the roof"
      },
      gradient: "from-red-50 to-red-100"
    },
    {
      emoji: "🍕",
      title: "Restaurant Owner's Breakthrough", 
      before: {
        pain: "Need to price new menu items. Food costs are scattered across 15 different supplier contracts. Takes me 3 hours plus accountant fees.",
        color: "bg-orange-50 border-orange-200"
      },
      after: {
        magic: "What's my cost for premium mozzarella?",
        answer: "$4.80/lb from Tony's Dairy (Contract expires March 2024), $5.20/lb from Metro Foods",
        result: "6 seconds",
        color: "bg-green-50 border-green-200"
      },
      savings: {
        time: "Saved: $300/month in accountant fees",
        impact: "Menu pricing: Done in minutes, not hours"
      },
      gradient: "from-orange-50 to-orange-100"
    },
    {
      emoji: "💼",
      title: "Consultant's Game Changer",
      before: {
        pain: "Client disputes invoice scope. I need original SOW from 8 months ago. Files are scattered across email, Dropbox, and local folders. Pure panic.",
        color: "bg-blue-50 border-blue-200"
      },
      after: {
        magic: "What was included in Johnson's Phase 2 deliverables?",
        answer: "Website redesign, 3 landing pages, SEO audit, 2 rounds of revisions - SOW signed June 15th",
        result: "5 seconds",
        color: "bg-green-50 border-green-200"
      },
      savings: {
        time: "Dispute resolved instantly",
        impact: "Client relationship: Saved ✅"
      },
      gradient: "from-blue-50 to-blue-100"
    }
  ]

  return (
    <section className="magic-moments py-20 bg-white">
      <div className="container max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-4">
          Experience The Magic That's Transforming Businesses
        </h2>
        <p className="text-xl text-center text-gray-600 mb-16">
          Watch real business owners discover what's possible when AI meets their documents
        </p>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {magicMoments.map((moment, index) => (
            <Card key={index} className={`bg-gradient-to-br ${moment.gradient} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
              <CardHeader className="text-center">
                <div className="text-6xl mb-4">{moment.emoji}</div>
                <CardTitle className="text-2xl mb-4">{moment.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Before (The Pain) */}
                <Card className={`${moment.before.color} border-2`}>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-2 font-semibold">Before (The Pain):</p>
                    <p className="italic text-sm">{moment.before.pain}</p>
                  </CardContent>
                </Card>
                
                {/* Arrow */}
                <div className="text-center text-2xl">⬇️</div>
                
                {/* After (The Magic) */}
                <Card className={`${moment.after.color} border-2 border-l-4 border-l-green-500`}>
                  <CardContent className="p-4">
                    <p className="text-sm text-green-700 mb-2 font-semibold">After (The Magic):</p>
                    <p className="font-bold text-sm mb-2">"{moment.after.magic}"</p>
                    <p className="text-sm text-green-600 mb-2">
                      Answer in {moment.after.result}: "{moment.after.answer}"
                    </p>
                  </CardContent>
                </Card>
                
                {/* Results */}
                <Card className="bg-yellow-100 border-2 border-yellow-300">
                  <CardContent className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <p className="font-bold text-lg">{moment.savings.time}</p>
                    </div>
                    <p className="text-sm">{moment.savings.impact}</p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-2xl font-bold text-gray-900 mb-6">
            Ready to Experience Your Own "Holy Shit" Moment?
          </p>
          <Button 
            asChild
            className="bg-green-600 hover:bg-green-700 text-white px-10 py-5 text-xl font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <a href="/signup">
              🚀 Get Your Magic Demo (Upload Your Files Now)
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}