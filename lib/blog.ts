import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  readTime: string;
  tags: string[];
  content: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  readTime: string;
  tags: string[];
}

function parseMdxFile(filename: string): BlogPost {
  const filePath = path.join(BLOG_DIR, filename);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    slug: filename.replace(/\.mdx$/, ''),
    title: data.title || '',
    description: data.description || '',
    date: data.date || '',
    author: data.author || 'DocsFlow Team',
    category: data.category || 'General',
    readTime: data.readTime || '5 min read',
    tags: data.tags || [],
    content,
  };
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));

  const posts = files.map((filename) => {
    const post = parseMdxFile(filename);
    const { content: _, ...meta } = post;
    return meta;
  });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filename = `${slug}.mdx`;
  const filePath = path.join(BLOG_DIR, filename);

  if (!fs.existsSync(filePath)) return null;

  return parseMdxFile(filename);
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''));
}
