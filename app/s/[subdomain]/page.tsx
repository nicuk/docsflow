import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSubdomainData } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MessageSquare, BarChart3, Settings, Users, CheckCircle } from 'lucide-react';

export async function generateMetadata({
  params
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    return {
      title: rootDomain
    };
  }

  return {
    title: `${subdomain}.${rootDomain}`,
    description: `Enterprise AI Document Intelligence for ${subdomain}`
  };
}

export default async function SubdomainPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{subdomainData.emoji}</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{subdomain}</h1>
            <p className="text-sm text-gray-500">Enterprise AI Platform</p>
          </div>
        </div>
        <Link
          href={`${protocol}://${rootDomain}`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to {rootDomain}
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Success Message */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Your Enterprise AI Assistant is Ready!</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to {subdomain} Organization
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Your multi-tenant AI document intelligence platform has been created with sample documents 
            and enterprise-grade security. Start exploring your AI assistant capabilities.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-blue-200 bg-blue-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                <CardTitle className="text-lg">AI Chat Assistant</CardTitle>
              </div>
              <CardDescription>
                Ask questions about your business documents with enterprise-grade AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                Try Chat Assistant
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-green-600" />
                <CardTitle className="text-lg">Sample Documents</CardTitle>
              </div>
              <CardDescription>
                Pre-loaded with Company Handbook and Technical Manual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Company Handbook.pdf</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Technical Manual.pdf</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-purple-600" />
                <CardTitle className="text-lg">Access Control</CardTitle>
              </div>
              <CardDescription>
                5-level enterprise security with user-controlled document access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <div>Demo Access: Level 3 (Technician)</div>
                <div className="text-xs text-gray-500 mt-1">
                  Access to technical docs and procedures
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Start Options</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Try Sample Queries:</h4>
              <div className="space-y-2">
                <div className="bg-gray-50 p-3 rounded text-sm">
                  "What are our company policies?"
                </div>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  "Show me the technical procedures"
                </div>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  "What safety guidelines should I follow?"
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Next Steps:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Upload your own documents</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Invite team members</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Configure industry-specific settings</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-8">
          <p className="text-gray-600 mb-4">
            Ready to experience enterprise AI document intelligence?
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Launch AI Assistant
            </Button>
            <Button size="lg" variant="outline">
              View Documentation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
