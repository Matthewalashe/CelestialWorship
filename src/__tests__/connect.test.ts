import { describe, it, expect } from 'vitest';
// @ts-expect-error plain JavaScript shared with the desktop helper
import { explain, ffmpegArgs, parseProgress, redact, validTargets } from '../../desktop/connect/args.mjs';

describe('CelestialWorship Connect', () => {
  it('accepts only RTMP addresses that cannot break out of the command', () => {
    expect(validTargets(['rtmp://a.rtmp.youtube.com/live2/abc-123'])).toBe(true);
    expect(validTargets(['rtmps://live-api-s.facebook.com:443/rtmp/FB-1?s=2'])).toBe(true);
    expect(validTargets([])).toBe(false);
    expect(validTargets(['https://example.com/x'])).toBe(false);
    expect(validTargets(['rtmp://a/b|[f=flv]file.flv'])).toBe(false);
    expect(validTargets(['rtmp://a/b c'])).toBe(false);
    expect(validTargets(Array(9).fill('rtmp://a/b'))).toBe(false);
  });

  it('sends one stream to every platform, with key frames every two seconds', () => {
    const args: string[] = ffmpegArgs(['rtmp://one/a', 'rtmps://two/b']);
    expect(args.at(-1)).toBe('[f=flv:onfail=ignore:flvflags=no_duration_filesize]rtmp://one/a|[f=flv:onfail=ignore:flvflags=no_duration_filesize]rtmps://two/b');
    expect(args[args.indexOf('-g') + 1]).toBe('60');
    expect(args[args.indexOf('-r') + 1]).toBe('30');
    expect(args).toContain('aac');
  });

  it('never repeats a stream key', () => {
    expect(redact('[flv] Could not open rtmps://live-api-s.facebook.com:443/rtmp/SECRET-KEY: I/O error')).not.toContain('SECRET-KEY');
  });

  it('reads FFmpeg progress and explains failures plainly', () => {
    expect(parseProgress('frame=  120 fps= 30 q=21.0 size=     512kB time=00:00:04.00 bitrate=1048.6kbits/s speed=1.01x')).toEqual({ frames: 120, fps: 30, kbps: 1048.6, speed: 1.01 });
    expect(parseProgress('frame=  90 fps= 30 q=21.0 size=N/A time=00:00:03.00 bitrate=N/A speed=1.1x')).toEqual({ frames: 90, fps: 30, kbps: null, speed: 1.1 });
    expect(parseProgress('Press q to stop')).toBeNull();
    expect(explain('Connection refused')).toMatch(/internet/);
    expect(explain('Server returned 403 Forbidden')).toMatch(/stream key/);
    expect(explain('frame= 1')).toBeNull();
  });
});
