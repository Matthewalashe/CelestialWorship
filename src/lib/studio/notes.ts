/**
 * Sermon notes from the live transcript, made on this computer with no paid service: the Scriptures mentioned, and the
 * lines that carry the sermon's most repeated ideas, in the order they were said. Picked out, not rewritten.
 */

const BOOKS = 'Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation';
const ORDINAL = '(?:(?:1|2|3|1st|2nd|3rd|first|second|third)\\s+)?';
const SCRIPTURE = new RegExp(`\\b(${ORDINAL})(${BOOKS})\\s+(?:chapter\\s+)?(\\d{1,3})(?:\\s*(?::|verses?)\\s*(\\d{1,3})(?:\\s*(?:-|to)\\s*(\\d{1,3}))?)?`, 'gi');
const STOP = new Set(('the a an and or but if so of to in on at for from by with as is are was were be been being am i you he she it we they me him her us them my your his its our their this that these those there here not no do does did have has had will would can could shall should may might must what which who whom when where why how all any some very just also then than too into out up down over about because let say said says go going come came know one two people man men thing things like get got make made today amen hallelujah '
  + 'le la les un une des et ou mais de du à au aux en dans sur pour par avec est sont était être je tu il elle nous vous ils elles ce cette ces que qui ne pas plus son sa ses notre votre leur').split(' '));

const words = (line: string) => line.toLowerCase().match(/\p{L}+/gu) ?? [];

export function findScriptures(text: string): string[] {
  const found = new Map<string, string>();
  for (const m of text.matchAll(SCRIPTURE)) {
    const number = m[1].trim().toLowerCase().replace(/^first$|^1st$/, '1').replace(/^second$|^2nd$/, '2').replace(/^third$|^3rd$/, '3');
    const book = m[2][0].toUpperCase() + m[2].slice(1).toLowerCase();
    const reference = `${number ? `${number} ` : ''}${book} ${m[3]}${m[4] ? `:${m[4]}${m[5] ? `-${m[5]}` : ''}` : ''}`;
    found.set(reference.toLowerCase(), reference);
  }
  return [...found.values()];
}

/** The lines that say most of what the sermon says most, kept in the order spoken */
export function keyPoints(lines: string[], howMany = 6): string[] {
  const counts = new Map<string, number>();
  for (const line of lines) for (const w of words(line)) if (w.length > 2 && !STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  const seen = new Set<string>();
  const scored = lines.map((line, index) => {
    const all = words(line);
    const useful = all.filter(w => counts.has(w));
    return { line, index, score: useful.length ? useful.reduce((n, w) => n + (counts.get(w) ?? 0), 0) / Math.sqrt(all.length) : 0, size: all.length };
  }).filter(l => l.size >= 6 && l.size <= 60 && !seen.has(l.line) && seen.add(l.line));
  return scored.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, howMany).sort((a, b) => a.index - b.index).map(l => l.line);
}

export function sermonNotes(lines: string[], heading: { title: string; date: string; scriptures: string; points: string; full: string }): string {
  const clean = lines.map(l => l.trim()).filter(Boolean);
  const scriptures = findScriptures(clean.join(' '));
  const parts = [`${heading.title}\n${heading.date}`];
  if (scriptures.length) parts.push(`${heading.scriptures}\n${scriptures.map(s => `- ${s}`).join('\n')}`);
  const points = keyPoints(clean);
  if (points.length) parts.push(`${heading.points}\n${points.map(p => `- ${p}`).join('\n')}`);
  parts.push(`${heading.full}\n${clean.join('\n')}`);
  return parts.join('\n\n');
}
