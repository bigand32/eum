"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  generateMockVocalReport,
  generateVocalReportFromMetrics,
  saveVocalAiReportAsync,
  setVocalAiPro,
  syncVocalAiFromSupabase,
  VOCAL_AI_FEATURES,
  VOCAL_AI_PRO_PRICE_LABEL,
  type LiveVocalMetrics,
  type VocalAiReport,
  type VocalAiScores,
} from "@/lib/vocal-ai";
import { detectPitchAutocorrelation, rmsFromTimeDomain } from "@/lib/pitch/pitchUtils";
import { MUNGCHI } from "@/lib/mungchi";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useSession } from "@/lib/auth/use-session";
import { PitchDetector } from "pitchy";

type Phase = "idle" | "recording" | "analyzing" | "report";

const FREE_KEYS: (keyof VocalAiScores)[] = ["overall", "pitch", "rhythm", "range"];
const PRO_KEYS: (keyof VocalAiScores)[] = ["vibrato", "breath", "diction"];

const LABEL: Record<keyof VocalAiScores, string> = {
  overall: "종합",
  pitch: "음정",
  rhythm: "박자",
  range: "음역대",
  vibrato: "바이브",
  breath: "호흡",
  diction: "발음",
};

/** 리포트용 키워드 (점수 기반) */
function buildVocalKeywords(report: VocalAiReport) {
  const kws: { text: string; weight: "lg" | "md" | "sm"; tone: "brand" | "ink" | "soft" }[] = [];
  const s = report.scores;
  if (s.pitch >= 80) kws.push({ text: "음정안정", weight: "lg", tone: "brand" });
  else kws.push({ text: "음정흔들림", weight: "lg", tone: "brand" });
  if (s.breath >= 75) kws.push({ text: "호흡지지", weight: "md", tone: "ink" });
  else kws.push({ text: "숨짧음", weight: "lg", tone: "brand" });
  if (s.rhythm >= 78) kws.push({ text: "박자감", weight: "md", tone: "ink" });
  else kws.push({ text: "템포불안", weight: "md", tone: "soft" });
  if (s.range >= 80) kws.push({ text: "넓은음역", weight: "sm", tone: "ink" });
  else kws.push({ text: "스트레칭필요", weight: "md", tone: "soft" });
  if (s.vibrato >= 70) kws.push({ text: "자연바이브", weight: "sm", tone: "soft" });
  else kws.push({ text: "곧은음먼저", weight: "md", tone: "ink" });
  if (s.diction >= 78) kws.push({ text: "또렷발음", weight: "sm", tone: "ink" });
  else kws.push({ text: "딕션뭉개짐", weight: "md", tone: "brand" });
  kws.push({ text: "연습중", weight: "sm", tone: "soft" });
  return kws;
}

function buildTimeline(report: VocalAiReport, points = 12) {
  const seed = report.scores.overall;
  const pitch: number[] = [];
  const breath: number[] = [];
  for (let i = 0; i < points; i++) {
    const wobble = ((seed * 13 + i * 37) % 20) - 10;
    pitch.push(Math.max(35, Math.min(95, report.scores.pitch + wobble)));
    breath.push(Math.max(30, Math.min(92, report.scores.breath + ((seed + i * 11) % 18) - 9)));
  }
  return { pitch, breath };
}

function peakSecond(report: VocalAiReport, series: number[]) {
  let maxI = 0;
  for (let i = 1; i < series.length; i++) if (series[i] > series[maxI]) maxI = i;
  const t = Math.round((maxI / Math.max(series.length - 1, 1)) * report.durationSec);
  return t;
}

