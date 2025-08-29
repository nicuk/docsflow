import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation - DocsFlow',
  description: 'Complete guide to using DocsFlow for enterprise document intelligence',
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            DocsFlow Documentation
          </h1>
          <p className="text-xl text-gray-600">
            Everything you need to know about using DocsFlow for your team
          </p>
        </div>

        {/* Quick Start Guide */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            🚀 Quick Start Guide
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Documents</h3>
              <p className="text-gray-600">
                Drag and drop your PDFs, Word docs, Excel files, and presentations into your workspace.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ask Questions</h3>
              <p className="text-gray-600">
                Type questions in plain English like "What's our refund policy?" or "Show me Q3 sales data".
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Get Instant Answers</h3>
              <p className="text-gray-600">
                Receive accurate answers with exact page references from your documents in seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Core Features */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            📋 Core Features
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                🔍 Advanced RAG Intelligence System
              </h3>
              <p className="text-gray-600 mb-2">
                Production-grade AI that transforms your documents into instant, verifiable business intelligence.
              </p>
              <ul className="list-disc list-inside text-gray-600 ml-4">
                <li>7-stage RAG pipeline with temporal reasoning and hybrid reranking</li>
                <li>Sub-200ms response times with enterprise-grade performance</li>
                <li>Every answer clickable to exact document source - zero hallucination</li>
                <li>Multi-provider LLM orchestration with intelligent failover</li>
                <li>Hours → seconds information retrieval for complex business queries</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                👥 Eliminate Expert Bottlenecks & Team Knowledge Gaps
              </h3>
              <p className="text-gray-600 mb-2">
                Transform scattered business knowledge into shared team intelligence that works 24/7.
              </p>
              <ul className="list-disc list-inside text-gray-600 ml-4">
                <li>Complete workspace isolation by subdomain - legal docs stay with legal team</li>
                <li>New employees find procedures without interrupting senior staff 20+ times daily</li>
                <li>Stop re-buying information you own - uploaded docs become expert systems</li>
                <li>Instant compliance access during audits reduces legal risks</li>
                <li>Simple admin/user roles - no complex permission management</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                🛡️ Zero-Trust Security Architecture
              </h3>
              <p className="text-gray-600 mb-2">
                Military-grade security with zero data leakage between organizations and complete tenant isolation.
              </p>
              <ul className="list-disc list-inside text-gray-600 ml-4">
                <li>Row-level security with malicious query detection</li>
                <li>AES-256 encryption at rest and in transit</li>
                <li>SOC 2 Type II and GDPR compliance ready</li>
                <li>99.9% uptime with intelligent circuit breakers</li>
                <li>Zero external data access - your docs never leave your workspace</li>
                <li>Complete audit trails with transparent logging</li>
              </ul>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            👥 User Management
          </h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">User Roles</h3>
            <div className="space-y-3">
              <div className="flex items-center p-3 border rounded-lg">
                <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium mr-3">👑</div>
                <div>
                  <div className="font-medium text-gray-900">Admin</div>
                  <div className="text-sm text-gray-600">Full workspace control: user management, settings, all documents, and system administration</div>
                </div>
              </div>
              <div className="flex items-center p-3 border rounded-lg">
                <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium mr-3">👤</div>
                <div>
                  <div className="font-medium text-gray-900">User</div>
                  <div className="text-sm text-gray-600">Access to documents, AI search, chat functionality, and document upload within the workspace</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Inviting Team Members</h3>
            <ol className="list-decimal list-inside text-gray-600 space-y-2">
              <li>Navigate to Admin Dashboard → User Management</li>
              <li>Click "Invite User" button</li>
              <li>Enter the team member's email address</li>
              <li>Assign either Admin or User role</li>
              <li>Send invitation - they'll receive an email to join your workspace</li>
            </ol>
          </div>
        </div>

        {/* Workspace Setup */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            🏢 Workspace Setup
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Custom Subdomain
              </h3>
              <p className="text-gray-600 mb-2">
                Create a branded subdomain for your organization (e.g., yourcompany.docsflow.app).
              </p>
              <ul className="list-disc list-inside text-gray-600 ml-4">
                <li>Professional URL for your team</li>
                <li>Easy to remember and share</li>
                <li>Maintains brand consistency</li>
                <li>Secure, isolated workspace</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Document Organization
              </h3>
              <p className="text-gray-600 mb-2">
                Best practices for organizing your document library for maximum efficiency.
              </p>
              <ul className="list-disc list-inside text-gray-600 ml-4">
                <li>Upload documents by department or project</li>
                <li>Use descriptive file names</li>
                <li>Regular cleanup of outdated documents</li>
                <li>Consistent folder structure across teams</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Security & Privacy */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            🔐 Security & Privacy
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Data Protection</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>AES-256 encryption at rest and in transit</li>
                <li>SOC 2 Type II compliance</li>
                <li>GDPR compliant data handling</li>
                <li>Regular security audits</li>
                <li>Zero-trust architecture</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Privacy Guarantees</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Your documents never leave your workspace</li>
                <li>No data used for training external AI models</li>
                <li>Complete data isolation between organizations</li>
                <li>Right to data deletion</li>
                <li>Transparent audit logging</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Supported File Types */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            📄 Supported File Types
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Document Formats</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>PDF documents (.pdf)</li>
                <li>Microsoft Word (.doc, .docx)</li>
                <li>Plain text files (.txt)</li>
                <li>Rich text format (.rtf)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Spreadsheets & Presentations</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Microsoft Excel (.xls, .xlsx)</li>
                <li>Microsoft PowerPoint (.ppt, .pptx)</li>
                <li>CSV files (.csv)</li>
                <li>OpenDocument formats</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Getting Help */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            🆘 Getting Help
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Support Channels</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>
                  <strong>Email Support:</strong> 
                  <a href="mailto:support@bitto.tech" className="text-blue-600 hover:text-blue-700 ml-1">
                    support@bitto.tech
                  </a>
                </li>
                <li><strong>Response Time:</strong> Within 24 hours</li>
                <li>
                  <strong>FAQ:</strong> 
                  <a href="/support" className="text-blue-600 hover:text-blue-700 ml-1">
                    Visit our Support Center
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Self-Service Resources</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>In-app help tooltips and guides</li>
                <li>Video tutorials (coming soon)</li>
                <li>Best practices documentation</li>
                <li>Community forum (coming soon)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Ready to get started?
          </p>
          <div className="space-x-4">
            <a
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </a>
            <a
              href="/support"
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
