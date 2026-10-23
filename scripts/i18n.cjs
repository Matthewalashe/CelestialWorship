#!/usr/bin/env node
/**
 * Translation helper.
 *
 *   node scripts/i18n.cjs wrap      wrap the app's English text in tr() (JSX text, labels, toasts…)
 *   node scripts/i18n.cjs extract   write the strings to translate to scripts/i18n-strings.json
 *                                   and report what each catalog in public/i18n is missing
 *
 * `wrap` is safe to run again: text already inside tr() is left alone.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const SKIP = [/__tests__/, /[\\/]i18n[\\/]/, /\.test\./];
// Church content (history, Bible places, quizzes, hymn search words) is written per language, not through the catalog
const CONTENT = /[\\/]src[\\/]data[\\/]|hymnMatcher|churchCalendar/;

// Attributes that people read
const ATTRS = new Set(['placeholder', 'title', 'aria-label', 'alt', 'label', 'subtitle', 'description', 'hint', 'message', 'confirmLabel', 'emptyText']);
// Fields of data objects that end up on screen as {item.title} etc.
const FIELDS = new Set(['title', 'text', 'label', 'description', 'subtitle', 'hint', 'blurb', 'summary']);
// Calls whose first argument is shown
const CALLS = new Set(['showToast']);
const DIALOGS = new Set(['confirmDialog', 'promptDialog']);
const DIALOG_FIELDS = new Set(['title', 'message', 'label', 'confirmLabel']);

const hasWords = t => /[A-Za-z]{2}/.test(t);
// Tables of labels shown on screen (colours, codes and place names are not words to translate)
const isLabelTable = name => /^[A-Z][A-Z0-9_]+$/.test(name) && !/COLOR|USFM|CODE|COUNTRY|BOOKS|VERSIONS|KEY|URL|PATH|STEPS|RANKS|ASSETS|HIERARCHY|JOURNEY$|LETTERS|PLACES|STORIES|TRACKS|QUESTIONS/.test(name);
const isCode = t => /^[\w.-]+\.(tsx?|json|png|svg)$/.test(t) || /^https?:/.test(t) || /^[#/]/.test(t);

function files(dir = SRC, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (SKIP.some(r => r.test(p))) continue;
    if (fs.statSync(p).isDirectory()) files(p, out);
    else if (/\.tsx?$/.test(p) && !p.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/** The text a JSX text node renders, by React's whitespace rules */
function jsxText(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines.length === 1) return raw.replace(/[ \t]+/g, ' ');
  const kept = [];
  lines.forEach((line, i) => {
    let l = line.replace(/\t/g, ' ');
    if (i !== 0) l = l.replace(/^ +/, '');
    if (i !== lines.length - 1) l = l.replace(/ +$/, '');
    if (l) kept.push(l);
  });
  return kept.join(' ').replace(/ {2,}/g, ' ');
}

const q = s => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const isTr = n => n && ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'tr';

/** String literals an expression may evaluate to: a, c ? a : b, x && a, x ?? a */
function literalsIn(expr, out = []) {
  if (!expr) return out;
  if (ts.isParenthesizedExpression(expr)) return literalsIn(expr.expression, out);
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) { out.push(expr); return out; }
  if (ts.isConditionalExpression(expr)) { literalsIn(expr.whenTrue, out); literalsIn(expr.whenFalse, out); return out; }
  if (ts.isBinaryExpression(expr) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(expr.operatorToken.kind)) {
    literalsIn(expr.right, out); return out;
  }
  return out;
}

