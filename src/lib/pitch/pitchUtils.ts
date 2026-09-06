/** 피치 유틸 — 음이름/센트 변환 + 순수 JS 오토코릴레이션(YIN 스타일) */

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type TargetNote = {
  note: string;
  frequency: number;
  holdSeconds: number;
  label?: string;
};

/** A4 = 440Hz 기준 */
export function frequencyToMidi(hz: number) {
  return 69 + 12 * Math.log2(hz / 440);
}

export function midiToFrequency(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number) {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

export function frequencyToNoteName(hz: number) {
  if (!hz || hz <= 0) return "—";
  return midiToNoteName(frequencyToMidi(hz));
}

/** 두 주파수 사이 센트 오차 (양수 = 감지음이 더 높음) */
export function centsBetween(hz: number, targetHz: number) {
  if (!hz || !targetHz) return 0;
  return 1200 * Math.log2(hz / targetHz);
}

export function noteNameToFrequency(note: string): number | null {
  const m = note.trim().match(/^([A-G]#?)(-?\d+)$/i);
  if (!m) return null;
  const name = m[1].toUpperCase();
  const octave = Number(m[2]);
  const idx = NOTE_NAMES.indexOf(name as (typeof NOTE_NAMES)[number]);
  if (idx < 0) return null;
  const midi = (octave + 1) * 12 + idx;
  return midiToFrequency(midi);
}

export function rmsFromTimeDomain(buffer: Float32Array | Uint8Array) {
  let sum = 0;
  if (buffer instanceof Float32Array) {
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  } else {
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128;
      sum += v * v;
    }
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * 순수 JS 오토코릴레이션 피치 추정 (pitchy 대안).
 * 반환: Hz 또는 -1 (감지 실패)
 */
export function detectPitchAutocorrelation(
  buffer: Float32Array,
  sampleRate: number,
  options?: { minHz?: number; maxHz?: number; clarityMin?: number },
): { frequency: number; clarity: number } {
  const minHz = options?.minHz ?? 70;
  const maxHz = options?.maxHz ?? 1100;
  const clarityMin = options?.clarityMin ?? 0.85;
  const size = buffer.length;
  if (size < 512) return { frequency: -1, clarity: 0 };

  let rms = 0;
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return { frequency: -1, clarity: 0 };

  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.min(Math.floor(sampleRate / minHz), size - 1);

  let bestLag = -1;
  let bestCorr = 0;
  let norm = 0;
  for (let i = 0; i < size; i++) norm += buffer[i] * buffer[i];
  if (norm < 1e-8) return { frequency: -1, clarity: 0 };

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < size - lag; i++) {
      corr += buffer[i] * buffer[i + lag];
    }
    corr /= norm;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorr < clarityMin) {
    return { frequency: -1, clarity: bestCorr };
  }

  // parabolic interpolation
  const y0 = bestLag > minLag ? autocorrAt(buffer, bestLag - 1, norm) : bestCorr;
  const y1 = bestCorr;
  const y2 = bestLag < maxLag ? autocorrAt(buffer, bestLag + 1, norm) : bestCorr;
  const denom = 2 * (2 * y1 - y0 - y2);
  const shift = denom !== 0 ? (y0 - y2) / denom : 0;
  const refinedLag = bestLag + shift;
  const frequency = sampleRate / refinedLag;
  return { frequency, clarity: bestCorr };
}

function autocorrAt(buffer: Float32Array, lag: number, norm: number) {
  let corr = 0;
  for (let i = 0; i < buffer.length - lag; i++) {
    corr += buffer[i] * buffer[i + lag];
  }
  return corr / norm;
}

/** 고음 챌린지 기본 목표음 (중고음 → 고음) */
export const HIGH_NOTE_TARGETS: TargetNote[] = [
  { note: "C4", frequency: 261.63, holdSeconds: 2, label: "워밍업 C4" },
  { note: "E4", frequency: 329.63, holdSeconds: 2, label: "E4" },
  { note: "G4", frequency: 392.0, holdSeconds: 3, label: "G4" },
  { note: "A4", frequency: 440.0, holdSeconds: 3, label: "A4" },
  { note: "C5", frequency: 523.25, holdSeconds: 3, label: "고음 C5" },
  { note: "E5", frequency: 659.25, holdSeconds: 2, label: "도전 E5" },
];

export function isOnPitch(cents: number, thresholdCents = 50) {
  return Math.abs(cents) <= thresholdCents;
}
