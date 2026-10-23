# Browser tests

Run against a production build served locally:

```sh
npm run build && npx vite preview --port 4173
pip install playwright && python -m playwright install chromium
python tests/e2e/smoke.py tests/e2e/out   # every route at phone size: errors, overflow, screenshots
python tests/e2e/flows.py tests/e2e/out   # onboarding, highlights, notes, prayers, favourites, quiz, devotion, backup
```
