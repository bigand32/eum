import { midiToNoteName } from "@/lib/pitch/pitchUtils";

/** 상대 음정(반음) 패턴 → 실제 MIDI 시퀀스 */

export type VoiceRange = "male" | "female";

export type PianoPattern = {
  id: string;
  label: string;
  /** 한 번 재생할 상대 반음 시퀀스 (root=0) */
  relative: number[];
  /** 키를 몇 번 올려가며 반복할지 (반음씩) */
  transposeSteps: number;
  noteSec: number;
  gapSec: number;
  /** 한 키(한 구절) 끝난 뒤 쉬는 시간 — 숨 고르기 */
  phraseRestSec: number;
};

export type PianoEvent =
  | { kind: "note"; midi: number }
  | { kind: "rest"; sec: number };

const FIVE_UP = [0, 2, 4, 5, 7];
const FIVE_DOWN = [7, 5, 4, 2, 0];
const NINE_UP = [0, 2, 4, 5, 7, 9, 11, 12, 14];
const NINE_DOWN = [14, 12, 11, 9, 7, 5, 4, 2, 0];
const PASSAGGIO = [
  0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 16, 14, 12, 11, 9, 7, 5, 4, 2, 0,
];
const OCTAVE_REPEAT = [0, 12, 12, 12];
const ARPEGGIO = [0, 7, 4, 12, 7, 4, 0];

export const PIANO_PATTERNS: Record<string, PianoPattern> = {
  "five-scale": {
    id: "five-scale",
    label: "5스케일",
    relative: [...FIVE_UP, ...FIVE_DOWN.slice(1)],
    transposeSteps: 5,
    noteSec: 0.55,
    gapSec: 0.22,
    phraseRestSec: 2.2,
  },
  "nine-scale": {
    id: "nine-scale",
    label: "9스케일",
    relative: [...NINE_UP, ...NINE_DOWN.slice(1)],
    transposeSteps: 4,
    noteSec: 0.48,
    gapSec: 0.18,
    phraseRestSec: 2.4,
  },
  "passaggio-15": {
    id: "passaggio-15",
    label: "1.5스케일",
    relative: PASSAGGIO,
    transposeSteps: 3,
    noteSec: 0.42,
    gapSec: 0.16,
    phraseRestSec: 2.6,
  },
  "octave-repeat": {
    id: "octave-repeat",
    label: "옥타브 리핏",
    relative: OCTAVE_REPEAT,
    transposeSteps: 7,
    noteSec: 0.4,
    gapSec: 0.28,
    phraseRestSec: 1.8,
  },
  "arpeggio-1538": {
    id: "arpeggio-1538",
    label: "아르페지오",
    relative: ARPEGGIO,
    transposeSteps: 5,
    noteSec: 0.52,
    gapSec: 0.2,
    phraseRestSec: 2.0,
  },
};

export function getPianoPattern(challengeId: string) {
  return PIANO_PATTERNS[challengeId] ?? null;
}

export function rootMidiForVoice(voice: VoiceRange) {
  // 연습 가이드는 중음부터 시작해 올려가는 편이 듣기·부르기 편함
  // 남자: G3 / 여자: C4 (가운데 도)
  return voice === "female" ? 60 : 55;
}

/** 시작음 미세 조절 (±반음) */
export type StartHeight = "low" | "mid" | "high";

export const START_HEIGHT_OFFSET: Record<StartHeight, number> = {
  low: -4,
  mid: 0,
  high: 5,
};

/** 구절 사이 rest 포함 이벤트 시퀀스 */
export function buildPianoEvents(
  pattern: PianoPattern,
  rootMidi: number,
  keys = pattern.transposeSteps,
): PianoEvent[] {
  const out: PianoEvent[] = [];
  for (let k = 0; k < keys; k++) {
    for (const rel of pattern.relative) {
      out.push({ kind: "note", midi: rootMidi + k + rel });
    }
    if (k < keys - 1 && pattern.phraseRestSec > 0) {
      out.push({ kind: "rest", sec: pattern.phraseRestSec });
    }
  }
  return out;
}

/** 건반 표시용 MIDI만 */
export function midisFromEvents(events: PianoEvent[]) {
  return events.filter((e): e is Extract<PianoEvent, { kind: "note" }> => e.kind === "note").map((e) => e.midi);
}

export function keyboardRange(midis: number[]) {
  if (midis.length === 0) return { low: 48, high: 72 };
  const low = Math.min(...midis);
  const high = Math.max(...midis);
  const lowC = low - (low % 12);
  const highC = high + ((12 - (high % 12)) % 12);
  return { low: lowC, high: Math.max(highC, lowC + 24) };
}

export function isBlackKey(midi: number) {
  const n = midi % 12;
  return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
}

export function whiteKeysBetween(low: number, high: number) {
  const keys: number[] = [];
  for (let m = low; m <= high; m++) {
    if (!isBlackKey(m)) keys.push(m);
  }
  return keys;
}

export function noteLabel(midi: number) {
  return midiToNoteName(midi);
}

export type TempoId = "slow" | "normal" | "fast";

export const TEMPO_FACTOR: Record<TempoId, number> = {
  slow: 1.55,
  normal: 1.15,
  fast: 0.85,
};
