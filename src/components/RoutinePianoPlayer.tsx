"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PianoSynth } from "@/lib/piano-synth";
import {
  buildPianoEvents,
  getPianoPattern,
  isBlackKey,
  keyboardRange,
  midisFromEvents,
  noteLabel,
  rootMidiForVoice,
  START_HEIGHT_OFFSET,
  TEMPO_FACTOR,
  whiteKeysBetween,
  type StartHeight,
  type TempoId,
  type VoiceRange,
} from "@/lib/vocal-piano-patterns";
import { phraseMidisFromEvents, ScaleSheetMusic } from "@/components/ScaleSheetMusic";
import { midiToNoteName } from "@/lib/pitch/pitchUtils";

type Props = {
  challengeId: string;
};

export function RoutinePianoPlayer({ challengeId }: Props) {
  const pattern = getPianoPattern(challengeId);
  const synthRef = useRef<PianoSynth | null>(null);
  const timersRef = useRef<number[]>([]);
  const playingRef = useRef(false);

  const [voice, setVoice] = useState<VoiceRange>("female");
  const [startHeight, setStartHeight] = useState<StartHeight>("mid");
  const [tempo, setTempo] = useState<TempoId>("fast");
  const [playing, setPlaying] = useState(false);
  const [resting, setResting] = useState(false);
  const [activeMidi, setActiveMidi] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const [ready, setReady] = useState(false);

  const root = rootMidiForVoice(voice) + START_HEIGHT_OFFSET[startHeight];
  const events = useMemo(() => {
    if (!pattern) return [];
    return buildPianoEvents(pattern, root, pattern.transposeSteps);
  }, [pattern, root]);

  const midis = useMemo(() => midisFromEvents(events), [events]);
  const phrase = useMemo(
    () => phraseMidisFromEvents(events, cursor),
    [events, cursor],
  );
  const { low, high } = useMemo(() => keyboardRange(midis), [midis]);
  const whites = useMemo(() => whiteKeysBetween(low, high), [low, high]);

  useEffect(() => {
    const synth = new PianoSynth();
    synthRef.current = synth;
    return () => {
      stopPlayback();
      synth.dispose();
      synthRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only
  }, []);

  useEffect(() => {
    stopPlayback();
    setCursor(0);
    setReady(false);
    const synth = synthRef.current;
    if (!synth || midis.length === 0) return;
    let cancelled = false;
    void (async () => {
      await synth.preloadRange(midis);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, voice, midis, startHeight]);

  function clearTimers() {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }

  function stopPlayback() {
    playingRef.current = false;
    clearTimers();
    synthRef.current?.stopAll();
    setPlaying(false);
    setResting(false);
    setActiveMidi(null);
  }

  async function playSequence(from = 0) {
    if (!pattern || events.length === 0) return;
    const synth = synthRef.current;
    if (!synth) return;
    await synth.ensure();
    if (!ready) await synth.preloadRange(midis);

    stopPlayback();
    playingRef.current = true;
    setPlaying(true);
    setCursor(from);

    const factor = TEMPO_FACTOR[tempo];
    const noteSec = pattern.noteSec * factor;
    const gapSec = pattern.gapSec * factor;

    let i = from;
    const tick = () => {
      if (!playingRef.current) return;
      if (i >= events.length) {
        setPlaying(false);
        setResting(false);
        setActiveMidi(null);
        playingRef.current = false;
        return;
      }

      const ev = events[i];
      setCursor(i);

      if (ev.kind === "rest") {
        setResting(true);
        setActiveMidi(null);
        i += 1;
        timersRef.current.push(window.setTimeout(tick, ev.sec * factor * 1000));
        return;
      }

      setResting(false);
      setActiveMidi(ev.midi);
      synth.playNote(ev.midi, noteSec * 0.9);
      i += 1;
      timersRef.current.push(window.setTimeout(tick, (noteSec + gapSec) * 1000));
    };
    tick();
  }

  async function tapKey(midi: number) {
    const synth = synthRef.current;
    if (!synth) return;
    await synth.ensure();
    if (playingRef.current) stopPlayback();
    setActiveMidi(midi);
    synth.playNote(midi, 0.55);
    timersRef.current.push(window.setTimeout(() => setActiveMidi(null), 360));
  }

  if (!pattern) return null;

  const progressLabel = resting
    ? "쉬는 중 · 숨 고르세요"
    : activeMidi != null
      ? noteLabel(activeMidi)
      : ready
        ? "건반을 누르거나 재생해 보세요"
        : "피아노 소리 준비 중…";

  return (
    <section className="overflow-hidden rounded-[24px] bg-white shadow-soft">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-[12px] font-bold text-brand-500">피아노 가이드</p>
          <p className="mt-0.5 text-[16px] font-extrabold text-gray-900">
            {pattern.label} 연습
          </p>
        </div>
        <p className="text-[12px] font-semibold text-gray-400">
          {Math.min(cursor + 1, events.length)}/{events.length}
        </p>
      </div>

      <div className="mt-4 px-5">
        {playing ? (
          <button
            type="button"
            onClick={stopPlayback}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gray-900 text-[16px] font-bold text-white transition active:opacity-90"
          >
            <i className="fa-solid fa-stop text-[12px]" />
            {resting ? "쉬는 중 · 정지" : "정지"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void playSequence(0)}
              className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-brand-500 text-[16px] font-bold text-white transition active:opacity-90"
            >
              <i className="fa-solid fa-play text-[12px]" />
              피아노로 재생
            </button>
            {cursor > 0 && cursor < events.length - 1 ? (
              <button
                type="button"
                onClick={() => void playSequence(cursor)}
                className="h-14 shrink-0 rounded-full bg-gray-100 px-5 text-[14px] font-bold text-gray-700 transition active:opacity-90"
              >
                이어서
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2 px-5">
        {(
          [
            ["female", "여자 음역"],
            ["male", "남자 음역"],
          ] as const
        ).map(([id, label]) => {
          const selected = voice === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setVoice(id)}
              className={`flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-left ${
                selected ? "bg-brand-50 ring-1 ring-brand-200" : "bg-gray-50"
              }`}
            >
              <span className="text-[14px] font-bold text-gray-900">{label}</span>
              {selected ? (
                <i className="fa-solid fa-circle-check text-[18px] text-brand-500" />
              ) : (
                <span className="h-[18px] w-[18px] rounded-full border border-gray-200" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 px-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-[12px] font-bold text-gray-500">시작음</p>
          <p className="text-[12px] font-semibold text-brand-500">{midiToNoteName(root)}</p>
        </div>
        <div className="flex gap-2">
          {(
            [
              ["low", "낮게"],
              ["mid", "보통"],
              ["high", "높게"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStartHeight(id)}
              className={`flex-1 rounded-[14px] py-2.5 text-[13px] font-bold ${
                startHeight === id
                  ? "bg-brand-500 text-white"
                  : "bg-gray-50 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2 px-5">
        {(
          [
            ["slow", "느리게"],
            ["normal", "보통"],
            ["fast", "빠르게"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTempo(id)}
            className={`flex-1 rounded-[14px] py-2.5 text-[13px] font-bold ${
              tempo === id
                ? "bg-brand-500 text-white"
                : "bg-gray-50 text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {resting ? (
        <p className="mt-3 px-5 text-center text-[13px] font-bold text-brand-500">
          쉬는 구간 · 호흡 가다듬고 다음 키 준비
        </p>
      ) : null}

      <div className="mt-4 px-4">
        <ScaleSheetMusic
          midis={phrase.midis.length ? phrase.midis : pattern.relative.map((r) => root + r)}
          activeMidi={activeMidi}
          activeIndex={resting ? null : phrase.noteInPhrase}
          resting={resting}
          phraseLabel={
            phrase.totalPhrases && phrase.totalPhrases > 1
              ? `${phrase.phraseIndex + 1}키 / ${phrase.totalPhrases}키`
              : undefined
          }
        />
      </div>

      <div className="relative mt-3 select-none px-4 pb-2">
        <div className="relative mx-auto flex h-[112px] w-full max-w-lg overflow-hidden rounded-[16px] bg-gray-50 px-2 pt-2">
          {whites.map((midi, idx) => {
            const on = activeMidi === midi;
            return (
              <button
                key={midi}
                type="button"
                onClick={() => void tapKey(midi)}
                className={`relative flex flex-1 flex-col items-center justify-end rounded-b-md border border-gray-200 pb-1.5 transition ${
                  on
                    ? "z-0 border-brand-300 bg-brand-100"
                    : "z-0 bg-white active:bg-gray-50"
                }`}
                style={{ marginLeft: idx === 0 ? 0 : -1 }}
                aria-label={noteLabel(midi)}
              >
                <span
                  className={`text-[9px] font-bold ${on ? "text-brand-600" : "text-gray-300"}`}
                >
                  {midi % 12 === 0 ? noteLabel(midi) : ""}
                </span>
              </button>
            );
          })}

          {whites.map((midi, idx) => {
            const black = midi + 1;
            if (!isBlackKey(black) || black > high) return null;
            const leftPct = ((idx + 0.68) / whites.length) * 100;
            const widthPct = (0.62 / whites.length) * 100;
            const on = activeMidi === black;
            return (
              <button
                key={`b-${black}`}
                type="button"
                onClick={() => void tapKey(black)}
                className={`absolute top-2 z-10 h-[62%] rounded-b-md shadow-sm transition ${
                  on ? "bg-brand-600" : "bg-gray-800 active:bg-gray-700"
                }`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                aria-label={noteLabel(black)}
              />
            );
          })}
        </div>
        <p className="mt-3 text-center text-[12px] text-gray-400">{progressLabel}</p>
        <p className="mt-1 pb-4 text-center text-[11px] text-gray-400">
          구절마다 쉬는 텀이 있어요
        </p>
      </div>
    </section>
  );
}
