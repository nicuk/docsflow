import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Document Intelligence',
  description: 'Terms of Service for Document Intelligence platform',
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
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                By accessing and using Document Intelligence platform ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Use License
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Permission is granted to temporarily use Document Intelligence platform for personal and commercial use. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on the platform</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Data Privacy and Security
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We take your data privacy seriously. Your documents and business information are:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Encrypted at rest and in transit using enterprise-grade security</li>
                <li>Never shared with third parties without your explicit consent</li>
                <li>Processed in compliance with GDPR and other data protection regulations</li>
                <li>Stored with tenant isolation to ensure complete data separation</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Team Access and Permissions
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                As a team-based platform, you agree that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>You are responsible for managing access permissions within your organization</li>
                <li>Team administrators have full control over document access levels</li>
                <li>Users may only access documents appropriate to their assigned permission level</li>
                <li>You will not attempt to access documents outside your authorized scope</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                5. AI Processing and Analysis
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Our AI document intelligence service:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Processes your documents to provide intelligent search and analysis</li>
                <li>Does not retain copies of your content beyond what's necessary for the service</li>
                <li>Uses industry-leading AI models with appropriate safeguards</li>
                <li>Provides analysis and insights based on your uploaded documents only</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Subscription and Billing
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Subscription terms include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Monthly or annual billing cycles as selected during signup</li>
                <li>Automatic renewal unless cancelled before the renewal date</li>
                <li>Pro-rated charges for plan upgrades during billing cycles</li>
                <li>30-day money-back guarantee for new subscribers</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Limitation of Liability
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                In no event shall Document Intelligence or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the platform, even if Document Intelligence or an authorized representative has been notified orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Termination
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Either party may terminate this agreement at any time. Upon termination:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Your access to the platform will be immediately suspended</li>
                <li>You may export your data within 30 days of termination</li>
                <li>All data will be permanently deleted after the 30-day grace period</li>
                <li>Refunds will be provided according to our refund policy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Changes to Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Document Intelligence reserves the right to revise these terms of service at any time. By using this platform, you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Contact Information
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">
                                      <strong>Email:</strong> legal@docuintel.com<br/>
                  <strong>Address:</strong> Document Intelligence Legal Department<br/>
                  123 Innovation Drive<br/>
                  Tech City, TC 12345
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
