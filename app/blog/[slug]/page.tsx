import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { useMDXComponents } from '@/components/blog/mdx-components';
import CtaBanner from '@/components/blog/cta-banner';
import Link from 'next/link';

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} | DocsFlow Blog`,
    description: post.description,
    alternates: {
      canonical: `https://docsflow.app/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://docsflow.app/blog/${post.slug}`,
      siteName: 'DocsFlow',
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

function ArticleSchema(post: {
  title: string;
  description: string;
  date: string;
  author: string;
  slug: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'DocsFlow',
      url: 'https://docsflow.app',
      logo: {
        '@type': 'ImageObject',
        url: 'https://docsflow.app/logo.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://docsflow.app/blog/${post.slug}`,
    },
  };
}

function BreadcrumbSchema(post: { title: string; slug: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://docsflow.app' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://docsflow.app/blog' },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `https://docsflow.app/blog/${post.slug}`,
      },
    ],
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const components = useMDXComponents();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ArticleSchema(post)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BreadcrumbSchema(post)) }}
      />

      <article className="py-12 md:py-16">
        <div className="container px-4 md:px-6 max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <span>/</span>
            <span className="text-foreground truncate">{post.title}</span>
          </nav>

          {/* Header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {post.category}
              </span>
              <span className="text-sm text-muted-foreground">{post.readTime}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
              {post.title}
            </h1>
            <p className="text-xl text-muted-foreground mb-6">{post.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground border-t border-b py-4">
              <span>By {post.author}</span>
              <span>|</span>
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
          </header>

          {/* MDX Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-pre:bg-muted">
            <MDXRemote source={post.content} components={components} />
          </div>

          {/* Bottom CTA */}
          <CtaBanner />
        </div>
      </article>
    </>
  );
}
