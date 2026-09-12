import { midiToFrequency } from "@/lib/pitch/pitchUtils";

const NOTE_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

function midiToSampleName(midi: number) {
  const name = NOTE_FLAT[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

/** FluidR3 어쿠스틱 그랜드 — 맑은 피아노 샘플 */
const SAMPLE_BASE =
  "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/acoustic_grand_piano-mp3";

/**
 * 샘플 피아노(우선) + 합성 폴백.
 * 네트워크 실패 시에도 맑은 배음 합성으로 재생.
 */
export class PianoSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private buffers = new Map<number, AudioBuffer>();
  private loading = new Map<number, Promise<AudioBuffer | null>>();
  private useSamples = true;

  async ensure() {
    if (!this.ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -18;
      this.comp.knee.value = 12;
      this.comp.ratio.value = 3;
      this.comp.attack.value = 0.003;
      this.comp.release.value = 0.15;
      this.master.connect(this.comp);
      this.comp.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  get currentTime() {
    return this.ctx?.currentTime ?? 0;
  }

  private async loadSample(midi: number): Promise<AudioBuffer | null> {
    if (!this.ctx || !this.useSamples) return null;
    const cached = this.buffers.get(midi);
    if (cached) return cached;
    const pending = this.loading.get(midi);
    if (pending) return pending;

    const task = (async () => {
      try {
        const url = `${SAMPLE_BASE}/${midiToSampleName(midi)}.mp3`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`sample ${res.status}`);
        const arr = await res.arrayBuffer();
        const buf = await this.ctx!.decodeAudioData(arr.slice(0));
        this.buffers.set(midi, buf);
        return buf;
      } catch {
        return null;
      } finally {
        this.loading.delete(midi);
      }
    })();

    this.loading.set(midi, task);
    return task;
  }

  /** 근처 로드된 샘플로 피치 시프트 */
  private nearestBuffer(midi: number): { buffer: AudioBuffer; rate: number } | null {
    if (this.buffers.has(midi)) {
      return { buffer: this.buffers.get(midi)!, rate: 1 };
    }
    let best: number | null = null;
    let bestDist = 99;
    for (const key of this.buffers.keys()) {
      const d = Math.abs(key - midi);
      if (d < bestDist && d <= 2) {
        bestDist = d;
        best = key;
      }
    }
    if (best == null) return null;
    return {
      buffer: this.buffers.get(best)!,
      rate: Math.pow(2, (midi - best) / 12),
    };
  }

  playNote(midi: number, durationSec = 0.4, when?: number) {
    if (!this.ctx || !this.master) return;
    const t0 = when ?? this.ctx.currentTime;

    // 샘플 프리로드(비동기) — 이미 있으면 바로 재생
    void this.loadSample(midi);
    const nearest = this.nearestBuffer(midi);
    if (nearest) {
      this.playSample(nearest.buffer, nearest.rate, durationSec, t0);
      return;
    }

    // 아직 샘플 없으면 맑은 배음 합성으로 즉시 재생
    this.playAdditive(midi, durationSec, t0);
    // 다음 음을 위해 주변 샘플도 미리 로드
    void this.loadSample(midi);
    void this.loadSample(midi + 1);
    void this.loadSample(midi - 1);
  }

  /** 재생 시작 전 범위 프리로드 */
  async preloadRange(midis: number[]) {
    await this.ensure();
    const unique = [...new Set(midis)];
    await Promise.all(unique.map((m) => this.loadSample(m)));
  }

  private playSample(buffer: AudioBuffer, rate: number, durationSec: number, t0: number) {
    if (!this.ctx || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.setValueAtTime(rate, t0);

    const env = this.ctx.createGain();
    const peak = 0.9;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    // 자연 감쇠 + 지정 길이에서 페이드
    const fadeAt = t0 + Math.max(0.12, durationSec * 0.75);
    env.gain.setValueAtTime(peak * 0.55, fadeAt);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec + 0.35);

    src.connect(env);
    env.connect(this.master);
    src.start(t0);
    src.stop(t0 + durationSec + 0.4);
    src.onended = () => {
      try {
        env.disconnect();
      } catch {
        /* gone */
      }
    };
  }

  /** 맑은 어쿠스틱풍 배음 합성 (샘플 폴백) */
  private playAdditive(midi: number, durationSec: number, t0: number) {
    if (!this.ctx || !this.master) return;
    const freq = midiToFrequency(midi);
    const env = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(Math.min(5200, freq * 12), t0);
    filter.frequency.exponentialRampToValueAtTime(Math.min(2800, freq * 6), t0 + 0.25);
    filter.Q.value = 0.7;

    // 피아노 배음 비율 (밝고 맑게)
    const partials: { mul: number; amp: number; decay: number }[] = [
      { mul: 1, amp: 0.55, decay: 1 },
      { mul: 2, amp: 0.28, decay: 0.7 },
      { mul: 3, amp: 0.14, decay: 0.5 },
      { mul: 4, amp: 0.08, decay: 0.38 },
      { mul: 5, amp: 0.045, decay: 0.28 },
      { mul: 6, amp: 0.025, decay: 0.22 },
      { mul: 2.002, amp: 0.04, decay: 0.45 }, // 살짝 디튠 → 코러스감
    ];

    const oscs: OscillatorNode[] = [];
    for (const p of partials) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      // 미세 인하모닉 (실제 피아노 스트레치)
      const f = freq * p.mul * (1 + (p.mul - 1) * 0.0004);
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(p.amp, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(
        0.0001,
        t0 + durationSec * p.decay + 0.2,
      );
      osc.connect(g);
      g.connect(filter);
      osc.start(t0);
      osc.stop(t0 + durationSec + 0.45);
      oscs.push(osc);
    }

    // 해머 노이즈 아주 짧게 (타건감)
    const noiseDur = 0.035;
    const noiseBuf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const ng = this.ctx.createGain();
    const nf = this.ctx.createBiquadFilter();
    nf.type = "bandpass";
    nf.frequency.value = Math.min(4000, freq * 4);
    nf.Q.value = 1.2;
    ng.gain.setValueAtTime(0.12, t0);
    ng.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(filter);
    noise.start(t0);
    noise.stop(t0 + noiseDur + 0.01);

    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(0.85, t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.35, t0 + 0.18);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec + 0.25);

    filter.connect(env);
    env.connect(this.master);

    oscs[0].onended = () => {
      try {
        env.disconnect();
        filter.disconnect();
      } catch {
        /* gone */
      }
    };
  }

  stopAll() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const prev = this.master.gain.value;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(prev, t);
    this.master.gain.linearRampToValueAtTime(0.0001, t + 0.03);
    window.setTimeout(() => {
      if (!this.master || !this.ctx) return;
      this.master.gain.setValueAtTime(0.85, this.ctx.currentTime);
    }, 60);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
    this.comp = null;
    this.buffers.clear();
    this.loading.clear();
  }
}
