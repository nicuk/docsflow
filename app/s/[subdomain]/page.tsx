import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSubdomainData } from '@/lib/subdomains';
import { protocol, rootDomain } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MessageSquare, Users, CheckCircle, Building2 } from 'lucide-react';

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

  const orgName = subdomainData.displayName || `${subdomain} Organization`;

  return {
    title: `${orgName} - AI Document Intelligence`,
    description: `Enterprise AI Document Intelligence Platform for ${orgName}`
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

  const organizationName = subdomainData.displayName || `${subdomain} Organization`;
  const industry = 'General Business'; // Industry not available in SubdomainData type

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b bg-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {organizationName}
            </h1>
            <p className="text-sm text-gray-500">{industry} • AI Document Intelligence</p>
          </div>
        </div>
        <Link
          href={`${protocol}://${rootDomain}`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1 rounded-md hover:bg-gray-100"
        >
          ← Back to {rootDomain}
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Success Message */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full mb-6">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Platform Successfully Created</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to {organizationName}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Your enterprise AI document intelligence platform is ready. Start asking questions about your business documents with industry-specific AI assistance.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
                      <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">AI Chat Assistant</CardTitle>
                    <CardDescription className="text-sm">
                      Industry-specific AI responses
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href="https://v0-ai-saas-landing-page-lw.vercel.app/dashboard/chat" target="_blank">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Start Conversation
                  </Button>
                </Link>
              </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Sample Documents</CardTitle>
                  <CardDescription className="text-sm">
                    Pre-loaded for immediate testing
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Company Handbook.pdf</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Operations Manual.pdf</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Access Control</CardTitle>
                  <CardDescription className="text-sm">
                    Enterprise-grade security
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <div className="font-medium">Demo Access: Level 3</div>
                <div className="text-xs text-gray-500 mt-1">
                  Technical documentation access
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Start */}
        <div className="bg-white rounded-xl border shadow-sm p-8">
          <h3 className="text-xl font-semibold mb-6 text-center">Quick Start Guide</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Try Sample Queries:</h4>
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg text-sm border-l-4 border-blue-500">
                  "What are our company policies?"
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-sm border-l-4 border-blue-500">
                  "Show me the operations procedures"
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-sm border-l-4 border-blue-500">
                  "What safety guidelines should I follow?"
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Next Steps:</h4>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Upload your organization's documents</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Invite team members with appropriate access levels</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Configure industry-specific settings</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Set up document access levels for security</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6 text-lg">
            Ready to transform how your organization accesses information?
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="https://v0-ai-saas-landing-page-lw.vercel.app/dashboard" target="_blank">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                Launch AI Assistant
              </Button>
            </Link>
            <Link href="https://v0-ai-saas-landing-page-lw.vercel.app" target="_blank">
              <Button size="lg" variant="outline" className="px-8">
                View Documentation
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
