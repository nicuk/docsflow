import { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog';
import BlogCard from '@/components/blog/blog-card';

export const metadata: Metadata = {
  title: 'Blog | DocsFlow - AI Document Intelligence Insights',
  description:
    'Practical guides for business leaders on AI document search, RAG technology, and turning document chaos into instant answers. No jargon, just results.',
  alternates: {
    canonical: 'https://docsflow.app/blog',
  },
  openGraph: {
    title: 'DocsFlow Blog - AI Document Intelligence for Business Leaders',
    description:
      'Practical guides on AI document search, knowledge bases, and eliminating document chaos. Written for decision-makers, not developers.',
    url: 'https://docsflow.app/blog',
    siteName: 'DocsFlow',
    type: 'website',
  },
};

function BlogCollectionSchema(posts: { title: string; slug: string; description: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'DocsFlow Blog',
    description: 'Practical guides for business leaders on AI document search and knowledge management.',
    url: 'https://docsflow.app/blog',
    publisher: {
      '@type': 'Organization',
      name: 'DocsFlow',
      url: 'https://docsflow.app',
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://docsflow.app/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(BlogCollectionSchema(posts)),
        }}
      />
      <section className="py-16 md:py-20">
        <div className="container px-4 md:px-6 max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              DocsFlow Blog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Practical guides for business leaders who want AI-powered answers from
              their documents — without building anything from scratch.
            </p>
          </div>

          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground">No posts yet. Check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
