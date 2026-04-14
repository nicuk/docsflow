import Link from "next/link"
import DocsFlowBrand from "@/components/DocsFlowBrand"

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <DocsFlowBrand size="sm" variant="horizontal" />
            <p className="text-sm text-muted-foreground">
              Enterprise-grade AI solutions for organizations that demand security, customization, and control.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold">Product</h3>
            <nav aria-label="Product Navigation">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/#features" className="text-muted-foreground hover:text-foreground">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/#use-cases" className="text-muted-foreground hover:text-foreground">
                    Use Cases
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
                    Pricing
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold">Resources</h3>
            <nav aria-label="Resources Navigation">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/docs" className="text-muted-foreground hover:text-foreground">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-muted-foreground hover:text-foreground">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <a href="mailto:support@docsflow.app" className="text-muted-foreground hover:text-foreground">
                    Support
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold">Legal</h3>
            <nav aria-label="Legal Navigation">
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© {currentYear} DocsFlow. All rights reserved.</p>
          <div className="flex gap-4">
            <Link
              href="https://github.com/nicuk/docsflow"
              className="text-muted-foreground hover:text-foreground"
              aria-label="DocsFlow on GitHub"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                <path d="M9 18c-4.51 2-5-2-7-2"></path>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
