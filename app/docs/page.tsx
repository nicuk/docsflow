import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation - DocsFlow',
  description: 'Learn how to use DocsFlow to search, organize, and get answers from your business documents',
  alternates: {
    canonical: 'https://docsflow.app/docs',
  },
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            DocsFlow Documentation
          </h1>
          <p className="text-xl text-gray-600">
            Everything you need to get started and get the most out of DocsFlow
          </p>
        </div>

        {/* Quick Start */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Getting Started
          </h2>
          <p className="text-gray-600 mb-6">
            DocsFlow turns your business documents into a searchable knowledge base. 
            Instead of digging through folders and files, just ask a question in plain English 
            and get an instant answer — with a link back to the exact source.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="bg-blue-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Upload Your Files</h3>
              <p className="text-sm text-gray-600">
                Drag and drop PDFs, Word docs, Excel files, PowerPoint presentations, or text files into your workspace.
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="bg-green-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Ask a Question</h3>
              <p className="text-sm text-gray-600">
                Type your question the way you'd ask a colleague — for example, 
                "What's our refund policy?" or "Summarize the Q3 report."
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="bg-purple-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Get Your Answer</h3>
              <p className="text-sm text-gray-600">
                Receive a clear answer in seconds, with clickable links back to the exact page 
                and section of the original document.
              </p>
            </div>
          </div>
        </div>

        {/* Uploading Documents */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Uploading Documents
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">How to upload</h3>
              <ol className="list-decimal list-inside text-gray-600 space-y-2 ml-2">
                <li>Go to <strong>Documents</strong> in the left sidebar</li>
                <li>Click the <strong>Upload</strong> button or drag and drop files directly</li>
                <li>Wait for processing to complete (usually a few seconds)</li>
                <li>Your document is now searchable — head to <strong>Chat</strong> to start asking questions</li>
              </ol>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Supported file types</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-red-500 font-bold text-sm">.pdf</span>
                  <span className="text-sm text-gray-600">PDF documents</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-blue-500 font-bold text-sm">.docx</span>
                  <span className="text-sm text-gray-600">Word documents</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-green-500 font-bold text-sm">.xlsx</span>
                  <span className="text-sm text-gray-600">Excel spreadsheets</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-orange-500 font-bold text-sm">.pptx</span>
                  <span className="text-sm text-gray-600">PowerPoint files</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-gray-500 font-bold text-sm">.txt</span>
                  <span className="text-sm text-gray-600">Text files</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <span className="text-gray-500 font-bold text-sm">.csv</span>
                  <span className="text-sm text-gray-600">CSV files</span>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Tip:</strong> Use descriptive file names (e.g., "Q3-2025-Sales-Report.pdf" instead of "report.pdf") 
                — this helps the AI find the right document faster.
              </p>
            </div>
          </div>
        </div>

        {/* Asking Questions */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Asking Questions
          </h2>
          <p className="text-gray-600 mb-4">
            The Chat page is where you interact with your documents. Just type your question 
            and DocsFlow will search across all your uploaded files to find the answer.
          </p>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Examples of good questions</h3>
              <ul className="space-y-2 ml-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">&#10003;</span>
                  <span className="text-gray-600">"What are the payment terms in the ABC Corp contract?"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">&#10003;</span>
                  <span className="text-gray-600">"Summarize the main findings from the annual report"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">&#10003;</span>
                  <span className="text-gray-600">"What's the return policy for damaged goods?"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">&#10003;</span>
                  <span className="text-gray-600">"Compare the budget figures between Q1 and Q2"</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">You can also ask about a specific file</h3>
              <p className="text-gray-600 mb-2">
                Mention the file name in your question and DocsFlow will prioritize that document:
              </p>
              <ul className="space-y-2 ml-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">&#8250;</span>
                  <span className="text-gray-600">"Summarize Employee-Handbook.pdf"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">&#8250;</span>
                  <span className="text-gray-600">"What does the NDA-Template.docx say about non-compete clauses?"</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Understanding the answer</h3>
              <p className="text-gray-600">
                Every answer includes <strong>source cards</strong> showing exactly which document 
                and section the answer came from. Click on any source to see the full context. 
                A <strong>confidence percentage</strong> is shown for each source so you can 
                judge how closely it matches your question.
              </p>
            </div>
          </div>
        </div>

        {/* Managing Your Workspace */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Managing Your Workspace
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your subdomain</h3>
              <p className="text-gray-600">
                Every organization gets its own subdomain (e.g., <strong>yourcompany.docsflow.app</strong>). 
                This keeps your documents completely separate from other organizations. 
                Share the link with your team so they can sign in directly.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">User roles</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0">A</div>
                  <div>
                    <div className="font-medium text-gray-900">Admin</div>
                    <div className="text-sm text-gray-600">
                      Can invite and manage users, configure workspace settings, upload documents, and use the AI assistant.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0">U</div>
                  <div>
                    <div className="font-medium text-gray-900">User</div>
                    <div className="text-sm text-gray-600">
                      Can upload documents, search across the workspace, and ask questions using the AI assistant.
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Inviting team members</h3>
              <ol className="list-decimal list-inside text-gray-600 space-y-2 ml-2">
                <li>Go to <strong>Admin</strong> in the sidebar</li>
                <li>Click <strong>Invite User</strong></li>
                <li>Enter their email address and choose a role (Admin or User)</li>
                <li>They'll receive an invitation email to join your workspace</li>
              </ol>
            </div>
          </div>
        </div>

        {/* AI Persona */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Customizing the AI Assistant
          </h2>
          <p className="text-gray-600 mb-4">
            You can customize how the AI responds to your team. In <strong>Settings</strong>, 
            you'll find the <strong>AI Persona</strong> section where you can:
          </p>
          <ul className="space-y-2 ml-2">
            <li className="flex items-start gap-2 text-gray-600">
              <span className="text-blue-500 mt-1">&#8250;</span>
              <span>Set a name and tone for the AI assistant (e.g., professional, friendly, concise)</span>
            </li>
            <li className="flex items-start gap-2 text-gray-600">
              <span className="text-blue-500 mt-1">&#8250;</span>
              <span>Add custom instructions for how it should respond to your industry-specific questions</span>
            </li>
            <li className="flex items-start gap-2 text-gray-600">
              <span className="text-blue-500 mt-1">&#8250;</span>
              <span>Regenerate the persona at any time to refine the experience for your team</span>
            </li>
          </ul>
        </div>

        {/* Security & Privacy */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Security & Privacy
          </h2>
          <p className="text-gray-600 mb-4">
            Your data stays yours. Here's how we keep it safe:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-gray-600">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>All documents are encrypted in transit and at rest</span>
              </li>
              <li className="flex items-start gap-2 text-gray-600">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>Each workspace is fully isolated — no data leaks between organizations</span>
              </li>
              <li className="flex items-start gap-2 text-gray-600">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>Your documents are never used to train public AI models</span>
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-gray-600">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>GDPR-compliant data handling with right to deletion</span>
              </li>
              <li className="flex items-start gap-2 text-gray-600">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>Only your team members can access your workspace</span>
              </li>
              <li className="flex items-start gap-2 text-gray-600">
                <span className="text-green-500 mt-1">&#10003;</span>
                <span>Complete audit trails for compliance requirements</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Troubleshooting
          </h2>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <h3 className="text-base font-medium text-gray-900 mb-1">
                "My document isn't showing up after upload"
              </h3>
              <p className="text-sm text-gray-600">
                Documents need a moment to process after uploading. Refresh the Documents page 
                after 10–30 seconds. If it still doesn't appear, try uploading again — 
                the file may have failed during processing.
              </p>
            </div>
            <div className="border-b pb-4">
              <h3 className="text-base font-medium text-gray-900 mb-1">
                "The AI says it can't find information that I know is in my files"
              </h3>
              <p className="text-sm text-gray-600">
                Try rephrasing your question or being more specific. If you're looking for content 
                from a particular file, include the file name in your question. 
                Also make sure the document finished processing (check the status on the Documents page).
              </p>
            </div>
            <div className="border-b pb-4">
              <h3 className="text-base font-medium text-gray-900 mb-1">
                "I can't access my workspace"
              </h3>
              <p className="text-sm text-gray-600">
                Make sure you're using the correct subdomain URL (e.g., yourcompany.docsflow.app). 
                If you were invited by email, click the link in your invitation. 
                If issues persist, contact your workspace admin or our support team.
              </p>
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                "How do I reset my password?"
              </h3>
              <p className="text-sm text-gray-600">
                Click "Forgot Password" on the sign-in page, enter your email address, 
                and follow the instructions in the reset email.
              </p>
            </div>
          </div>
        </div>

        {/* Need More Help */}
        <div className="bg-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Need more help?
          </h2>
          <p className="text-gray-600 mb-6">
            Our team is happy to assist. Reach out and we'll get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@bitto.tech"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Email Support
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
