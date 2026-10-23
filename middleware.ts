/**
 * Sharing previews and SEO for a single-page app (Vercel Routing Middleware, runs at the edge).
 *
 * WhatsApp, Facebook, X, Telegram and search engines read a page's <head> without running the app.
 * For pages that have their own title — an article, a broadcast, a hymn, a story, a parish, a Bible
 * chapter, a service — this puts the right title, description, picture and structured data into
 * index.html before it is sent. Everything else gets the default head.
 */

export const config = {
  matcher: [
    '/articles/:id', '/live/:id', '/hymns/:number', '/stories/bs-:n', '/stories/cl-:rest',
    '/directory/:id', '/bible/:book/:chapter', '/services/:id', '/lessons/:date', '/people/:id',
    '/library', '/structure', '/directory', '/install',
    '/stories', '/learn', '/quiz', '/maps', '/events', '/live', '/articles', '/our-church', '/constitution', '/hymns', '/bible', '/services', '/devotion',
  ],
};

const SITE = 'CelestialWorship';
// Printable ASCII only: a pasted value can carry an invisible byte-order mark
const clean = (v: string | undefined) => v?.replace(/[^\x21-\x7E]/g, '') || undefined;
const SUPABASE_URL = clean(process.env.VITE_SUPABASE_URL) || 'https://cwguzsvmghowmnfkovyx.supabase.co';
const SUPABASE_ANON = clean(process.env.VITE_SUPABASE_ANON_KEY)
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Z3V6c3ZtZ2hvd21uZmtvdnl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MzAzNTUsImV4cCI6MjEwMjIwNjM1NX0.dgRxebcfnTK7-IHwE2Zqwh09OE4DoEZnLbRxDr7fswg';

interface Meta { title: string; description: string; image?: string; kind?: string; type?: string; jsonLd?: object }

