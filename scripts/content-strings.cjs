#!/usr/bin/env node
/**
 * The words of the app's content files (ranks, history, the calendar, the Constitution…), for translation.
 *
 *   node scripts/content-strings.cjs > strings.json
 *
 * Lists every string literal that reads as words (not ids, colours or paths), and the readable fields of
 * the content JSON. Translations go in data-src/i18n_content/*.txt and are merged into public/i18n by
 * scripts/merge_content_i18n.py.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const TS_FILES = [
  'src/data/ranks.ts', 'src/data/churchHistory.ts', 'src/data/churchLeaders.ts', 'src/data/music.ts', 'src/utils/churchCalendar.ts',
  'src/hooks/useProfile.ts', 'src/types/index.ts', 'src/data/prayers.ts', 'src/hooks/useParishes.ts',
];
const words = s => /[A-Za-z]{3}/.test(s) && /\s/.test(s.trim()) || /^[A-Z][a-z]+(?: [A-Z&][a-z]*)*$/.test(s);
const skip = s => /^(#|\/|https?:|cw-|var\(|[a-z_]+$|[a-z]+(-[a-z]+)+$)/.test(s) || /\.(png|jpe?g|webp|json|svg)$/.test(s);

const out = new Set();
for (const rel of TS_FILES) {
  const file = path.join(ROOT, rel);
  const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true);
  const visit = node => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !ts.isImportDeclaration(node.parent)
        && !(ts.isPropertyAssignment(node.parent) && node.parent.name === node)) {
      const t = node.text.trim();
      if (t && words(t) && !skip(t)) out.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
}

const constitution = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/constitution.json'), 'utf-8'));
const walk = v => {
  if (typeof v === 'string') { if (words(v) && !skip(v)) out.add(v); }
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!['number', 'id', 'url'].includes(k)) walk(x); });
};
walk(constitution);
const stories = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/stories/index.json'), 'utf-8'));
for (const c of stories.collections) {
  [c.title, c.about].forEach(s => s && out.add(s));
  for (const s of c.stories) { out.add(s.title); if (s.part) out.add(s.part); }
}
process.stdout.write(JSON.stringify([...out].sort(), null, 0));
