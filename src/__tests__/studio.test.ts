import { describe, it, expect } from 'vitest';
import { coverCrop, cropRect, fitWords, layoutRects, wrapText, WHOLE_VIEW } from '../lib/studio/scene';
import { parseTarget, targetUrl } from '../lib/studio/relay';
import { isTooSlow, nextSlowCount, retryWait } from '../lib/studio/connect';
import { allowanceFor, uploadNeeded } from '../lib/studio/allowance';
import { clock, fileSize } from '../lib/studio/recording';

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

describe('what people paste as a stream address', () => {
  const YT = 'rtmp://a.rtmp.youtube.com/live2';
  it('tidies stray spaces and slashes', () => {
    expect(parseTarget(`${YT}/ `, ' abc-123 ')).toEqual({ server: YT, key: 'abc-123' });
  });
  it('splits a whole address pasted into the key box', () => {
    expect(parseTarget('', 'rtmps://live-api-s.facebook.com:443/rtmp/FB-1?s_bl=1&a=b')).toEqual({ server: 'rtmps://live-api-s.facebook.com:443/rtmp', key: 'FB-1?s_bl=1&a=b' });
  });
  it('refuses what would break the sending command', () => {
    for (const key of ['', '   ', 'a b', 'a|b', 'a[b]']) expect(parseTarget(YT, key)).toBeNull();
    expect(parseTarget('https://youtube.com', 'abc')).toBeNull();
    expect(parseTarget('', 'abc')).toBeNull();
    expect(parseTarget('', 'rtmp://nokey')).toBeNull();
  });
});

describe('a stream that drops', () => {
  it('tries again a few times, waiting longer, then gives up', () => {
    expect([0, 1, 2, 3].map(retryWait)).toEqual([2000, 5000, 10000, 20000]);
    expect(retryWait(4)).toBeNull();
  });
  it('warns once when the internet stays too slow, and forgives a good moment', () => {
    let n = 0, warnings = 0;
    for (let i = 0; i < 25; i++) { n = nextSlowCount(n, 0.5); if (isTooSlow(n)) warnings++; }
    expect(warnings).toBe(1);
    expect(nextSlowCount(n, 1.01)).toBe(0);
    expect(nextSlowCount(5, null)).toBe(5);
  });
});

describe('the plan', () => {
  it('keeps the limits asleep while testing, with our mark on', () => {
    const a = allowanceFor(false, false);
    expect(a.watermark).toBe(true);
    expect(a.platforms).toBe(Infinity);
    expect(a.analytics).toBe(true);
  });
  it('gives the free plan two platforms, three hours and our mark', () => {
    const a = allowanceFor(true, false);
    expect([a.platforms, a.hours, a.watermark, a.transcript, a.analytics]).toEqual([2, 3, true, false, false]);
  });
  it('lifts every limit on the paid plan', () => {
    const a = allowanceFor(true, true);
    expect([a.platforms, a.hours, a.watermark, a.transcript, a.analytics]).toEqual([Infinity, Infinity, false, true, true]);
  });
  it('adds up upload speed', () => { expect(uploadNeeded(2)).toBe(7); });
});

describe('framing and cropping', () => {
  it('keeps the shape asked for and stays inside the source, wherever it is framed', () => {
    for (const aspect of [16 / 9, 9 / 16, 1, 3]) for (const zoom of [1, 2.5, 4]) for (const [x, y] of [[0, 0], [1, 1], [0.5, 0.2]]) {
      const c = cropRect(1920, 1080, aspect, { zoom, x, y });
      expect(c.w / c.h).toBeCloseTo(aspect);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + c.w).toBeLessThanOrEqual(1920.001);
      expect(c.y + c.h).toBeLessThanOrEqual(1080.001);
    }
  });
  it('matches a plain centre crop when untouched', () => {
    expect(cropRect(1920, 1080, 1, WHOLE_VIEW)).toEqual(coverCrop(1920, 1080, { x: 0, y: 0, w: 500, h: 500 }));
  });
  it('stacks two people in a tall picture', () => {
    const [a, b] = layoutRects('split', 2, 720, 1280);
    expect(a.w).toBe(720);
    expect(b.y).toBe(640);
  });
  it('keeps a tall grid inside the picture', () => {
    for (const n of [2, 3, 4, 5]) for (const r of layoutRects('grid', n, 720, 1280)) {
      expect(r.x + r.w).toBeLessThanOrEqual(720);
      expect(r.y + r.h).toBeLessThanOrEqual(1280);
    }
  });
});

describe('numbers shown', () => {
  it('reads time and size plainly', () => {
    expect(clock(3_661_000)).toBe('1:01:01');
    expect(clock(-5)).toBe('0:00:00');
    expect(fileSize(5 * 1024 ** 3)).toBe('5.0 GB');
    expect(fileSize(10)).toBe('1 MB');
  });
});
