"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import {
  centsBetween,
  detectPitchAutocorrelation,
  frequencyToNoteName,
  rmsFromTimeDomain,
} from "@/lib/pitch/pitchUtils";

export type PitchEngine = "pitchy" | "autocorr";

export type PitchFrame = {
  hz: number | null;
  note: string;
  clarity: number;
  rms: number;
  centsFrom?: number;
};

type Options = {
  engine?: PitchEngine;
  bufferSize?: 2048 | 4096;
  /** RMS 이하면 무음으로 처리 */
  rmsThreshold?: number;
  clarityThreshold?: number;
  /** 비교용 목표 Hz (센트 계산) */
  targetHz?: number | null;
  enabled?: boolean;
};

export function usePitchDetection(options: Options = {}) {
  const {
    engine = "pitchy",
    bufferSize = 2048,
    rmsThreshold = 0.012,
    clarityThreshold = 0.85,
    targetHz = null,
    enabled = true,
  } = options;

  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState<PitchFrame>({
    hz: null,
    note: "—",
    clarity: 0,
    rms: 0,
  });
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const floatBufRef = useRef<Float32Array | null>(null);
  const targetHzRef = useRef(targetHz);
  const engineRef = useRef(engine);

  useEffect(() => {
    targetHzRef.current = targetHz;
  }, [targetHz]);
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    analyserRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = bufferSize;
      analyser.smoothingTimeConstant = 0.2;
      source.connect(analyser);
      analyserRef.current = analyser;

      const size = analyser.fftSize;
      floatBufRef.current = new Float32Array(size);
      detectorRef.current = PitchDetector.forFloat32Array(size);

      setListening(true);

      const tick = () => {
        const a = analyserRef.current;
        const buf = floatBufRef.current;
        const det = detectorRef.current;
        if (!a || !buf) return;

        a.getFloatTimeDomainData(buf as unknown as Float32Array<ArrayBuffer>);
        const rms = rmsFromTimeDomain(buf);

        if (rms < rmsThreshold) {
          setFrame({ hz: null, note: "—", clarity: 0, rms });
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        let frequency = -1;
        let clarity = 0;

        if (engineRef.current === "pitchy" && det) {
          const result = det.findPitch(buf as unknown as Float32Array<ArrayBuffer>, ctx.sampleRate);
          frequency = result[0];
          clarity = result[1];
        } else {
          const result = detectPitchAutocorrelation(buf, ctx.sampleRate, {
            clarityMin: clarityThreshold,
          });
          frequency = result.frequency;
          clarity = result.clarity;
        }

        if (clarity < clarityThreshold || frequency <= 0) {
          setFrame({ hz: null, note: "—", clarity, rms });
        } else {
          const note = frequencyToNoteName(frequency);
          const t = targetHzRef.current;
          const next: PitchFrame = {
            hz: frequency,
            note,
            clarity,
            rms,
            centsFrom: t ? centsBetween(frequency, t) : undefined,
          };
          setFrame(next);
          setDebugLog((prev) =>
            [`${note} ${frequency.toFixed(1)}Hz c=${clarity.toFixed(2)}`, ...prev].slice(0, 8),
          );
          if (process.env.NODE_ENV === "development") {
            // MVP 확인용
            // eslint-disable-next-line no-console
            console.debug("[pitch]", next);
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("마이크 권한이 필요해요. 브라우저 설정을 확인해 주세요.");
      setListening(false);
    }
  }, [bufferSize, clarityThreshold, rmsThreshold, stop]);

  useEffect(() => {
    if (!enabled && listening) stop();
    return () => stop();
  }, [enabled, listening, stop]);

  return {
    listening,
    error,
    frame,
    debugLog,
    start,
    stop,
    engine,
  };
}
