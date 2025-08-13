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
              href="mailto:support@docsflow.app"
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
                How do I invite team members to my tenant?
              </h3>
              <p className="text-gray-600">
                Go to your admin dashboard, navigate to "Team Management", and click "Invite User". 
                Enter their email address and select the appropriate access level.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Can I customize my tenant's branding?
              </h3>
              <p className="text-gray-600">
                Yes! In your tenant settings, you can customize colors, logos, and other branding elements 
                to match your organization's identity.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What access levels are available?
              </h3>
              <p className="text-gray-600">
                We offer 5 access levels: Admin (5), Manager (4), User (3), Viewer (2), and Guest (1). 
                Each level has different permissions for managing content and users.
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
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">
            Can't find what you're looking for?{' '}
            <a
              href="mailto:support@docsflow.app"
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
