import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support - DocsFlow',
  description: 'Get help and support for your DocsFlow account',
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Support Center
          </h1>
          <p className="text-xl text-gray-600">
            We're here to help you get the most out of DocsFlow
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Average response time: Within 24 hours | 24/7 documentation available
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              📧 Contact Support
            </h2>
            <p className="text-gray-600 mb-4">
              Need direct assistance? Our support team is ready to help.
            </p>
            <a
              href="mailto:support@bitto.tech"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Email Support
            </a>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              📚 Documentation
            </h2>
            <p className="text-gray-600 mb-4">
              Browse our comprehensive guides and tutorials.
            </p>
            <a
              href="/docs"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              View Docs
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                How do I invite team members to my workspace?
              </h3>
              <p className="text-gray-600">
                Go to your admin dashboard, navigate to "User Management", and click "Invite User". 
                Enter their email address and assign them either admin or user permissions.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Can I customize my workspace with custom branding?
              </h3>
              <p className="text-gray-600">
                You can create a custom subdomain for your workspace (e.g., yourcompany.docsflow.app). 
                Full branding customization is not currently available.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What user roles are available?
              </h3>
              <p className="text-gray-600">
                We offer two simple user roles: Admin (full permissions including user management and settings) 
                and User (access to documents and search functionality). Each workspace is completely isolated by subdomain.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                How secure is my information in DocsFlow?
              </h3>
              <p className="text-gray-600">
                Your data is protected with enterprise-grade security including AES-256 encryption, SOC 2 compliance, 
                and GDPR compliance. All documents are processed securely and never used to train public AI models.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Can DocsFlow access my uploaded documents?
              </h3>
              <p className="text-gray-600">
                No, DocsFlow cannot access your documents. All data remains in your controlled environment. 
                Our AI processes your content locally within your secure workspace without external access.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What file types does DocsFlow support?
              </h3>
              <p className="text-gray-600">
                DocsFlow works with PDFs, Word documents, Excel spreadsheets, PowerPoint presentations, 
                and text files. All content is automatically indexed for natural language search.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                How do I reset my password?
              </h3>
              <p className="text-gray-600">
                Click "Forgot Password" on the login page, enter your email address, and follow the 
                instructions in the reset email we send you.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                How quickly can my team start using DocsFlow?
              </h3>
              <p className="text-gray-600">
                Most teams are productive within 30 minutes. Simply upload your documents and start asking 
                questions in plain English. No complex training or setup required.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What makes DocsFlow different from ChatGPT?
              </h3>
              <p className="text-gray-600">
                ChatGPT can't access your company documents, isolate sensitive information, or prove where answers come from. 
                DocsFlow creates a shared team knowledge base with instant search, separate workspaces for different teams, 
                and every answer is clickable to the exact document source.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What business problems does DocsFlow solve?
              </h3>
              <p className="text-gray-600">
                Hours → seconds information retrieval, secure team knowledge sharing without email chains, 
                eliminate expert bottlenecks where new employees interrupt senior staff 20+ times daily, 
                instant compliance access during audits, and stop re-buying information you already own.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            🚀 Quick Actions
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="/dashboard/documents"
              className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-2xl mb-2">📤</div>
              <div className="font-medium text-gray-900">Upload Documents</div>
              <div className="text-sm text-gray-600">Start adding your files</div>
            </a>
            <a
              href="/dashboard/admin"
              className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium text-gray-900">Invite Team</div>
              <div className="text-sm text-gray-600">Add team members</div>
            </a>
            <a
              href="/dashboard/chat"
              className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="text-2xl mb-2">💬</div>
              <div className="font-medium text-gray-900">Ask Questions</div>
              <div className="text-sm text-gray-600">Start searching documents</div>
            </a>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">
            Can't find what you're looking for?{' '}
            <a
              href="mailto:support@bitto.tech"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
