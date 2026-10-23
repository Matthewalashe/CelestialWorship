import { describe, it, expect } from 'vitest';
import { normalizeHttpsUrl, safeHref, normalizeLinks } from '../utils/safeUrl';

describe('normalizeHttpsUrl', () => {
  it('adds or upgrades to https', () => {
    expect(normalizeHttpsUrl('www.ccc.org')).toBe('https://www.ccc.org/');
    expect(normalizeHttpsUrl('http://ccc.org/x')).toBe('https://ccc.org/x');
    expect(normalizeHttpsUrl(' https://youtu.be/abc ')).toBe('https://youtu.be/abc');
  });
  it('treats empty as no link', () => {
    expect(normalizeHttpsUrl('')).toBeNull();
    expect(normalizeHttpsUrl(null)).toBeNull();
  });
  it('rejects other schemes and junk', () => {
    expect(normalizeHttpsUrl('javascript:alert(1)')).toBeUndefined();
    expect(normalizeHttpsUrl('data:text/html,hi')).toBeUndefined();
    expect(normalizeHttpsUrl('not a link')).toBeUndefined();
  });
});

describe('safeHref', () => {
  it('only passes https', () => {
    expect(safeHref('https://a.org')).toBe('https://a.org');
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('http://a.org')).toBeUndefined();
    expect(safeHref(null)).toBeUndefined();
  });
});

describe('normalizeLinks', () => {
  it('names the bad field', () => {
    expect(() => normalizeLinks({ website: 'javascript:x' }, { website: 'Website' })).toThrow('Website');
    expect(normalizeLinks({ a: 'x.org', b: '' })).toEqual({ a: 'https://x.org/', b: null });
  });
});
