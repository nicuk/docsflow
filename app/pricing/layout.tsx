import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing | DocsFlow - AI Document Intelligence',
  description:
    'DocsFlow pricing starts at $99/month. AI-powered document search with source citations, role-based access, and custom AI training. All plans include white-glove setup.',
  alternates: {
    canonical: 'https://docsflow.app/pricing',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
