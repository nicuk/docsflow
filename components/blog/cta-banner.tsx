import Link from 'next/link';

interface CtaBannerProps {
  variant?: 'default' | 'compact';
}

export default function CtaBanner({ variant = 'default' }: CtaBannerProps) {
  if (variant === 'compact') {
    return (
      <div className="my-8 p-6 bg-primary/5 border border-primary/20 rounded-xl text-center">
        <p className="font-semibold text-foreground mb-2">
          Ready to stop searching and start finding?
        </p>
        <Link
          href="/#contact"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Try DocsFlow Free
        </Link>
      </div>
    );
  }

  return (
    <div className="my-12 p-8 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl">
      <div className="max-w-2xl mx-auto text-center">
        <h3 className="text-2xl font-bold text-foreground mb-3">
          Stop Searching. Start Finding.
        </h3>
        <p className="text-muted-foreground mb-6">
          Upload your documents and get AI-powered answers in minutes.
          No coding, no IT department, no complex setup.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/#contact"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg"
          >
            Book a Free Demo
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-primary/30 text-foreground rounded-lg font-medium hover:bg-primary/5 transition-colors"
          >
            See Pricing
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          No credit card required. Setup takes less than 5 minutes.
        </p>
      </div>
    </div>
  );
}
