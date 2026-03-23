import Link from 'next/link';
import type { BlogPostMeta } from '@/lib/blog';

interface BlogCardProps {
  post: BlogPostMeta;
}

const categoryColors: Record<string, string> = {
  'Education': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Strategy': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'Comparison': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'ROI': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'Tutorial': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'General': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

export default function BlogCard({ post }: BlogCardProps) {
  const colorClass = categoryColors[post.category] || categoryColors['General'];

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="h-full bg-card border rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClass}`}>
            {post.category}
          </span>
          <span className="text-xs text-muted-foreground">{post.readTime}</span>
        </div>

        <h2 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h2>

        <p className="text-muted-foreground text-sm mb-4 flex-grow line-clamp-3">
          {post.description}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
          <span>{post.author}</span>
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        </div>
      </article>
    </Link>
  );
}