function scan(file, collect) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const strings = new Set();
  const add = s => { const t = s.trim(); if (t && hasWords(t) && !isCode(t)) strings.add(t); return t; };
  const wrapLiteral = (lit, inJsxAttr) => {
    if (isTr(lit.parent)) { add(lit.text); return; }
    if (!hasWords(lit.text) || isCode(lit.text.trim())) return;
    add(lit.text);
    const call = `tr(${q(lit.text)})`;
    edits.push([lit.getStart(sf), lit.getEnd(), inJsxAttr ? `{${call}}` : call]);
  };

  const visit = n => {
    // <p>Some words</p>
    if (ts.isJsxText(n)) {
      const shown = jsxText(text.slice(n.pos, n.end));
      if (hasWords(shown) && !/[&{}<>]/.test(shown)) {
        const core = shown.trim();
        add(core);
        const lead = /^\s/.test(shown) ? "{' '}" : '';
        const trail = /\s$/.test(shown) ? "{' '}" : '';
        edits.push([n.pos, n.end, `${lead}{tr(${q(core)})}${trail}`]);
      }
    }
    // placeholder="…"  or  title={x ? 'A' : 'B'}
    else if (ts.isJsxAttribute(n) && ATTRS.has(n.name.getText(sf)) && n.initializer) {
      if (ts.isStringLiteral(n.initializer)) wrapLiteral(n.initializer, true);
      else if (ts.isJsxExpression(n.initializer)) literalsIn(n.initializer.expression).forEach(l => wrapLiteral(l, false));
    }
    // {cond ? 'Saving…' : 'Save'}  {item.title}
    else if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      literalsIn(n.expression).forEach(l => wrapLiteral(l, false));
      const e = n.expression;
      if (ts.isPropertyAccessExpression(e) && FIELDS.has(e.name.text)) {
        edits.push([e.getStart(sf), e.getEnd(), `tr(${e.getText(sf)})`]);
      }
      // {PARISH_LEVELS[l]}, {MONTHS[m]}: a label from one of the app's tables
      if (ts.isElementAccessExpression(e) && ts.isIdentifier(e.expression) && isLabelTable(e.expression.text)) {
        edits.push([e.getStart(sf), e.getEnd(), `tr(${e.getText(sf)})`]);
      }
    }
    // showToast('Saved')
    else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      const name = n.expression.text;
      if (CALLS.has(name) && n.arguments[0]) literalsIn(n.arguments[0]).forEach(l => wrapLiteral(l, false));
      if (DIALOGS.has(name) && n.arguments[0] && ts.isObjectLiteralExpression(n.arguments[0])) {
        for (const prop of n.arguments[0].properties) {
          if (ts.isPropertyAssignment(prop) && DIALOG_FIELDS.has(prop.name.getText(sf))) literalsIn(prop.initializer).forEach(l => wrapLiteral(l, false));
        }
      }
      if (name === 'tr' && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) add(n.arguments[0].text);
    }
    // const PARISH_LEVELS = { parish: 'Parish', … } and const MONTHS = ['January', …]
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && isLabelTable(n.name.text) && n.initializer && !CONTENT.test(file)) {
      const collectValues = node => {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) add(node.text);
        else if (ts.isArrayLiteralExpression(node)) node.elements.forEach(collectValues);
        else if (ts.isObjectLiteralExpression(node)) for (const prop of node.properties) {
          if (!ts.isPropertyAssignment(prop)) continue;
          const key = prop.name.getText(sf).replace(/['"]/g, '');
          if (ts.isStringLiteral(prop.initializer) ? (FIELDS.has(key) || !/^(icon|id|color|bg|text|yoruba)$/.test(key)) : true) collectValues(prop.initializer);
        }
        else if (ts.isAsExpression(node) || ts.isSatisfiesExpression?.(node)) collectValues(node.expression);
      };
      collectValues(n.initializer);
    }
    // { title: 'Bible lessons', text: '…' } in .tsx files: collected, shown through {s.title}
    else if (ts.isPropertyAssignment(n) && file.endsWith('.tsx') && FIELDS.has(n.name.getText(sf).replace(/['"]/g, '')) && ts.isStringLiteral(n.initializer)) {
      add(n.initializer.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  collect && strings.forEach(s => collect.add(s));
  return { text, sf, edits };
}

function wrap() {
  let changed = 0, count = 0;
  for (const file of files()) {
    if (!file.endsWith('.tsx') && !/showToast|confirmDialog|promptDialog/.test(fs.readFileSync(file, 'utf8'))) continue;
    const { text, sf, edits } = scan(file);
    // Skip edits inside other edits (nested property accesses etc.)
    edits.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const kept = [];
    for (const e of edits) if (!kept.length || e[0] >= kept[kept.length - 1][1]) kept.push(e);
    if (!kept.length) continue;
    let out = text;
    for (const [s, e, r] of [...kept].reverse()) out = out.slice(0, s) + r + out.slice(e);
    if (!/import \{[^}]*\btr\b[^}]*\} from '[./]+i18n'/.test(out)) {
      const rel = path.relative(path.dirname(file), path.join(SRC, 'i18n')).replace(/\\/g, '/');
      const spec = rel.startsWith('.') ? rel : `./${rel}`;
      const existing = new RegExp(`import \\{([^}]*)\\} from '${spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}';`);
      if (existing.test(out)) out = out.replace(existing, (_, names) => `import {${names.replace(/\s*$/, '')}, tr } from '${spec}';`);
      else {
        const imports = [...sf.statements].filter(ts.isImportDeclaration);
        const at = imports.length ? out.indexOf('\n', out.indexOf(imports[imports.length - 1].getText(sf))) + 1 : 0;
        out = out.slice(0, at) + `import { tr } from '${spec}';\n` + out.slice(at);
      }
    }
    fs.writeFileSync(file, out);
    changed++; count += kept.length;
  }
  console.log(`wrapped ${count} strings in ${changed} files`);
}

function extract() {
  const all = new Set();
  for (const file of files()) scan(file, all);
  // Keys from the keyed table are translated there
  const list = [...all].sort((a, b) => a.localeCompare(b));
  fs.writeFileSync(path.join(__dirname, 'i18n-strings.json'), JSON.stringify(list, null, 1) + '\n');
  console.log(`${list.length} strings`);
  const dir = path.join(ROOT, 'public', 'i18n');
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const cat = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const missing = list.filter(s => !cat[s]);
    const unused = Object.keys(cat).filter(k => !all.has(k));
    console.log(`${f}: ${list.length - missing.length}/${list.length} translated, ${unused.length} unused`);
  }
}

const cmd = process.argv[2];
if (cmd === 'wrap') wrap();
else if (cmd === 'extract') extract();
else console.log('usage: node scripts/i18n.cjs wrap|extract');

module.exports = { jsxText };
