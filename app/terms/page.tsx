import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - DocsFlow',
  description: 'Terms of Service for DocsFlow AI-powered document intelligence platform',
  alternates: {
    canonical: 'https://docsflow.app/terms',
  },
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            Terms of Service
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                By accessing or using DocsFlow (the "Service"), you agree to these Terms of Service ("Terms"). If you do not agree, you may not use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Service Description
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                DocsFlow provides AI-powered tools to process, search, and analyze documents. Features may include file upload, classification, retrieval-augmented responses, chat functionality, and related services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Eligibility
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                You must be at least 18 years old and legally capable of entering into binding agreements to use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. User Responsibilities
              </h2>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>You are responsible for all documents and content you upload.</li>
                <li>You agree not to use the Service for unlawful, harmful, or abusive purposes.</li>
                <li>You are responsible for keeping your login credentials secure.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Intellectual Property
              </h2>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>All intellectual property rights in the Service remain with DocsFlow.</li>
                <li>You retain ownership of the content you upload.</li>
                <li>By uploading content, you grant DocsFlow a limited license to process that content solely for the purpose of providing the Service.</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Service Availability
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                The Service is provided "as-is." We may suspend, modify, or discontinue features at any time without liability.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Limitation of Liability
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                To the maximum extent permitted by law, DocsFlow is not liable for indirect, incidental, or consequential damages arising from use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Termination
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We may suspend or terminate access if you breach these Terms. You may stop using the Service at any time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Governing Law
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                These Terms are governed by the laws of the State of Delaware, United States.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Contact
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                For questions about these Terms, contact us at:
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Email:</strong> legal@docsflow.app<br/>
                  <strong>Address:</strong> DocsFlow Legal Department
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
