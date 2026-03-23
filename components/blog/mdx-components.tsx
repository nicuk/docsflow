import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import CtaBanner from './cta-banner';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function HeadingWithAnchor({
  as: Tag,
  children,
  ...props
}: {
  as: 'h2' | 'h3';
  children: React.ReactNode;
  [key: string]: any;
}) {
  const text = typeof children === 'string' ? children : '';
  const id = slugify(text);

  return (
    <Tag id={id} className="scroll-mt-24 group" {...props}>
      <a href={`#${id}`} className="no-underline">
        {children}
        <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-primary">
          #
        </span>
      </a>
    </Tag>
  );
}

function Callout({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warning' | 'tip' }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
    tip: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800',
  };

  const icons = { info: 'ℹ️', warning: '⚠️', tip: '💡' };

  return (
    <div className={`my-6 p-4 border-l-4 rounded-r-lg ${styles[type]}`}>
      <span className="mr-2">{icons[type]}</span>
      {children}
    </div>
  );
}

export function useMDXComponents(): MDXComponents {
  return {
    h2: (props: any) => <HeadingWithAnchor as="h2" {...props} />,
    h3: (props: any) => <HeadingWithAnchor as="h3" {...props} />,
    a: ({ href, children, ...props }: any) => {
      if (href?.startsWith('/') || href?.startsWith('#')) {
        return (
          <Link href={href} className="text-primary hover:underline font-medium" {...props}>
            {children}
          </Link>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium" {...props}>
          {children}
        </a>
      );
    },
    blockquote: (props: any) => (
      <blockquote className="border-l-4 border-primary/30 pl-4 my-6 italic text-muted-foreground" {...props} />
    ),
    table: (props: any) => (
      <div className="overflow-x-auto my-6">
        <table className="w-full border-collapse border border-border rounded-lg" {...props} />
      </div>
    ),
    th: (props: any) => (
      <th className="bg-muted/50 px-4 py-3 text-left text-sm font-semibold border border-border" {...props} />
    ),
    td: (props: any) => (
      <td className="px-4 py-3 text-sm border border-border" {...props} />
    ),
    CtaBanner,
    Callout,
  };
}
