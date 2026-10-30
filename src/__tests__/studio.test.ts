import { describe, it, expect } from 'vitest';
import { coverCrop, fitWords, layoutRects, wrapText } from '../lib/studio/scene';
import { targetUrl } from '../lib/studio/relay';

const W = 1280, H = 720;
const perChar = (s: string, size = 10) => s.length * size * 0.5;

describe('studio layouts', () => {
  it('fills the picture with one source, and shows nothing with none', () => {
    expect(layoutRects('grid', 0, W, H)).toEqual([]);
    expect(layoutRects('split', 1, W, H)).toEqual([{ x: 0, y: 0, w: W, h: H }]);
  });

  it('puts every source inside the picture, without overlap in a grid', () => {
    for (const n of [2, 3, 4, 5, 7, 9]) {
      const rects = layoutRects('grid', n, W, H);
      expect(rects).toHaveLength(n);
      for (const r of rects) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(W);
        expect(r.y + r.h).toBeLessThanOrEqual(H);
      }
      const overlap = rects.some((a, i) => rects.some((b, j) => i < j && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
      expect(overlap).toBe(false);
    }
  });

  it('keeps the corner picture over the main one', () => {
    const [main, corner] = layoutRects('pip', 2, W, H);
    expect(main.w).toBe(W);
    expect(corner.w).toBeLessThan(W / 2);
    expect(corner.x + corner.w).toBeLessThan(W);
  });

  it('crops rather than stretches', () => {
    const c = coverCrop(1920, 1080, { x: 0, y: 0, w: 640, h: 720 });
    expect(c.w / c.h).toBeCloseTo(640 / 720);
    expect(c.h).toBe(1080);
    expect(c.x).toBeGreaterThan(0);
  });
});

describe('words on the stream', () => {
  it('keeps line breaks and wraps long lines', () => {
    expect(wrapText('one two\nthree', 1000, perChar)).toEqual(['one two', 'three']);
    expect(wrapText('aaaa bbbb cccc', 50, s => s.length * 10)).toEqual(['aaaa', 'bbbb', 'cccc']);
  });

  it('makes long verses smaller until they fit, and never overflows the band', () => {
    const measure = (s: string, size: number) => perChar(s, size);
    expect(fitWords('Short line', 1200, 216, measure).size).toBe(46);
    const long = 'Blessed be God, even the Father of our Lord Jesus Christ. '.repeat(10);
    const fitted = fitWords(long, 1200, 216, measure);
    expect(fitted.size).toBeLessThan(46);
    expect(fitted.lines.length * fitted.size * 1.25).toBeLessThanOrEqual(216);
  });
});

describe('stream addresses', () => {
  it('joins the server and key whatever slashes or spaces were pasted', () => {
    expect(targetUrl({ server: 'rtmp://a.rtmp.youtube.com/live2/ ', key: ' abc-123 ' })).toBe('rtmp://a.rtmp.youtube.com/live2/abc-123');
  });
});
