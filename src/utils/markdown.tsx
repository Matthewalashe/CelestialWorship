import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { parseReference, referenceToPath } from './parseReference';

/**
 * Minimal, safe Markdown for user-written articles: headings (#, ##, ###), paragraphs,
 * **bold**, *italic*, > quotes, - and 1. lists, [links](https://…), and Bible references
 * such as "John 3:16" or "1 Cor 13:4-7", which become links into the Bible reader.
 * Output is React elements only, no raw HTML is ever injected.
 */

const BOOK_WORD = '(?:[1-3]\\s?)?[A-Z][a-z]+(?:\\s(?:of\\s)?[A-Z][a-z]+)?';
const REF_PATTERN = new RegExp(`\\b(${BOOK_WORD}\\.?\\s\\d{1,3}:\\d{1,3}(?:\\s?[-–]\\s?\\d{1,3})?)`, 'g');

function linkReferences(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(REF_PATTERN)) {
    const ref = parseReference(match[1].replace('.', ''));
    if (!ref) continue;
    if (match.index! > last) out.push(text.slice(last, match.index));
    out.push(
      <Link key={`${keyBase}-r${match.index}`} to={referenceToPath(ref)} className="font-semibold underline decoration-dotted"
            style={{ color: 'var(--color-accent-brand)' }}>{match[1]}</Link>
    );
    last = match.index! + match[1].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Links, bold, italic, in that order of precedence
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index! > last) out.push(...linkReferences(text.slice(last, m.index), `${keyBase}-t${i}`));
    const key = `${keyBase}-i${i++}`;
    if (m[1]) out.push(<a key={key} href={m[2]} target="_blank" rel="noopener noreferrer nofollow" className="underline" style={{ color: 'var(--color-accent-brand)' }}>{m[1]}</a>);
    else if (m[3]) out.push(<strong key={key}>{linkReferences(m[3], key)}</strong>);
    else if (m[4]) out.push(<em key={key}>{linkReferences(m[4], key)}</em>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(...linkReferences(text.slice(last), `${keyBase}-end`));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const cls = level === 1 ? 'text-[1.45em]' : level === 2 ? 'text-[1.25em]' : 'text-[1.1em]';
      blocks.push(<p key={key++} role="heading" aria-level={level + 1} className={`${cls} font-bold mt-6 mb-2 leading-snug`} style={{ color: 'var(--color-text-primary)' }}>{inline(heading[2], `h${key}`)}</p>);
      i++;
      continue;
    }

    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) quote.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(
        <blockquote key={key++} className="border-l-4 pl-4 my-4 italic" style={{ borderColor: 'var(--color-accent-gold)', color: 'var(--color-text-secondary)' }}>
          {quote.map((q, j) => <p key={j}>{inline(q, `q${key}-${j}`)}</p>)}
        </blockquote>
      );
      continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag key={key++} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-6 my-3 space-y-1`}>
          {items.map((it, j) => <li key={j}>{inline(it, `l${key}-${j}`)}</li>)}
        </ListTag>
      );
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={key++} className="my-3">
        {para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p, `p${key}-${j}`)}</Fragment>)}
      </p>
    );
  }

  return <div className="leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>{blocks}</div>;
}

/** Plain-text preview of Markdown, for cards */
export function markdownExcerpt(source: string, length = 180): string {
  const plain = source.replace(/[#>*_[\]()-]/g, ' ').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > length ? `${plain.slice(0, length).trimEnd()}…` : plain;
}
