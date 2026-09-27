import type { ReactNode } from 'react';

/**
 * Wrap every case-insensitive occurrence of `highlight` in `content` with
 * <mark>, returning React nodes rather than an HTML string.
 *
 * Document text is untrusted: anyone who can upload writes it. Returning nodes
 * means React renders it as text, so markup in a document (a <script>, an
 * <img onerror>) is shown, never run. `highlight` is matched literally.
 */
export function highlightMatches(content: string, highlight?: string): ReactNode {
  if (!highlight) return content;

  const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = content.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
