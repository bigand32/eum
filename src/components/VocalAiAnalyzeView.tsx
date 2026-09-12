"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  generateMockVocalReport,
  saveVocalAiReportAsync,
  setVocalAiPro,
  syncVocalAiFromSupabase,
  VOCAL_AI_FEATURES,
  VOCAL_AI_PRO_PRICE_LABEL,
  type VocalAiReport,
  type VocalAiScores,
} from "@/lib/vocal-ai";
import { MUNGCHI } from "@/lib/mungchi";
import { useStudentId } from "@/lib/auth/use-student-id";

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

export function VocalAiAnalyzeView() {
  const studentId = useStudentId();
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

  useEffect(() => {
    void syncVocalAiFromSupabase(studentId || undefined).then(({ pro: p, history: h }) => {
      setPro(p);
      setHistory(h);
    });
  }, [studentId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRef.current?.stop();
    };
  }, []);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void finishAnalysis(Math.max(secondsRef.current, 8));
      };
      mediaRef.current = recorder;
      recorder.start();
      secondsRef.current = 0;
      setSeconds(0);
      setPhase("recording");
      timerRef.current = window.setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch {
      setError("마이크 권한이 필요해요. 브라우저 설정을 확인해 주세요.");
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

  async function finishAnalysis(durationSec: number) {
    setPhase("analyzing");
    await new Promise((r) => setTimeout(r, 1600));
    const next = generateMockVocalReport({
      title: "방금 녹음한 보컬",
      durationSec,
      seed: durationSec * 31 + Date.now() % 97,
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
    <div className="min-h-dvh bg-white pb-10">
      <header className="safe-top flex items-center justify-between px-4 py-3">
        <Link
          href="/challenges"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-gray-800"
          aria-label="뒤로"
        >
          <i className="fa-solid fa-chevron-left text-[14px]" />
        </Link>
        <h1 className="text-[16px] font-extrabold text-gray-900">AI 보컬 분석</h1>
        <span className="w-9" />
      </header>

      <section className="px-5 pt-2">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-600 to-brand-400 p-6 text-white">
          <p className="text-[13px] font-medium text-white/85">노래방 점수기보다 디테일하게</p>
          <h2 className="mt-1 text-[22px] font-extrabold leading-snug">
            녹음하면 AI가
            <br />
            음정·박자·발성까지 분석
          </h2>
          <p className="mt-3 max-w-[240px] text-[12px] leading-relaxed text-white/80">
            바이브 · 호흡 · 발음 정확도까지. 고급 리포트와 히스토리는 Pro.
          </p>
          <img
            src={MUNGCHI.analyze}
            alt=""
            className="pointer-events-none absolute right-2 bottom-2 h-24 w-24 object-contain opacity-95"
          />
        </div>
      </section>

      {phase === "idle" || phase === "recording" ? (
        <section className="mt-6 px-5">
          <div className="shadow-soft rounded-[24px] border border-gray-100 p-6 text-center">
            {phase === "recording" ? (
              <>
                <img
                  src={MUNGCHI.sing}
                  alt=""
                  className="mx-auto h-16 w-16 object-contain"
                />
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
                <img
                  src={MUNGCHI.idle}
                  alt=""
                  className="mx-auto h-20 w-20 object-contain"
                />
                <p className="mt-3 text-[16px] font-extrabold text-gray-900">보컬 녹음하기</p>
                <p className="mt-1 text-[13px] text-gray-500">
                  5~30초면 충분해요. 초보 루틴 직후 분석도 좋아요.
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
            <FeatureCard title={`Pro · ${VOCAL_AI_PRO_PRICE_LABEL}`} items={[...VOCAL_AI_FEATURES.pro]} highlight />
          </div>

          <Link
            href="/challenges"
            className="mt-4 block text-center text-[13px] font-bold text-brand-500"
          >
            초보 루틴 챌린지 하러 가기
          </Link>
        </section>
      ) : null}

      {phase === "analyzing" ? (
        <section className="mt-16 px-5 text-center">
          <img src={MUNGCHI.analyze} alt="" className="mx-auto h-20 w-20 object-contain" />
          <p className="mt-4 text-[16px] font-extrabold text-gray-900">AI가 분석 중이에요</p>
          <p className="mt-1 text-[13px] text-gray-500">음정 · 박자 · 음역 · 발성 습관 추출</p>
        </section>
      ) : null}

      {phase === "report" && report ? (
        <section className="mt-5 px-5">
          <div className="rounded-[24px] bg-surface p-5 text-center">
            <img src={MUNGCHI.win} alt="" className="mx-auto h-16 w-16 object-contain" />
            <p className="mt-2 text-[12px] font-bold text-brand-500">종합 점수</p>
            <p className="mt-1 text-[48px] font-extrabold tracking-tight text-gray-900">
              {report.scores.overall}
            </p>
            <p className="text-[13px] text-gray-500">{report.rangeLabel}</p>
            <p className="mt-3 text-[14px] leading-relaxed text-gray-700">{report.summary}</p>
          </div>

          <div className="mt-4 space-y-2">
            {FREE_KEYS.filter((k) => k !== "overall").map((key) => (
              <ScoreRow key={key} label={LABEL[key]} value={report.scores[key]} />
            ))}
            {PRO_KEYS.map((key) => (
              <ScoreRow
                key={key}
                label={LABEL[key]}
                value={report.scores[key]}
                locked={!pro}
              />
            ))}
          </div>

          <div className="mt-5 rounded-[20px] border border-gray-100 p-4">
            <p className="text-[13px] font-bold text-gray-900">잘한 점</p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-gray-600">
              {report.strengths.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] font-bold text-gray-900">보완 포인트</p>
            <ul className="mt-2 space-y-1.5 text-[13px] text-gray-600">
              {report.improvements.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-[20px] border border-amber-100 bg-amber-50/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-bold text-gray-900">고급 리포트 (Pro)</p>
              {!pro ? (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  LOCK
                </span>
              ) : null}
            </div>
            <ul
              className={`space-y-2 text-[13px] text-gray-700 ${pro ? "" : "select-none blur-[5px]"}`}
            >
              {report.proTips.map((t) => (
                <li key={t}>· {t}</li>
              ))}
            </ul>
            {!pro ? (
              <button
                type="button"
                onClick={unlockPro}
                className="mt-4 w-full rounded-full bg-gray-900 py-3 text-[14px] font-bold text-white"
              >
                Pro 체험 켜기 · {VOCAL_AI_PRO_PRICE_LABEL}
              </button>
            ) : null}
          </div>

          {pro ? (
            <div className="mt-5">
              <p className="mb-2 text-[13px] font-bold text-gray-900">히스토리</p>
              <div className="space-y-2">
                {history.slice(0, 5).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setReport(h)}
                    className="flex w-full items-center justify-between rounded-[16px] border border-gray-100 px-4 py-3 text-left"
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
                    <span className="text-[16px] font-extrabold text-brand-500">
                      {h.scores.overall}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-center text-[12px] text-gray-400">
              히스토리 트래킹은 Pro에서 열려요
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setReport(null);
              setSeconds(0);
            }}
            className="mt-6 w-full rounded-full border border-gray-200 py-3.5 text-[14px] font-bold text-gray-800"
          >
            다시 녹음하기
          </button>
          <Link
            href="/challenges/beginner-daily"
            className="mt-2 block text-center text-[13px] font-bold text-brand-500"
          >
            추천 루틴으로 보완하기
          </Link>
        </section>
      ) : null}
    </div>
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
        highlight ? "bg-gray-900 text-white" : "border border-gray-100 bg-white"
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
    <div className="flex items-center gap-3 rounded-[14px] bg-surface px-3.5 py-2.5">
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
