/**
 * Sharing pictures (Open Graph images), drawn on demand at the edge:
 *   /api/og?title=…&sub=…&kind=…
 * Used by middleware.ts for articles, broadcasts, hymns, Bible chapters and other pages.
 */
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export default function handler(req: Request) {
  const url = new URL(req.url);
  const title = clip(url.searchParams.get('title') || 'CelestialWorship', 90);
  const sub = clip(url.searchParams.get('sub') || '', 130);
  const kind = clip(url.searchParams.get('kind') || 'CelestialWorship', 30);
  const live = /live/i.test(kind);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    padding: '64px 72px', background: 'linear-gradient(135deg, #0A1628 0%, #13265C 60%, #2539C7 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', padding: '8px 18px', borderRadius: 999, fontSize: 26, fontWeight: 700, letterSpacing: 2,
                        background: live ? '#EF4444' : 'rgba(212,168,67,0.18)', color: live ? '#fff' : '#E8C36A' }}>
            {kind.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: title.length > 50 ? 60 : 76, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1 }}>{title}</div>
          {sub && <div style={{ fontSize: 32, lineHeight: 1.3, color: 'rgba(255,255,255,0.78)' }}>{sub}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 28, color: 'rgba(255,255,255,0.85)' }}>
          <img src={`${url.origin}/pwa-192x192.png`} width={56} height={56} style={{ borderRadius: 14 }} />
          <span style={{ fontWeight: 700 }}>CelestialWorship</span>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>· Celestial Church of Christ</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'cache-control': 'public, max-age=86400, s-maxage=604800, immutable' } },
  );
}
