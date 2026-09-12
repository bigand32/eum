"use client";

import { useMemo } from "react";
import { midiToNoteName } from "@/lib/pitch/pitchUtils";

/** 오선 위치: C4=0, 다이어토닉 스텝 (반음 올림은 같은 자리 + ♯) */
const PC_STEP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const PC_SHARP = [false, true, false, true, false, false, true, false, true, false, true, false];

function midiToStaffStep(midi: number) {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return PC_STEP[pc] + (oct - 4) * 7;
}

function needsSharp(midi: number) {
  return PC_SHARP[((midi % 12) + 12) % 12];
}

/** 한 구절(키) 단위로 잘라 보여줄 MIDI */
export function phraseMidisFromEvents(
  events: { kind: string; midi?: number }[],
  cursor: number,
) {
  const phrases: number[][] = [];
  let cur: number[] = [];
  for (const ev of events) {
    if (ev.kind === "rest") {
      if (cur.length) phrases.push(cur);
      cur = [];
    } else if (ev.kind === "note" && typeof ev.midi === "number") {
      cur.push(ev.midi);
    }
  }
  if (cur.length) phrases.push(cur);

  if (phrases.length === 0) {
    return { midis: [] as number[], phraseIndex: 0, noteInPhrase: 0, totalPhrases: 0 };
  }

  let phraseIndex = 0;
  let noteInPhrase = 0;
  let pi = 0;
  let ni = 0;
  for (let i = 0; i <= Math.min(cursor, Math.max(0, events.length - 1)); i++) {
    const ev = events[i];
    if (!ev) break;
    if (ev.kind === "rest") {
      pi += 1;
      ni = 0;
    } else if (ev.kind === "note") {
      phraseIndex = pi;
      noteInPhrase = ni;
      ni += 1;
    }
  }
  if (phraseIndex >= phrases.length) phraseIndex = phrases.length - 1;
  return {
    midis: phrases[phraseIndex] ?? [],
    phraseIndex,
    noteInPhrase,
    totalPhrases: phrases.length,
  };
}

type Props = {
  midis: number[];
  activeMidi: number | null;
  activeIndex?: number | null;
  resting?: boolean;
  phraseLabel?: string;
};

export function ScaleSheetMusic({
  midis,
  activeMidi,
  activeIndex = null,
  resting = false,
  phraseLabel,
}: Props) {
  const layout = useMemo(() => {
    if (midis.length === 0) return null;
    const steps = midis.map(midiToStaffStep);
    const minStep = Math.min(...steps);
    const maxStep = Math.max(...steps);
    // 오선: E4=2 … F5=10 (C4=0 기준). 범위에 맞게 여유
    const staffBottom = 2; // E4
    const lineGap = 10;
    const topPad = 28;
    const bottomPad = 36;
    const clefW = 36;
    const noteGap = Math.min(28, Math.max(16, 220 / midis.length));
    const width = clefW + 16 + midis.length * noteGap + 20;

    // y: step이 클수록 위로 (음 높음)
    const stepToY = (step: number) => {
      // staff bottom line (E4=2) at topPad + 4*lineGap
      return topPad + (10 - step) * (lineGap / 2);
    };

    // 보조선 범위
    const viewMin = Math.min(staffBottom, minStep - 1);
    const viewMax = Math.max(10, maxStep + 1);
    const height = topPad + (10 - viewMin) * (lineGap / 2) + bottomPad;

    return {
      steps,
      lineGap,
      topPad,
      clefW,
      noteGap,
      width,
      height,
      stepToY,
      staffYs: [0, 1, 2, 3, 4].map((i) => topPad + i * lineGap), // F5..E4 visually top to bottom: step 10,8,6,4,2
      viewMin,
      viewMax,
    };
  }, [midis]);

  if (!layout || midis.length === 0) {
    return (
      <div className="rounded-[16px] bg-gray-50 px-4 py-8 text-center text-[12px] text-gray-400">
        악보를 준비하는 중…
      </div>
    );
  }

  const { lineGap, topPad, clefW, noteGap, width, height, stepToY, staffYs } = layout;

  return (
    <div className="overflow-hidden rounded-[16px] bg-gray-50">
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="text-[12px] font-bold text-gray-500">악보</p>
        {phraseLabel ? (
          <p className="text-[11px] font-semibold text-gray-400">{phraseLabel}</p>
        ) : null}
      </div>
      <div className="no-scrollbar overflow-x-auto px-2 pb-2">
        <svg
          width={Math.max(width, 280)}
          height={height}
          viewBox={`0 0 ${Math.max(width, 280)} ${height}`}
          className="mx-auto block"
          role="img"
          aria-label="스케일 악보"
        >
          {/* 오선 */}
          {staffYs.map((y) => (
            <line
              key={y}
              x1={12}
              x2={Math.max(width, 280) - 12}
              y1={y}
              y2={y}
              stroke="#D1D5DB"
              strokeWidth={1.25}
            />
          ))}

          {/* 간단한 높은음자리표 */}
          <text
            x={18}
            y={topPad + lineGap * 3.15}
            fontSize={42}
            fill="#6B7280"
            fontFamily="Georgia, serif"
          >
            𝄞
          </text>

          {midis.map((midi, i) => {
            const step = midiToStaffStep(midi);
            const x = clefW + 20 + i * noteGap;
            const y = stepToY(step);
            const active =
              activeIndex != null ? activeIndex === i : activeMidi === midi && !resting;
            const sharp = needsSharp(midi);

            // 보조선
            const ledger: number[] = [];
            if (step < 2) {
              for (let s = 0; s >= step; s -= 2) {
                if (s < 2) ledger.push(s);
              }
            }
            if (step > 10) {
              for (let s = 12; s <= step; s += 2) ledger.push(s);
            }

            return (
              <g key={`${midi}-${i}`}>
                {ledger.map((s) => (
                  <line
                    key={s}
                    x1={x - 9}
                    x2={x + 9}
                    y1={stepToY(s)}
                    y2={stepToY(s)}
                    stroke="#D1D5DB"
                    strokeWidth={1.25}
                  />
                ))}
                {sharp ? (
                  <text
                    x={x - 14}
                    y={y + 4}
                    fontSize={14}
                    fontWeight={700}
                    fill={active ? "#4401a9" : "#9CA3AF"}
                  >
                    ♯
                  </text>
                ) : null}
                <ellipse
                  cx={x}
                  cy={y}
                  rx={7}
                  ry={5.5}
                  transform={`rotate(-18 ${x} ${y})`}
                  fill={active ? "#4401a9" : resting ? "#D1D5DB" : "#374151"}
                />
                {/* 줄기 */}
                <line
                  x1={x + (step >= 6 ? -6.5 : 6.5)}
                  y1={y}
                  x2={x + (step >= 6 ? -6.5 : 6.5)}
                  y2={y + (step >= 6 ? 22 : -22)}
                  stroke={active ? "#4401a9" : resting ? "#D1D5DB" : "#374151"}
                  strokeWidth={1.5}
                />
                <text
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={active ? 700 : 500}
                  fill={active ? "#4401a9" : "#9CA3AF"}
                >
                  {midiToNoteName(midi).replace(/[0-9]/g, "")}
                </text>
              </g>
            );
          })}

          {resting ? (
            <text
              x={Math.max(width, 280) / 2}
              y={topPad + lineGap * 2}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill="#4401a9"
            >
              쉬는 중
            </text>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
