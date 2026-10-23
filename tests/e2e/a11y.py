"""Accessibility check (WCAG 2.2 AA, PRINCIPLES §4): runs axe-core on every main route at phone size
and lists serious and critical problems.

    python tests/e2e/a11y.py
"""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = 'http://localhost:4173'
AXE = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js'
ROUTES = ['/', '/services', '/services/lords_day_service', '/hymns', '/hymns/5', '/bible', '/bible/john/3', '/devotion', '/learn',
          '/stories', '/stories/bs-01', '/articles', '/events', '/directory', '/give', '/live', '/quiz', '/maps', '/notes', '/profile',
          '/our-church', '/constitution', '/lessons', '/prayer-requests']

failures = 0
with sync_playwright() as p:
    browser = p.chromium.launch()
    # Reduced motion: measure colours, not a loading pulse caught mid-fade
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    ctx.add_init_script("localStorage.setItem('cw-profile', JSON.stringify({displayName:'Test Member', onboardedAt:'2026-10-01T00:00:00Z'}));")
    page = ctx.new_page()
    for route in ROUTES:
        page.goto(BASE + route, wait_until='networkidle')
        page.wait_for_timeout(500)
        page.add_script_tag(url=AXE)
        result = page.evaluate("""async () => {
          const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
          return r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
            .map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].target.join(' ') }));
        }""")
        failures += len(result)
        print(f"{'ok ' if not result else 'ERR'} {route}")
        for v in result:
            print(f"      {v['impact']:8} {v['id']} ×{v['n']}  e.g. {v['sample'][:110]}")
    browser.close()
sys.exit(1 if failures else 0)
