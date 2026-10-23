"""Load every route at phone size; report console errors, page errors and failed requests; screenshot each."""
import json
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:4173'
OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

ROUTES = [
    '/welcome', '/', '/services', '/services/lords_day_service', '/services/burial', '/hymns', '/hymns/5', '/hymns/17',
    '/hymns?section=easter', '/bible', '/bible/john/3?v=16', '/bible/psalms/23?lang=yo1900', '/bible/genesis/1?lang=yo&sbs=true',
    '/lessons', '/devotion', '/devotion?service=morning_service', '/suggestions', '/notes', '/notes?tab=prayers',
    '/notes?tab=backup', '/constitution', '/our-church', '/profile', '/prayer-requests', '/articles', '/articles/write',
    '/events', '/directory', '/give', '/live', '/quiz', '/quiz?topic=doctrine', '/quiz?topic=hymns&mode=challenge', '/quiz?daily=1', '/maps',
    '/maps?game=journey', '/maps?game=lands', '/maps?game=paul', '/maps?game=letters', '/learn', '/stories', '/stories/bs-01',
    '/stories/cl-nt-48', '/today', '/studio', '/moderate', '/library', '/structure',
    '/people/00000000-0000-0000-0000-000000000000', '/bible/john/3?lang=fr',
    '/parish-admin', '/control', '/display', '/signin', '/nonexistent-page',
    # The same app in the other languages
    '/@fr', '/learn@fr', '/structure@fr', '/directory@yo', '/services/lords_day_service@yo', '/profile@egun', '/welcome@fr',
]
# "Something went wrong" in each language
CRASH = ('Something went wrong', 'Une erreur s’est produite', 'Nǹkan kan ṣẹlẹ̀ tí kò tọ́')

results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    # Behave like a returning member so Home doesn't redirect to onboarding
    ctx.add_init_script("""
      if (!location.pathname.startsWith('/welcome')) {
        localStorage.setItem('cw-profile', JSON.stringify({displayName:'Test Member', onboardedAt:'2026-10-01T00:00:00Z'}));
      }
    """)
    for entry in ROUTES:
        route, _, lang = entry.partition('@')
        page = ctx.new_page()
        if lang:
            page.add_init_script(f"localStorage.setItem('cw-ui-language', '{lang}')")
        errors, failed = [], []
        # "Failed to load resource" repeats a failed request, which is tracked (with its URL) below
        page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' and not m.text.startswith('Failed to load resource') else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('requestfailed', lambda r: failed.append(f'{r.url} {r.failure}'))
        page.on('response', lambda r: failed.append(f'{r.status} {r.url}') if r.status >= 400 and 'localhost' in r.url else None)
        t = time.time()
        try:
            page.goto(BASE + route, wait_until='networkidle', timeout=20000)
        except Exception as e:
            errors.append(f'goto: {e}')
        page.wait_for_timeout(600)
        text = page.inner_text('body')[:200].replace('\n', ' | ')
        crashed = any(c in page.inner_text('body') for c in CRASH)
        name = (route.strip('/') + (f'@{lang}' if lang else '')).replace('/', '_').replace('?', '_').replace('=', '-').replace('&', '_') or 'home'
        page.screenshot(path=str(OUT / f'{name}.png'), full_page=False)
        # Horizontal overflow at phone width is a layout bug
        overflow = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        results.append({'route': entry, 'ms': int((time.time() - t) * 1000), 'crashed': crashed, 'overflow_px': overflow,
                        'errors': errors[:6], 'failed': [f for f in failed if 'supabase' not in f and 'fonts.g' not in f][:6], 'text': text})
        page.close()
    browser.close()

(OUT / 'results.json').write_text(json.dumps(results, indent=1), encoding='utf-8')
for r in results:
    flag = 'CRASH' if r['crashed'] else ('ERR' if r['errors'] or r['failed'] else 'ok')
    print(f"{flag:5} {r['route']:45} {r['ms']:5}ms overflow={r['overflow_px']}")
    for e in r['errors'] + r['failed']:
        print('       ', e[:220])
