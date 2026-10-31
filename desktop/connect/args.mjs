// What CelestialWorship Connect asks FFmpeg to do, and how it reads the answers. Kept apart so it can be tested.

const SAFE_URL = /^rtmps?:\/\/[^\s|[\]]+$/i;

export const validTargets = urls => Array.isArray(urls) && urls.length > 0 && urls.length <= 8 && urls.every(u => typeof u === 'string' && SAFE_URL.test(u));

/**
 * The browser's recording comes in on stdin and goes out to every platform at once. The video is always encoded here,
 * because the platforms need a key frame every two seconds, which a browser's recording does not promise.
 */
export function ffmpegArgs(urls) {
  const outputs = urls.map(u => `[f=flv:onfail=ignore:flvflags=no_duration_filesize]${u}`).join('|');
  return [
    '-hide_banner', '-loglevel', 'warning', '-stats',
    '-fflags', '+genpts', '-thread_queue_size', '1024', '-f', 'webm', '-i', 'pipe:0',
    '-map', '0:v:0', '-map', '0:a:0',
    '-c:v', 'libx264', '-preset', 'superfast', '-tune', 'zerolatency', '-pix_fmt', 'yuv420p', '-r', '30', '-g', '60', '-keyint_min', '60',
    '-b:v', '3000k', '-maxrate', '3000k', '-bufsize', '6000k',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-af', 'aresample=async=1',
    '-flags', '+global_header', '-f', 'tee', outputs,
  ];
}

/** Stream keys are part of the addresses: nothing FFmpeg says may be repeated without taking them out */
export const redact = line => line.replace(/rtmps?:\/\/\S+/g, '[stream address]');

/**
 * FFmpeg's progress line, e.g. "frame=  120 fps= 30 q=21.0 size= 512kB time=00:00:04.00 bitrate=1048.6kbits/s speed=1.01x".
 * Sending to several outputs at once, size and bitrate read N/A.
 */
export function parseProgress(line) {
  const m = line.match(/frame=\s*(\d+).*?fps=\s*([\d.]+)/);
  if (!m) return null;
  const kbps = line.match(/bitrate=\s*([\d.]+)kbits\/s/);
  const speed = line.match(/speed=\s*([\d.]+)x/);
  return { frames: Number(m[1]), fps: Number(m[2]), kbps: kbps ? Number(kbps[1]) : null, speed: speed ? Number(speed[1]) : null };
}

/** A plain sentence for what went wrong, or null if the line is not a problem */
export function explain(line) {
  if (/slave muxer|tee:.*fail/i.test(line)) return 'One of your platforms stopped accepting the stream. Check its stream key. The others continue.';
  if (/connection refused|connection timed out|network is unreachable|failed to resolve|could not resolve/i.test(line)) return 'Could not reach the platform. Check your internet connection.';
  if (/server returned|authoriz|unauthorized|forbidden|i\/o error|input\/output error|broken pipe/i.test(line)) return 'The platform refused the stream. Check that the stream key is right and that the broadcast is set up.';
  return null;
}
