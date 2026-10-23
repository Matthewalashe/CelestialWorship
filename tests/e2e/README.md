# Browser tests

Run against a production build served locally:

```sh
npm run build && npx vite preview --port 4173
pip install playwright && python -m playwright install chromium
python tests/e2e/smoke.py tests/e2e/out   # every route at phone size: errors, overflow, screenshots
python tests/e2e/flows.py tests/e2e/out   # onboarding, highlights, notes, prayers, favourites, quiz, daily challenge, reading mode,
                                          # menu and Learn, children's stories, music, devotion, backup
python tests/e2e/a11y.py                  # axe-core WCAG 2.2 AA: no serious or critical issues on the main routes
```
