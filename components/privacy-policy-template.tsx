interface PrivacyPolicyTemplateProps {
  companyName: string
  websiteUrl: string
  contactEmail: string
  contactAddress: string
  lastUpdated: string
  includeGDPR?: boolean
  includeCCPA?: boolean
  includeCookies?: boolean
  includeAnalytics?: boolean
  includeThirdPartyServices?: string[]
}

export default function PrivacyPolicyTemplate({
  companyName,
  websiteUrl,
  contactEmail,
  contactAddress,
  lastUpdated,
  includeGDPR = true,
  includeCCPA = true,
  includeCookies = true,
  includeAnalytics = true,
  includeThirdPartyServices = [],
}: PrivacyPolicyTemplateProps) {
  return (
    <div className="prose prose-blue max-w-none dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>Last Updated: {lastUpdated}</p>

      <p>
        At {companyName}, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose,
        and safeguard your information when you visit our website {websiteUrl} and use our services. Please read this
        privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access our
        website or use our services.
      </p>

      <h2>Information We Collect</h2>
      <p>
        We collect information that you provide directly to us when you register for an account, create or modify your
        profile, set preferences, sign-up for or make purchases through our services. This information may include:
      </p>
      <ul>
        <li>Personal identifiers (name, email address, phone number)</li>
        <li>Account credentials (username, password)</li>
        <li>Billing information (credit card details, billing address)</li>
        <li>Company information (company name, size, industry)</li>
        <li>User-generated content (prompts, queries, feedback)</li>
        <li>Usage data (features used, interaction patterns)</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>We may use the information we collect for various purposes, including to:</p>
      <ul>
        <li>Provide, maintain, and improve our services</li>
        <li>Process transactions and send related information</li>
        <li>Send administrative messages, updates, security alerts, and support messages</li>
        <li>Respond to your comments, questions, and requests</li>
        <li>Personalize your experience and deliver content relevant to your interests</li>
        <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
        <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h3>GDPR Compliance - Lawful Basis for Processing</h3>
      <p>If you are in the European Economic Area (EEA) or UK:</p>
      <ul>
        <li><strong>Lawful Basis:</strong> Processing is based on contract (to provide the Service), legitimate interest (improving features), or consent (optional analytics).</li>
        <li><strong>Your Rights:</strong> You may request access, correction, deletion, restriction, or portability of your data, or object to certain processing. You also have the right to lodge a complaint with your Supervisory Authority.</li>
      </ul>

      <h2>Data Storage and Security</h2>
      <p>
        We implement appropriate technical and organizational measures to protect the security of your personal
        information. However, please be aware that no security measures are perfect or impenetrable, and we cannot
        guarantee the security of your data transmitted to our services.
      </p>
      <p>
        Your data is stored on secure servers and we maintain strict access controls to protect your information. We use
        industry-standard encryption for data in transit and at rest.
      </p>

      <h2>Data Retention</h2>
      <p>
        Uploaded documents are retained until deleted by you or your account is closed. Other data is retained only as long as necessary for the purposes stated above, typically:
      </p>
      <ul>
        <li>Account data: For the duration of your account plus 30 days after closure</li>
        <li>Usage data: Up to 2 years for analytics purposes</li>
        <li>Legal compliance data: As required by applicable law</li>
      </ul>

      <h2>Data Sharing</h2>
      <p>We do not sell personal data. We may share with:</p>
      <ul>
        <li>
          <strong>Service providers</strong> (e.g., hosting and infrastructure).
        </li>
        <li>
          <strong>Legal authorities</strong> when required by law.
        </li>
        <li>
          <strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during
          negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our
          business.
        </li>
        <li>
          <strong>With Your Consent:</strong> We may disclose your information for any other purpose with your consent.
        </li>
      </ul>

      {includeThirdPartyServices.length > 0 && (
        <>
          <h2>Third-Party Services</h2>
          <p>We may use third-party services that collect, monitor and analyze data. These include:</p>
          <ul>
            {includeThirdPartyServices.map((service, index) => (
              <li key={index}>{service}</li>
            ))}
          </ul>
        </>
      )}

      {includeCookies && (
        <>
          <h2>Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our services and hold certain
            information. Cookies are files with a small amount of data that may include an anonymous unique identifier.
          </p>
          <p>We use cookies for the following purposes:</p>
          <ul>
            <li>To maintain your authenticated session and preferences</li>
            <li>To understand how you use our services</li>
            <li>To enhance the security of our services</li>
            <li>To personalize your experience</li>
            <li>To analyze the effectiveness of our marketing campaigns</li>
          </ul>
          <p>
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if
            you do not accept cookies, you may not be able to use some portions of our services.
          </p>
        </>
      )}

      {includeAnalytics && (
        <>
          <h2>Analytics</h2>
          <p>
            We may use third-party Service Providers to monitor and analyze the use of our services. These services help
            us understand how users interact with our services, which pages are visited most often, and how users
            navigate through our website. This information is used to improve our services and user experience.
          </p>
        </>
      )}

      <h2>Your Privacy Rights</h2>
      <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
      <ul>
        <li>The right to access personal information we hold about you</li>
        <li>The right to request correction of inaccurate personal information</li>
        <li>The right to request deletion of your personal information</li>
        <li>The right to object to processing of your personal information</li>
        <li>The right to data portability</li>
        <li>The right to withdraw consent</li>
      </ul>

      {includeGDPR && (
        <>
          <h3>GDPR Privacy Rights (For European Economic Area Residents)</h3>
          <p>
            If you are a resident of the European Economic Area (EEA), you have certain data protection rights under the
            General Data Protection Regulation (GDPR). We aim to take reasonable steps to allow you to correct, amend,
            delete, or limit the use of your Personal Information.
          </p>
          <p>Under the GDPR, you have the following specific rights:</p>
          <ul>
            <li>The right to access, update or delete the information we have on you</li>
            <li>
              The right of rectification - the right to have your information corrected if it is inaccurate or
              incomplete
            </li>
            <li>The right to object to our processing of your Personal Information</li>
            <li>
              The right of restriction - the right to request that we restrict the processing of your personal
              information
            </li>
            <li>
              The right to data portability - the right to be provided with a copy of your Personal Information in a
              structured, machine-readable and commonly used format
            </li>
            <li>
              The right to withdraw consent at any time where we relied on your consent to process your personal
              information
            </li>
          </ul>
          <p>
            To exercise these rights, please contact us using the contact information provided at the end of this
            Privacy Policy. You also have the right to lodge a complaint with your local Supervisory Authority if you believe we have not complied with data protection laws.
          </p>
        </>
      )}

      {includeCCPA && (
        <>
          <h3>CCPA Privacy Rights (For California Residents)</h3>
          <p>
            If you are a California resident, you have specific rights regarding your personal information under the
            California Consumer Privacy Act (CCPA). This section describes your CCPA rights and explains how to exercise
            those rights.
          </p>
          <p>Under the CCPA, you have the following rights:</p>
          <ul>
            <li>The right to know about the personal information we collect about you and how it is used and shared</li>
            <li>The right to delete personal information collected from you (with certain exceptions)</li>
            <li>The right to opt-out of the sale of your personal information</li>
            <li>The right to non-discrimination for exercising your CCPA rights</li>
          </ul>
          <p>
            To exercise these rights, please contact us using the contact information provided at the end of this
            Privacy Policy.
          </p>
        </>
      )}

      <h2>Children's Privacy</h2>
      <p>
        The Service is not directed to children under 13. We do not knowingly collect data from minors.
      </p>

      <h2>International Data Transfers</h2>
      <p>
        Data may be processed outside your jurisdiction. Where applicable, we rely on <strong>Standard Contractual Clauses (SCCs)</strong> to safeguard data transfers to countries without adequate data protection laws.
      </p>
      <p>
        For transfers from the EU/UK to third countries, we ensure appropriate safeguards are in place in accordance with GDPR requirements.
      </p>

      <h2>Changes to This Privacy Policy</h2>
      <p>
        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy
        Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
      </p>
      <p>
        You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are
        effective when they are posted on this page.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us at{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or by mail at:
      </p>
      <address>{contactAddress}</address>
    </div>
  )
}
