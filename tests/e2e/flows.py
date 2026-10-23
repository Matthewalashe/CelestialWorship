"""End-to-end checks of the main flows against the local production build."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://localhost:4173'
OUT = Path(sys.argv[1])
results = []


def check(name, fn, page):
    try:
        fn(page)
        results.append(('PASS', name, ''))
    except Exception as e:
        results.append(('FAIL', name, str(e).split('\n')[0][:300]))
        page.screenshot(path=str(OUT / f'fail_{name.replace(" ", "_")}.png'))


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 390, 'height': 844})
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    def onboarding(pg):
        pg.goto(BASE + '/', wait_until='networkidle')
        expect(pg).to_have_url(BASE + '/welcome')
        pg.get_by_role('button', name='Get started').click()
        pg.get_by_role('button', name='Next').click()                      # languages
        pg.get_by_placeholder('e.g. Sister Funke Adeyemi').fill('Sister Test')
        pg.get_by_role('button', name='Next').click()                      # about
        pg.get_by_role('button', name='Next').click()                      # parish
        pg.get_by_role('button', name='Next').click()                      # reminders
        pg.get_by_role('button', name='Enter').click()                     # account
        expect(pg).to_have_url(BASE + '/')
        expect(pg.get_by_text('Verse of the Day')).to_be_visible()

    def highlight_and_save(pg):
        pg.goto(BASE + '/bible/john/3', wait_until='networkidle')
        pg.locator('#verse-16').click()
        pg.get_by_role('button', name='Highlight', exact=True).click()
        pg.get_by_role('button', name='Highlight Gold').click()
        pg.wait_for_timeout(300)
        pg.locator('#verse-16').click()
        pg.get_by_role('button', name='Save', exact=True).click()
        # The verse is written to the device first; the toast confirms it
        expect(pg.get_by_text('John 3:16 saved')).to_be_visible()
        pg.goto(BASE + '/notes?tab=saved', wait_until='networkidle')
        expect(pg.get_by_text('John 3:16').first).to_be_visible()
        pg.goto(BASE + '/notes?tab=highlights', wait_until='networkidle')
        expect(pg.get_by_text('John 3').first).to_be_visible()

    def note_on_verse(pg):
        pg.goto(BASE + '/bible/psalms/23', wait_until='networkidle')
        pg.locator('#verse-1').click()
        pg.get_by_role('button', name='Note', exact=True).click()
        pg.get_by_placeholder('Title').fill('The Lord is my shepherd')
        pg.get_by_placeholder('Write your thoughts', exact=False).fill('He provides everything I need.')
        pg.get_by_role('button', name='Save', exact=True).click()
        expect(pg.get_by_text('The Lord is my shepherd')).to_be_visible()
        pg.goto(BASE + '/bible/psalms/23', wait_until='networkidle')
        expect(pg.get_by_text('1 note on this chapter')).to_be_visible()

    def prayer_journal(pg):
        pg.goto(BASE + '/notes?tab=prayers', wait_until='networkidle')
        pg.get_by_role('button', name='Prayer').click()
        pg.get_by_placeholder('What are you praying for?').fill('Healing for Mama')
        pg.get_by_role('button', name='Save').click()
        expect(pg.get_by_text('Healing for Mama')).to_be_visible()
        pg.get_by_role('button', name='I prayed').click()
        expect(pg.get_by_text('I prayed · 1')).to_be_visible()

    def hymn_favourite(pg):
        pg.goto(BASE + '/hymns/5', wait_until='networkidle')
        pg.get_by_role('button', name='Add to favourites').click()
        pg.goto(BASE + '/hymns?fav=1', wait_until='networkidle')
        expect(pg.get_by_text('1 of', exact=False)).to_be_visible()
        expect(pg.locator('#hymn-row-5')).to_be_visible()

    def hymn_search(pg):
        pg.goto(BASE + '/hymns', wait_until='networkidle')
        pg.get_by_label('Search hymns').fill('kawa elese')
        pg.wait_for_timeout(600)
        expect(pg.locator('#hymn-row-5')).to_be_visible()

    def quiz_round(pg):
        pg.goto(BASE + '/quiz?topic=bible', wait_until='networkidle')
        for _ in range(10):
            pg.get_by_role('radio').first.click()
            pg.get_by_role('button', name='Next question').or_(pg.get_by_role('button', name='See my score')).click()
        expect(pg.get_by_role('button', name='Play again')).to_be_visible()
        expect(pg.get_by_text('XP').first).to_be_visible()

    def daily_challenge(pg):
        pg.goto(BASE + '/quiz?daily=1', wait_until='networkidle')
        for _ in range(5):
            pg.get_by_role('radio').first.click()
            pg.get_by_role('button', name='Next question').or_(pg.get_by_role('button', name='See my score')).click()
        expect(pg.get_by_role('button', name='Share')).to_be_visible()
        pg.goto(BASE + '/quiz', wait_until='networkidle')
        expect(pg.get_by_text('Done today')).to_be_visible()

    def reading_mode(pg):
        pg.goto(BASE + '/bible/john/1', wait_until='networkidle')
        pg.get_by_role('button', name='Reading mode').click()
        frame = pg.get_by_role('document', name='Reading: John 1')
        expect(frame).to_be_visible()
        pg.keyboard.press('ArrowRight')
        pg.get_by_role('button', name='Chapter 2').last.click()
        expect(pg.get_by_role('document', name='Reading: John 2')).to_be_visible()
        pg.goto(BASE + '/hymns/1', wait_until='networkidle')
        expect(pg.get_by_role('document', name='Reading: 1. ORIN AKOWOLE')).to_be_visible()  # the mode is remembered
        pg.get_by_role('button', name='Leave reading mode').click()
        expect(pg.get_by_role('document', name='Reading: 1. ORIN AKOWOLE')).to_have_count(0)

    def menu(pg):
        pg.goto(BASE + '/', wait_until='networkidle')
        pg.get_by_role('button', name='Menu').click()
        pg.get_by_role('link', name='Events').click()
        expect(pg).to_have_url(BASE + '/events')
        # Learn is a tab, and quizzes are inside it
        pg.get_by_role('link', name='Learn').last.click()
        pg.get_by_role('link', name='Quizzes').first.click()
        expect(pg).to_have_url(BASE + '/quiz')

    def stories(pg):
        pg.goto(BASE + '/stories', wait_until='networkidle')
        pg.get_by_role('link', name='Story 21 David and the Giant').click()
        expect(pg.get_by_role('heading', name='David and the Giant')).to_be_visible()
        expect(pg.get_by_text('Talk about it')).to_be_visible()
        pg.get_by_role('link', name='Best Friends: David and Jonathan').click()
        expect(pg).to_have_url(BASE + '/stories/bs-22')
        pg.goto(BASE + '/stories', wait_until='networkidle')
        expect(pg.get_by_label('Read').first).to_be_visible()  # read stories are ticked

    def music(pg):
        pg.goto(BASE + '/bible/john/1', wait_until='networkidle')
        pg.get_by_role('button', name='Turn music on').click()
        expect(pg.get_by_role('button', name='Turn music off')).to_be_visible()
        pg.goto(BASE + '/hymns', wait_until='networkidle')   # leaving the Bible stops it
        pg.goto(BASE + '/bible/john/1', wait_until='networkidle')
        expect(pg.get_by_role('button', name='Turn music on')).to_be_visible()

    def devotion(pg):
        pg.goto(BASE + '/devotion?service=morning_service', wait_until='networkidle')
        pg.get_by_role('button', name='Begin Devotion').click()
        for _ in range(40):
            done = pg.get_by_role('button', name='✓ Complete')
            if done.count():
                done.click()
                break
            pg.get_by_role('button', name='Next ›').click()
        expect(pg.get_by_text('Amen.')).to_be_visible()
        pg.goto(BASE + '/profile', wait_until='networkidle')
        expect(pg.get_by_text('day streak')).to_be_visible()
        expect(pg.locator('text=day streak').locator('xpath=preceding-sibling::p')).to_have_text('1')

    def export_backup(pg):
        pg.goto(BASE + '/notes?tab=backup', wait_until='networkidle')
        with pg.expect_download() as d:
            pg.get_by_role('button', name='Download backup file').click()
        content = Path(d.value.path()).read_text(encoding='utf-8')
        assert 'Healing for Mama' in content and 'John' in content, 'backup is missing items'

    def splash(pg):
        # Test browsers skip the splash unless asked; a person opening the app sees it once per visit
        pg.goto(BASE + '/?splash', wait_until='domcontentloaded')
        expect(pg.locator('.splash')).to_be_visible()
        pg.locator('.splash').click()
        expect(pg.locator('.splash')).to_have_count(0)

    def language_on_home(pg):
        pg.goto(BASE + '/today', wait_until='networkidle')
        pg.get_by_role('group', name='App language').get_by_role('button', name='Français').click()
        expect(pg.get_by_text('Verset du jour')).to_be_visible()
        pg.get_by_role('group', name='Langue de l’application').get_by_role('button', name='Yorùbá').click()
        expect(pg.get_by_text('Ẹsẹ Ọjọ́ Òní')).to_be_visible()
        pg.get_by_role('button', name='English').first.click()
        expect(pg.get_by_text('Verse of the Day')).to_be_visible()

    for name, fn in [('onboarding', onboarding), ('highlight and save verse', highlight_and_save), ('note on a verse', note_on_verse),
                     ('prayer journal', prayer_journal), ('hymn favourite', hymn_favourite), ('hymn search without tone marks', hymn_search),
                     ('quiz round', quiz_round), ('daily challenge', daily_challenge), ('reading mode', reading_mode), ('menu', menu), ('children’s stories', stories), ('music on and off', music), ('devotion completion and streak', devotion), ('library backup export', export_backup),
                     ('splash', splash), ('language switch on Home', language_on_home)]:
        check(name, fn, page)

    browser.close()

for status, name, detail in results:
    print(f'{status}  {name}  {detail}')
print('page errors:', errors[:5])