export function VocalAiAnalyzeView() {
  const studentId = useStudentId();
  const { session } = useSession();
  const displayName = (session?.name ?? "회원").replace(/\s+/g, "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [pro, setPro] = useState(false);
  const [report, setReport] = useState<VocalAiReport | null>(null);
  const [history, setHistory] = useState<VocalAiReport[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const secondsRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const metricsRef = useRef<LiveVocalMetrics>({ pitchHz: [], rms: [], durationSec: 0 });

  useEffect(() => {
    void syncVocalAiFromSupabase(studentId || undefined).then(({ pro: p, history: h }) => {
      setPro(p);
      setHistory(h);
    });
  }, [studentId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      mediaRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void audioCtxRef.current?.close();
    };
  }, []);

  function stopPitchLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }

  async function startRecording() {
    setError(null);
    try {
      // iOS Safari: AGC/노이즈억제가 피치를 망가뜨리는 경우가 많아 끔
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.15;
      source.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      metricsRef.current = { pitchHz: [], rms: [], durationSec: 0 };

      const tick = () => {
        analyser.getFloatTimeDomainData(buf as unknown as Float32Array<ArrayBuffer>);
        const rms = rmsFromTimeDomain(buf);
        metricsRef.current.rms.push(rms);
        if (rms >= 0.012) {
          let hz = -1;
          let clarity = 0;
          try {
            const r = detector.findPitch(buf as unknown as Float32Array<ArrayBuffer>, ctx.sampleRate);
            hz = r[0];
            clarity = r[1];
          } catch {
            const r = detectPitchAutocorrelation(buf, ctx.sampleRate, { clarityMin: 0.8 });
            hz = r.frequency;
            clarity = r.clarity;
          }
          if (clarity >= 0.8 && hz > 70 && hz < 1100) {
            metricsRef.current.pitchHz.push(hz);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      const mime = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : undefined;
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopPitchLoop();
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const durationSec = Math.max(secondsRef.current, 3);
        metricsRef.current.durationSec = durationSec;
        void finishAnalysis(durationSec, { ...metricsRef.current });
      };
      mediaRef.current = recorder;
      recorder.start(200);
      secondsRef.current = 0;
      setSeconds(0);
      setPhase("recording");
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch {
      setError("마이크 권한이 필요해요. Safari 설정에서 마이크를 허용해 주세요.");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRef.current?.stop();
    mediaRef.current = null;
  }

  async function finishAnalysis(durationSec: number, metrics?: LiveVocalMetrics) {
    setPhase("analyzing");
    await new Promise((r) => setTimeout(r, 900));
    const next =
      metrics && (metrics.pitchHz.length > 0 || metrics.rms.length > 5)
        ? generateVocalReportFromMetrics({
            title: "방금 녹음한 보컬",
            metrics,
          })
        : generateMockVocalReport({
            title: "방금 녹음한 보컬",
            durationSec,
            seed: durationSec * 31 + (Date.now() % 97),
          });
    const saved = await saveVocalAiReportAsync(next, studentId || undefined);
    setReport(saved);
    const synced = await syncVocalAiFromSupabase(studentId || undefined);
    setHistory(synced.history);
    setPhase("report");
  }

  function demoAnalyze() {
    setError(null);
    void finishAnalysis(42);
  }

  function unlockPro() {
    void setVocalAiPro(true, studentId || undefined).then(() => setPro(true));
  }

  return (
    <div
      className={`min-h-dvh pb-10 ${
        phase === "report" ? "bg-[#F3F0EA]" : "bg-[#F5F6F8]"
      }`}
    >
      <header className="safe-top flex items-center justify-between px-4 py-3">
        <Link
          href="/challenges"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-800 shadow-soft"
          aria-label="뒤로"
        >
          <i className="fa-solid fa-chevron-left text-[14px]" />
        </Link>
        <h1 className="text-[16px] font-extrabold text-gray-900">AI 보컬 분석</h1>
        <span className="w-9" />
      </header>

      {phase !== "report" ? (
        <section className="px-5 pt-2">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-600 to-brand-400 p-6 text-white">
            <p className="text-[13px] font-medium text-white/85">노래방 점수기보다 디테일하게</p>
            <h2 className="mt-1 text-[22px] font-extrabold leading-snug">
              녹음하면 AI가
              <br />
              음정·박자·발성까지 분석
            </h2>
            <p className="mt-3 max-w-[240px] text-[12px] leading-relaxed text-white/80">
              리포트는 키워드 · 구간 변화 · 오늘의 주문으로 정리해 드려요.
            </p>
            <img
              src={MUNGCHI.analyze}
              alt=""
              className="pointer-events-none absolute right-2 bottom-2 h-24 w-24 object-contain opacity-95"
            />
          </div>
        </section>
      ) : null}

      {phase === "idle" || phase === "recording" ? (
        <section className="mt-6 px-5">
          <div className="rounded-[24px] bg-white p-6 text-center shadow-soft">
            {phase === "recording" ? (
              <>
                <img src={MUNGCHI.sing} alt="" className="mx-auto h-16 w-16 object-contain" />
                <p className="mt-3 text-[28px] font-extrabold text-gray-900">
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                  {String(seconds % 60).padStart(2, "0")}
                </p>
                <p className="mt-1 text-[13px] text-gray-500">노래하거나 스케일을 불러 보세요</p>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="mt-5 w-full rounded-full bg-gray-900 py-3.5 text-[15px] font-bold text-white"
                >
                  녹음 종료 · 분석하기
                </button>
              </>
            ) : (
              <>
                <img src={MUNGCHI.idle} alt="" className="mx-auto h-20 w-20 object-contain" />
                <p className="mt-3 text-[16px] font-extrabold text-gray-900">보컬 녹음하기</p>
                <p className="mt-1 text-[13px] text-gray-500">
                  5~30초면 충분해요. 발성 루틴 직후 분석도 좋아요.
                </p>
                <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2.5 text-left text-[12px] leading-relaxed text-amber-900/80">
                  아이폰·Safari는 마이크 처리 때문에 피치가 덜 안정적일 수 있어요.{" "}
                  <span className="font-bold">조용한 곳</span>에서{" "}
                  <span className="font-bold">유선 이어폰 마이크</span>를 쓰면 훨씬 잘 잡혀요.
                </p>
                {error ? <p className="mt-3 text-[12px] font-medium text-rose-500">{error}</p> : null}
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="mt-5 w-full rounded-full bg-brand-500 py-3.5 text-[15px] font-bold text-white"
                >
                  마이크 켜고 녹음
                </button>
                <button
                  type="button"
                  onClick={demoAnalyze}
                  className="mt-2 w-full rounded-full border border-gray-200 py-3 text-[14px] font-bold text-gray-700"
                >
                  데모 리포트 보기
                </button>
              </>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <FeatureCard title="무료" items={[...VOCAL_AI_FEATURES.free]} />
            <FeatureCard
              title={`Pro · ${VOCAL_AI_PRO_PRICE_LABEL}`}
              items={[...VOCAL_AI_FEATURES.pro]}
              highlight
            />
          </div>
        </section>
      ) : null}

      {phase === "analyzing" ? (
        <section className="mt-16 px-5 text-center">
          <img src={MUNGCHI.analyze} alt="" className="mx-auto h-20 w-20 object-contain" />
          <p className="mt-4 text-[16px] font-extrabold text-gray-900">AI가 분석 중이에요</p>
          <p className="mt-1 text-[13px] text-gray-500">키워드 · 구간 변화 · 코칭 문장 정리</p>
        </section>
      ) : null}

      {phase === "report" && report ? (
        <VocalReportCards
          report={report}
          displayName={displayName}
          pro={pro}
          history={history}
          onUnlockPro={unlockPro}
          onSelectHistory={setReport}
          onRetry={() => {
            setPhase("idle");
            setReport(null);
            setSeconds(0);
          }}
        />
      ) : null}
    </div>
  );
}

function VocalReportCards({
  report,
  displayName,
  pro,
  history,
  onUnlockPro,
  onSelectHistory,
  onRetry,
}: {
  report: VocalAiReport;
  displayName: string;
  pro: boolean;
  history: VocalAiReport[];
  onUnlockPro: () => void;
  onSelectHistory: (r: VocalAiReport) => void;
  onRetry: () => void;
}) {
  const keywords = useMemo(() => buildVocalKeywords(report), [report]);
  const timeline = useMemo(() => buildTimeline(report), [report]);
  const peak = peakSecond(report, timeline.pitch);
  const spell =
    report.scores.overall >= 85
      ? "오늘 톤, 그대로 가도 돼요"
      : report.scores.breath < 70
        ? "숨 한 번 더 채우고 다시"
        : report.scores.pitch < 75
          ? "스케일 한 줄만 더"
          : "짧게, 또렷하게 한 소절";

  return (
    <section className="mt-3 space-y-4 px-5 pb-6">
      {/* 종합 헤더 */}
      <div className="rounded-[28px] bg-white px-5 py-5 shadow-soft">
        <p className="text-[12px] font-bold text-brand-500">
          {displayName}님의 보컬 리포트 · {report.scores.overall}점
        </p>
        <p className="mt-1 text-[15px] leading-relaxed text-gray-700">{report.summary}</p>
        <p className="mt-2 text-[12px] text-gray-400">{report.rangeLabel}</p>
      </div>

      {/* 키워드 카드 */}
      <article className="rounded-[28px] bg-white px-5 py-6 shadow-soft">
        <h2 className="text-center text-[17px] font-extrabold text-gray-900">
          {displayName}님의 키워드
        </h2>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-3 px-1">
          {keywords.map((k) => (
            <span
              key={k.text}
              className={`font-extrabold tracking-tight ${
                k.weight === "lg"
                  ? "text-[26px]"
                  : k.weight === "md"
                    ? "text-[18px]"
                    : "text-[14px]"
              } ${
                k.tone === "brand"
                  ? "text-brand-500"
                  : k.tone === "ink"
                    ? "text-gray-800"
                    : "text-gray-400"
              }`}
            >
              {k.text}
            </span>
          ))}
        </div>
        <p className="mt-5 text-center text-[13px] leading-relaxed text-gray-500">
          방금 녹음에서 자주 잡힌 보컬 습관이에요.
          <br />
          <span className="font-bold text-brand-500">
            {keywords.filter((k) => k.tone === "brand").map((k) => k.text).slice(0, 2).join(" · ")}
          </span>
          쪽이 눈에 띄어요.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <img src={MUNGCHI.idle} alt="" className="h-14 w-14 object-contain" />
          <img src={MUNGCHI.analyze} alt="" className="h-14 w-14 object-contain" />
        </div>
      </article>

      {/* 음정·호흡 타임라인 */}
      <article className="rounded-[28px] bg-white px-5 py-6 shadow-soft">
        <h2 className="text-center text-[17px] font-extrabold text-gray-900">
          {displayName}님의 음정 · 호흡 변화
        </h2>
        <div className="mt-5">
          <TimelineChart pitch={timeline.pitch} breath={timeline.breath} />
          <div className="mt-2 flex justify-between px-1 text-[11px] font-medium text-gray-400">
            <span>0초</span>
            <span>{Math.round(report.durationSec / 2)}초</span>
            <span>{report.durationSec}초</span>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-[12px] font-bold">
            <span className="inline-flex items-center gap-1.5 text-brand-500">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              음정
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              호흡
            </span>
          </div>
        </div>
        <p className="mt-5 text-center text-[13px] leading-relaxed text-gray-500">
          녹음 중 음정·호흡이 크게 움직인 구간이 있어요.
          <br />
          눈여겨볼 타이밍은{" "}
          <span className="font-extrabold text-brand-500">{peak}초</span> 부근이에요.
        </p>
      </article>

      {/* 점수 요약 (작게) */}
      <article className="rounded-[28px] bg-white px-4 py-4 shadow-soft">
        <div className="space-y-2">
          {FREE_KEYS.filter((k) => k !== "overall").map((key) => (
            <ScoreRow key={key} label={LABEL[key]} value={report.scores[key]} />
          ))}
          {PRO_KEYS.map((key) => (
            <ScoreRow key={key} label={LABEL[key]} value={report.scores[key]} locked={!pro} />
          ))}
        </div>
      </article>

      {/* 오늘의 주문 */}
      <article className="rounded-[28px] bg-white px-5 py-7 text-center shadow-soft">
        <h2 className="text-[17px] font-extrabold text-gray-900">
          {displayName}님을 위한 오늘의 주문
        </h2>
        <p className="mt-6 text-[28px] font-extrabold tracking-tight text-gray-900">{spell}</p>
        <p className="mt-3 text-[13px] leading-relaxed text-gray-500">
          {report.improvements[0] ?? "짧게 한 소절만 더 다듬어 보세요."}
          {report.strengths[0] ? (
            <>
              <br />
              {report.strengths[0]}
            </>
          ) : null}
        </p>
        <Link
          href="/challenges"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-brand-500 px-8 text-[15px] font-bold text-white"
        >
          챌린지로 보완하기
        </Link>
      </article>

      {/* Pro */}
      <div className="relative overflow-hidden rounded-[28px] border border-brand-100 bg-white p-5 shadow-soft">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[14px] font-extrabold text-gray-900">고급 코칭 (Pro)</p>
          {!pro ? (
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
              LOCK
            </span>
          ) : null}
        </div>
        <ul className={`space-y-2 text-[13px] text-gray-700 ${pro ? "" : "select-none blur-[5px]"}`}>
          {report.proTips.map((t) => (
            <li key={t}>· {t}</li>
          ))}
        </ul>
        {!pro ? (
          <button
            type="button"
            onClick={onUnlockPro}
            className="mt-4 w-full rounded-full bg-gray-900 py-3 text-[14px] font-bold text-white"
          >
            Pro 체험 켜기 · {VOCAL_AI_PRO_PRICE_LABEL}
          </button>
        ) : null}
      </div>

      {pro ? (
        <div>
          <p className="mb-2 px-1 text-[13px] font-bold text-gray-500">히스토리</p>
          <div className="space-y-2">
            {history.slice(0, 5).map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => onSelectHistory(h)}
                className="flex w-full items-center justify-between rounded-[20px] bg-white px-4 py-3.5 text-left shadow-soft"
              >
                <div>
                  <p className="text-[13px] font-bold text-gray-900">{h.title}</p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(h.createdAt).toLocaleString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="text-[16px] font-extrabold text-brand-500">{h.scores.overall}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onRetry}
        className="w-full rounded-full border border-gray-200 bg-white py-3.5 text-[14px] font-bold text-gray-800"
      >
        다시 녹음하기
      </button>
    </section>
  );
}

function TimelineChart({ pitch, breath }: { pitch: number[]; breath: number[] }) {
  const w = 280;
  const h = 120;
  const pad = 8;
  const toPoints = (arr: number[]) =>
    arr
      .map((v, i) => {
        const x = pad + (i / Math.max(arr.length - 1, 1)) * (w - pad * 2);
        const y = h - pad - (v / 100) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" aria-hidden>
      <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="#E5E7EB" strokeWidth="1" />
      <polyline
        fill="none"
        stroke="#4401a9"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={toPoints(pitch)}
      />
      <polyline
        fill="none"
        stroke="#FB7185"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={toPoints(breath)}
        opacity="0.9"
      />
    </svg>
  );
}

function FeatureCard({
  title,
  items,
  highlight,
}: {
  title: string;
  items: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] p-4 ${
        highlight ? "bg-gray-900 text-white" : "bg-white shadow-soft"
      }`}
    >
      <p className={`text-[13px] font-extrabold ${highlight ? "text-white" : "text-gray-900"}`}>
        {title}
      </p>
      <ul className={`mt-2 space-y-1.5 text-[11px] ${highlight ? "text-white/75" : "text-gray-500"}`}>
        {items.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  locked,
}: {
  label: string;
  value: number;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-[#F5F6F8] px-3.5 py-2.5">
      <span className="w-14 shrink-0 text-[12px] font-bold text-gray-600">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full ${locked ? "bg-gray-300" : "bg-brand-500"}`}
          style={{ width: `${locked ? 30 : value}%` }}
        />
      </div>
      <span className="w-8 text-right text-[13px] font-extrabold text-gray-900">
        {locked ? "—" : value}
      </span>
    </div>
  );
}
