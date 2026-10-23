/**
 * Celestial hymn tunes played softly on the device from the hymnal's tonic sol-fa.
 *
 * The hymnal's sol-fa gives the pitches ("m : s : m : d : f"), not the rhythm, so each note is held
 * evenly, like a slow organ meditation, with a pause at the end of each line. "-" before a syllable
 * means the lower octave and "'" after it the upper; "-" alone holds the previous note.
 */

const DEGREES: Record<string, number> = { d: 0, de: 1, r: 2, ri: 3, m: 4, f: 5, fe: 6, s: 7, se: 8, l: 9, ta: 10, t: 11 };

export interface TuneNote { semitones: number | null; beats: number }

export function parseSolfa(solfa: string): TuneNote[] {
  const notes: TuneNote[] = [];
  for (const line of solfa.split(/\n+/)) {
    const tokens = line.split(':').map(t => t.trim().toLowerCase()).filter(Boolean);
    let added = false;
    for (const tok of tokens) {
      if (/^-+$/.test(tok) || tok === '.') {           // hold
        if (notes.length) notes[notes.length - 1].beats += 1;
        continue;
      }
      const m = tok.match(/^(-*)([a-z]+)([',]*)$/);
      if (!m || !(m[2] in DEGREES)) continue;
      const octave = -m[1].length + (m[3].match(/'/g)?.length ?? 0) - (m[3].match(/,/g)?.length ?? 0);
      notes.push({ semitones: DEGREES[m[2]] + 12 * octave, beats: 1 });
      added = true;
    }
    if (added) notes.push({ semitones: null, beats: 1 }); // breath at the end of the line
  }
  return notes;
}

/** A gentle organ-like voice with a quiet drone and a little echo */
export class TunePlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private stopped = true;

  constructor(private volume = 0.3) {}

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.3);
  }

  /** Create the audio context during a tap, so phones allow sound that starts a moment later */
  unlock() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = this.ctx ?? new Ctx();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  /** Plays the tune `times` times, then calls onEnd */
  play(solfa: string, opts: { times?: number; bpm?: number; keyHz?: number; onEnd?: () => void } = {}) {
    this.stop();
    const notes = parseSolfa(solfa);
    if (!notes.some(n => n.semitones !== null)) { opts.onEnd?.(); return; }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = this.ctx ?? new Ctx();
    this.ctx = ctx;
    if (ctx.state === 'suspended') ctx.resume();
    this.stopped = false;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.setTargetAtTime(this.volume, ctx.currentTime, 1.2);
    // Echo for a sense of space
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.32;
    const feedback = ctx.createGain(); feedback.gain.value = 0.32;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2200;
    delay.connect(feedback).connect(delay);
    master.connect(tone).connect(ctx.destination);
    master.connect(delay).connect(tone);
    this.master = master;

    const key = opts.keyHz ?? 261.63; // C4
    const beat = 60 / (opts.bpm ?? 66);
    const times = opts.times ?? 2;
    const hz = (semi: number) => key * Math.pow(2, semi / 12);

    // Quiet drone on the tonic and fifth
    const drone = [0, 7].map((semi, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(semi - 12);
      const g = ctx.createGain(); g.gain.value = i ? 0.05 : 0.08;
      o.connect(g).connect(master); o.start();
      return o;
    });

    let t = ctx.currentTime + 0.6;
    for (let round = 0; round < times; round++) {
      for (const n of notes) {
        const dur = n.beats * beat;
        if (n.semitones !== null) {
          for (const [type, mult, level] of [['triangle', 1, 0.22], ['sine', 2, 0.06]] as const) {
            const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(n.semitones) * mult;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(level, t + 0.08);
            g.gain.setTargetAtTime(level * 0.7, t + 0.1, 0.4);
            g.gain.setTargetAtTime(0, t + dur - 0.05, 0.12);
            o.connect(g).connect(master);
            o.start(t); o.stop(t + dur + 0.8);
          }
        }
        t += dur;
      }
      t += beat * 2;
    }

    const endIn = (t - ctx.currentTime) * 1000;
    this.timer = window.setTimeout(() => {
      drone.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
      if (!this.stopped) opts.onEnd?.();
    }, endIn);
    // keep a reference to stop the drone early
    this.stopDrone = () => drone.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
  }

  private stopDrone: () => void = () => {};

  stop() {
    this.stopped = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.master && this.ctx) {
      const m = this.master;
      m.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      setTimeout(() => { try { m.disconnect(); } catch { /* gone */ } }, 1200);
      this.master = null;
    }
    this.stopDrone();
  }
}
