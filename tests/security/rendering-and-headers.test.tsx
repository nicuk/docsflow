import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { highlightMatches } from '@/lib/highlight';
import { buildForwardedHeaders } from '@/lib/forwarded-headers';

describe('highlightMatches', () => {
  const render = (content: string, highlight?: string) =>
    renderToStaticMarkup(<div>{highlightMatches(content, highlight)}</div>);

  it('renders markup in a document as text, never as HTML', () => {
    const html = render('hello <img src=x onerror=alert(1)> world', 'hello');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('<mark');
  });

  it('matches the highlight literally, including regex metacharacters', () => {
    const html = render('price (USD) a.b', '(USD)');
    expect(html).toContain('<mark class="bg-yellow-200 dark:bg-yellow-800">(USD)</mark>');
    expect(render('aXb', 'a.b')).not.toContain('<mark');
  });
});

describe('buildForwardedHeaders', () => {
  it('always drops a client-sent x-user-id', () => {
    const out = buildForwardedHeaders(new Headers({ 'x-user-id': 'user_victim' }), { tenant: null, tenantId: null });
    expect(out.get('x-user-id')).toBeNull();
  });

  it('lets the hostname tenant override a client-sent one', () => {
    const out = buildForwardedHeaders(
      new Headers({ 'x-tenant-subdomain': 'victimco', 'x-tenant-id': 'uuid-victim' }),
      { tenant: 'acme', tenantId: 'uuid-acme' },
    );
    expect(out.get('x-tenant-subdomain')).toBe('acme');
    expect(out.get('x-tenant-id')).toBe('uuid-acme');
  });

  it('drops a client tenant id when the hostname tenant could not be resolved', () => {
    const out = buildForwardedHeaders(new Headers({ 'x-tenant-id': 'uuid-victim' }), { tenant: 'acme', tenantId: null });
    expect(out.get('x-tenant-id')).toBeNull();
  });
});
