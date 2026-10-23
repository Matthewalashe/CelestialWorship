import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseSolfa } from '../utils/hymnTune';
import { TRACKS } from '../data/music';

const pub = (...p: string[]) => join(__dirname, '../../public', ...p);

describe('children’s Bible stories', () => {
  const index = JSON.parse(readFileSync(pub('data/stories/index.json'), 'utf-8'));

  it('has both collections in Bible order', () => {
    const ids = index.collections.map((c: any) => c.id);
    expect(ids).toEqual(['bible-stories', 'classic']);
    for (const c of index.collections) {
      const numbers = c.stories.map((s: any) => s.number);
      expect(numbers).toEqual([...numbers].sort((a: number, b: number) => a - b));
      expect(c.credit).toMatch(/CC BY-SA/);
    }
    expect(index.collections[0].stories.length).toBeGreaterThanOrEqual(50);
    expect(index.collections[1].stories.length).toBe(82);
  });

  it('every story has its text, passage, picture and (for the retellings) questions', () => {
    for (const c of index.collections) {
      for (const card of c.stories) {
        const s = JSON.parse(readFileSync(pub('data/stories', `${card.id}.json`), 'utf-8'));
        expect(s.paragraphs.length, card.id).toBeGreaterThan(2);
        expect(s.paragraphs.join(' '), card.id).not.toMatch(/\[Illustration|CHAPTER [IVX]+\./);
        expect(s.ref, card.id).toMatch(/\d/);
        expect(s.image?.src, card.id).toBeTruthy();
        expect(existsSync(pub(s.image.src.slice(1))), s.image.src).toBe(true);
        expect(s.image.source, card.id).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
        if (c.id === 'bible-stories') expect(s.questions.length, card.id).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('hymn tunes', () => {
  it('reads sol-fa pitches, octaves, holds and line breaths', () => {
    const notes = parseSolfa('d : r : m : -\n-l : s\'');
    expect(notes.map(n => n.semitones)).toEqual([0, 2, 4, null, -3, 19, null]);
    expect(notes[2].beats).toBe(2); // m held by "-"
  });
  it('ignores what it cannot read', () => {
    expect(parseSolfa('x : y : ?').filter(n => n.semitones !== null)).toHaveLength(0);
  });
});

describe('music', () => {
  it('streams only openly licensed recordings over https', () => {
    for (const t of TRACKS) {
      expect(t.src).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
      expect(t.license).toMatch(/Public domain|CC0|CC BY/);
      expect(t.page).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });
});