const STATIC: Record<string, Meta> = {
  '/stories': { title: 'Bible stories for children', description: '136 Bible stories for children, with pictures and questions — from the Creation to the early Church.', kind: 'Stories' },
  '/learn': { title: 'Learn', description: 'Bible stories for children, lessons, articles by shepherds, the history and Constitution of the Celestial Church of Christ, quizzes and Bible maps.', kind: 'Learn' },
  '/quiz': { title: 'Quizzes', description: 'Bible, hymn, doctrine and Constitution quizzes with a daily challenge.', kind: 'Quiz' },
  '/maps': { title: 'Bible map games', description: 'Walk where Jesus and Paul walked: Bible places on old and modern maps, and their names today.', kind: 'Maps' },
  '/events': { title: 'Church calendar', description: 'Observances of the Celestial Church of Christ and parish events — Imeko, Harvest, Holy Week and more.', kind: 'Events' },
  '/live': { title: 'Live services', description: 'Watch services and ministrations streaming live from Celestial parishes and shepherds.', kind: 'Live' },
  '/articles': { title: 'Articles', description: 'Teaching, Bible commentaries and devotionals by shepherds of the Celestial Church of Christ.', kind: 'Articles' },
  '/our-church': { title: 'Our Church', description: 'The history, beliefs and practice of the Celestial Church of Christ.', kind: 'Our Church' },
  '/constitution': { title: 'The Constitution', description: 'How the Celestial Church of Christ is founded, led and organised.', kind: 'Constitution' },
  '/hymns': { title: 'CCC Hymnal', description: '457 Celestial Church of Christ hymns in Yorùbá and English, with sol-fa.', kind: 'Hymnal' },
  '/bible': { title: 'Holy Bible', description: 'The King James Bible in English and the Bible in Yorùbá, with highlights, notes and reading plans.', kind: 'Bible' },
  '/services': { title: 'Order of Service', description: 'The liturgy of the Celestial Church of Christ, step by step, with hymns and readings.', kind: 'Service' },
  '/install': { title: 'Get the app for Android and iPhone', description: 'Install CelestialWorship free on Android or iPhone, straight from the browser: the CCC Hymnal, the Bible, the Order of Service and daily devotion, working offline.', kind: 'Get the app' },
  '/library': { title: 'Library', description: 'Articles and commentaries by shepherds, books and resources for the Celestial Church of Christ.', kind: 'Library' },
  '/structure': { title: 'Ranks, structure & symbols', description: 'The ranks and robes of the Celestial Church of Christ, how the Church is governed, and the meaning of its emblem, altar, candles and colours.', kind: 'Our Church' },
  '/directory': { title: 'Parishes', description: 'Celestial Church of Christ parishes and ministries around the world, by continent, country and state, with addresses and shepherds.', kind: 'Parishes' },
  '/devotion': { title: 'Daily devotion', description: 'Pray the Order of Service at home, step by step, with readings and hymns.', kind: 'Devotion' },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s: string, n = 180) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const plain = (md: string) => md.replace(/[#>*_`[\]()!-]+/g, ' ').replace(/\s+/g, ' ').trim();

async function rest(path: string): Promise<any[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

let hymnCache: any[] | null = null;
async function hymns(origin: string) {
  if (!hymnCache) {
    try { const d = await (await fetch(`${origin}/data/hymns.json`)).json(); hymnCache = Array.isArray(d) ? d : d.hymns ?? []; }
    catch { hymnCache = []; }
  }
  return hymnCache!;
}

const titleCase = (s: string) => s.replace(/(^|\s)\S/g, c => c.toUpperCase());

async function metaFor(url: URL): Promise<Meta | null> {
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const origin = url.origin;
  if (parts.length === 1) return STATIC[`/${parts[0]}`] ?? null;
  const [section, id, extra] = parts;

  switch (section) {
    case 'articles': {
      if (!/^[0-9a-f-]{36}$/.test(id)) return null;
      const [a] = await rest(`articles?id=eq.${id}&status=eq.published&select=title,summary,body,author_name,published_at,kind`);
      if (!a) return null;
      const description = clip(a.summary || plain(a.body));
      return {
        title: a.title, description, kind: 'Article', type: 'article',
        jsonLd: { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description, datePublished: a.published_at, author: { '@type': 'Person', name: a.author_name }, publisher: { '@type': 'Organization', name: SITE } },
        image: `${origin}/api/og?${new URLSearchParams({ title: a.title, sub: `by ${a.author_name}`, kind: 'Article' })}`,
      };
    }
    case 'live': {
      if (!/^[0-9a-f-]{36}$/.test(id)) return null;
      const [s] = await rest(`livestreams?id=eq.${id}&select=title,description,status,scheduled_at,started_at,parish_id`);
      if (!s) return null;
      const [p] = await rest(`parish_directory?id=eq.${s.parish_id}&select=name`);
      const when = s.status === 'live' ? 'Live now' : s.scheduled_at ? new Date(s.scheduled_at).toUTCString().slice(0, 22) : 'Broadcast';
      return {
        title: `${s.title} — ${p?.name ?? 'Live'}`, description: clip(s.description || `${when}. Watch with us on ${SITE}.`), kind: s.status === 'live' ? '● LIVE' : 'Broadcast', type: 'video.other',
        jsonLd: { '@context': 'https://schema.org', '@type': 'BroadcastEvent', name: s.title, isLiveBroadcast: true, startDate: s.started_at ?? s.scheduled_at, publishedOn: { '@type': 'BroadcastService', name: p?.name } },
        image: `${origin}/api/og?${new URLSearchParams({ title: s.title, sub: `${p?.name ?? ''} · ${when}`, kind: s.status === 'live' ? 'LIVE' : 'Broadcast' })}`,
      };
    }
    case 'directory': {
      if (!/^[0-9a-f-]{36}$/.test(id)) return null;
      const [p] = await rest(`parish_directory?id=eq.${id}&select=name,city,country,shepherd_name,kind,cover_url`);
      if (!p) return null;
      const where = [p.city, p.country].filter(Boolean).join(', ');
      return {
        title: p.name, description: clip(`${p.kind === 'ministry' ? 'Ministry' : 'Celestial Church of Christ parish'}${where ? ` in ${where}` : ''}${p.shepherd_name ? `. Shepherd: ${p.shepherd_name}` : ''}. Services, events, livestreams and giving.`),
        kind: p.kind === 'ministry' ? 'Ministry' : 'Parish', image: p.cover_url || undefined,
        jsonLd: { '@context': 'https://schema.org', '@type': 'Church', name: p.name, address: where },
      };
    }
    case 'people': {
      if (!/^[0-9a-f-]{36}$/.test(id)) return null;
      const [p] = await rest(`public_profiles?id=eq.${id}&select=display_name,church_title,rank,office,office_scope,bio,avatar_url`);
      if (!p || !p.display_name) return null;
      const name = [p.church_title, p.display_name].filter(Boolean).join(' ');
      const role = [p.rank, [p.office, p.office_scope].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
      return {
        title: name, description: clip(p.bio || role || 'Member of the Celestial Church of Christ'), kind: 'Profile', type: 'profile', image: p.avatar_url || undefined,
        jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name, jobTitle: role || undefined },
      };
    }
    case 'hymns': {
      const h = (await hymns(origin)).find((x: any) => String(x.number) === id);
      if (!h) return null;
      const first = (h.verses?.[0]?.yoruba_lines ?? h.verses?.[0]?.yorubaLines ?? []).slice(0, 2).join(' / ');
      const title = `CCC Hymn ${h.number} — ${h.yoruba_title || h.english_title}`;
      return { title, description: clip(`${first}${h.english_title ? ` · ${h.english_title}` : ''}. Lyrics in Yorùbá and English.`), kind: `Hymn ${h.number}`,
               image: `${origin}/api/og?${new URLSearchParams({ title: h.yoruba_title || h.english_title || `Hymn ${h.number}`, sub: h.english_title ?? '', kind: `Hymn ${h.number}` })}` };
    }
    case 'stories': {
      if (!/^(bs|cl)-[a-z0-9-]+$/.test(id)) return null;
      try {
        const s = await (await fetch(`${origin}/data/stories/${id}.json`)).json();
        return { title: `${s.title} — Bible stories`, description: clip(s.paragraphs?.[0] ?? ''), kind: `Story ${s.number}`, type: 'article',
                 image: s.image?.src ? `${origin}${s.image.src}` : undefined };
      } catch { return null; }
    }
    case 'bible': {
      const book = titleCase(id.replace(/-/g, ' '));
      const chapter = Number(extra);
      if (!chapter) return null;
      let first = '';
      try {
        const d = await (await fetch(`${origin}/data/bible/en/${book.replace(/\s+/g, '')}.json`)).json();
        first = d.chapters?.find((c: any) => Number(c.chapter) === chapter)?.verses?.[0]?.text ?? '';
      } catch { /* no data */ }
      return { title: `${book} ${chapter} (KJV)`, description: clip(first ? `“${first}” — ${book} ${chapter}:1` : `Read ${book} chapter ${chapter} in the King James Version and in Yorùbá.`),
               kind: 'Bible', image: `${origin}/api/og?${new URLSearchParams({ title: `${book} ${chapter}`, sub: clip(first, 120), kind: 'Holy Bible' })}` };
    }
    case 'services': {
      const name = titleCase(id.replace(/_/g, ' '));
      return { title: `${name} — Order of Service`, description: `The order of the ${name} of the Celestial Church of Christ, step by step, with hymns and readings.`, kind: 'Order of Service' };
    }
    case 'lessons':
      return /^\d{4}-\d{2}-\d{2}$/.test(id) ? { title: `Bible lessons for ${id}`, description: 'The readings of the Celestial Church of Christ for this day.', kind: 'Bible lessons' } : null;
  }
  return null;
}

function inject(html: string, url: URL, m: Meta): string {
  const title = `${m.title} | ${SITE}`;
  const image = m.image ?? `${url.origin}/api/og?${new URLSearchParams({ title: m.title, sub: clip(m.description, 110), kind: m.kind ?? SITE })}`;
  const canonical = `${url.origin}${url.pathname}`;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="${m.type ?? 'website'}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    m.jsonLd ? `<script type="application/ld+json">${JSON.stringify(m.jsonLd).replace(/</g, '\\u003c')}</script>` : '',
  ].join('\n    ');
  // Replace the defaults in index.html
  const cleaned = html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta (name|property)="(description|og:[a-z:]+|twitter:[a-z]+)"[^>]*>\s*/g, '')
    .replace(/<link rel="canonical"[^>]*>\s*/, '');
  return cleaned.replace('</head>', `    ${tags}\n  </head>`);
}

/** Let Vercel serve the request as if there were no middleware */
const passThrough = () => new Response(null, { headers: { 'x-middleware-next': '1' } });

export default async function middleware(request: Request): Promise<Response> {
  if (request.method !== 'GET') return passThrough();
  const url = new URL(request.url);
  let html: string;
  try {
    const page = await fetch(`${url.origin}/index.html`, { headers: { accept: 'text/html' } });
    if (!page.ok) return passThrough();
    html = await page.text();
  } catch {
    return passThrough();
  }
  let meta: Meta | null = null;
  try { meta = await metaFor(url); } catch { meta = null; }
  if (!meta) return passThrough();
  const body = inject(html, url, meta);
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Previews may be cached briefly at the edge; the app itself still updates through its service worker
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
