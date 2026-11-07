export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  unlock() {
    try {
      this.ensure();
    } catch {
      /* audio is optional */
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.2;
  }

  private ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.2;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain = 0.16, delay = 0, slide?: number) {
    if (this.muted) return;
    let ctx: AudioContext;
    try {
      ctx = this.ensure();
    } catch {
      return;
    }
    if (!this.master) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, freq: number, q = 0.7) {
    if (this.muted) return;
    let ctx: AudioContext;
    try {
      ctx = this.ensure();
    } catch {
      return;
    }
    if (!this.master) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  harvest(combo: number) {
    const base = 480 + Math.min(combo, 8) * 46;
    this.tone(base, 0.11, "triangle", 0.16);
    this.tone(base * 1.25, 0.14, "sine", 0.11, 0.05);
    this.tone(base * 1.5, 0.18, "sine", 0.08, 0.09);
    this.tone(base * 2, 0.08, "square", 0.03, 0.02);
  }

  plant() {
    this.noise(0.12, 0.12, 180, 0.6);
    this.tone(180, 0.09, "sine", 0.08, 0, 90);
  }

  water() {
    this.noise(0.16, 0.1, 900, 0.5);
    this.tone(640, 0.12, "sine", 0.06, 0, 320);
  }

  shoo() {
    this.noise(0.14, 0.1, 1400, 0.8);
    this.tone(520, 0.1, "square", 0.04, 0, 860);
  }

  wither() {
    this.tone(320, 0.2, "sine", 0.1, 0, 140);
    this.tone(190, 0.26, "triangle", 0.06, 0.04, 90);
  }

  ripe() {
    this.tone(740, 0.09, "sine", 0.07);
    this.tone(980, 0.12, "sine", 0.06, 0.06);
  }

  thirst() {
    this.tone(880, 0.08, "sine", 0.04, 0, 520);
  }

  error() {
    this.tone(180, 0.1, "square", 0.05);
    this.tone(140, 0.12, "square", 0.04, 0.06);
  }

  click() {
    this.tone(620, 0.05, "sine", 0.05);
  }

  day() {
    this.tone(392, 0.16, "triangle", 0.08);
    this.tone(494, 0.18, "sine", 0.07, 0.06);
    this.tone(587, 0.22, "sine", 0.06, 0.12);
  }

  power() {
    this.tone(330, 0.12, "sawtooth", 0.04, 0, 660);
    this.tone(520, 0.16, "triangle", 0.1, 0.05);
    this.tone(784, 0.2, "sine", 0.08, 0.1);
  }

  record() {
    this.tone(523, 0.1, "triangle", 0.1);
    this.tone(659, 0.12, "triangle", 0.09, 0.08);
    this.tone(784, 0.16, "sine", 0.08, 0.16);
    this.tone(1046, 0.2, "sine", 0.06, 0.24);
  }

  gameOver() {
    this.tone(392, 0.18, "sine", 0.09, 0, 262);
    this.tone(330, 0.22, "triangle", 0.07, 0.12, 196);
    this.tone(220, 0.34, "sine", 0.06, 0.24, 130);
  }

  chirp() {
    this.tone(1480, 0.07, "sine", 0.03, 0, 1900);
    this.tone(1700, 0.06, "sine", 0.02, 0.09, 1400);
  }

  rain() {
    this.tone(523, 0.14, "sine", 0.06);
    this.tone(659, 0.16, "sine", 0.05, 0.05);
    this.tone(784, 0.2, "triangle", 0.04, 0.1);
    this.noise(0.25, 0.05, 1200, 0.4);
  }
}
