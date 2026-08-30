"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  GENRE_OPTIONS,
  PROBLEM_OPTIONS,
  STYLE_OPTIONS,
  saveOnboardingPrefs,
} from "@/lib/onboarding";

export function OnboardingView() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [genre, setGenre] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [style, setStyle] = useState("");
  const [finishing, setFinishing] = useState(false);

  const toggleProblem = (item: string) => {
    setProblems((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item],
    );
  };

  const finish = () => {
    setFinishing(true);
    saveOnboardingPrefs({ genre, problems, style });
    setTimeout(() => router.replace("/"), 1200);
  };

  if (finishing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute h-20 w-20 animate-ping rounded-full bg-brand-100" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-2xl text-white">
            <i className="fa-solid fa-check" />
          </div>
        </div>
        <h2 className="text-[22px] font-extrabold text-gray-900">맞춤 추천 준비 완료!</h2>
        <p className="mt-2 text-[14px] text-gray-500">딱 맞는 마스터를 찾아드릴게요</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white px-6 pt-12 pb-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
          className="text-xl text-gray-400"
          aria-label="뒤로"
        >
          <i className="fa-solid fa-chevron-left" />
        </button>
        <div className="text-[14px] font-bold text-brand-500">{step} / 3</div>
      </div>

      {step === 1 && (
        <>
          <h1 className="mb-2 text-[24px] leading-tight font-extrabold text-gray-900">
            어떤 <span className="text-brand-500">장르</span>의 코칭을
            <br />
            원하시나요?
          </h1>
          <p className="mb-8 text-[14px] font-medium text-gray-500">
            관심 분야를 알려주시면 딱 맞는 마스터를 추천해 드려요.
          </p>
          <div className="mb-auto grid grid-cols-2 gap-3">
            {GENRE_OPTIONS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGenre(g.id)}
                className={`flex h-28 flex-col items-center justify-center rounded-[20px] border transition ${
                  genre === g.id
                    ? "border-brand-500 bg-brand-50 text-brand-600"
                    : "border-gray-200 text-gray-700"
                }`}
              >
                <i className={`fa-solid ${g.icon} mb-3 text-2xl`} />
                <span className="text-[15px] font-bold">{g.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!genre}
            onClick={() => setStep(2)}
            className="mt-8 h-14 w-full rounded-[16px] bg-brand-500 text-[16px] font-bold text-white shadow-lg shadow-brand-500/30 disabled:opacity-40"
          >
            다음으로
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="mb-2 text-[24px] leading-tight font-extrabold text-gray-900">
            현재 가장 해결하고 싶은
            <br />
            <span className="text-brand-500">고민</span>은 무엇인가요?
          </h1>
          <p className="mb-8 text-[14px] font-medium text-gray-500">중복 선택이 가능해요.</p>
          <div className="mb-auto flex flex-col gap-3">
            {PROBLEM_OPTIONS.map((item) => {
              const active = problems.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleProblem(item)}
                  className={`flex w-full items-center justify-between rounded-[16px] border p-4 text-left transition ${
                    active ? "border-brand-500 bg-brand-50" : "border-gray-200"
                  }`}
                >
                  <span
                    className={`text-[15px] font-semibold ${active ? "text-brand-600" : "text-gray-700"}`}
                  >
                    {item}
                  </span>
                  <i
                    className={`fa-solid fa-check ${active ? "text-brand-500" : "text-gray-300"}`}
                  />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={problems.length === 0}
            onClick={() => setStep(3)}
            className="mt-4 h-14 w-full shrink-0 rounded-[16px] bg-brand-500 text-[16px] font-bold text-white shadow-lg shadow-brand-500/30 disabled:opacity-40"
          >
            다음으로
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="mb-2 text-[24px] leading-tight font-extrabold text-gray-900">
            선호하는 <span className="text-brand-500">코칭 스타일</span>은?
          </h1>
          <p className="mb-8 text-[14px] font-medium text-gray-500">하나를 선택해 주세요.</p>
          <div className="mb-auto flex flex-col gap-3">
            {STYLE_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`flex items-center gap-4 rounded-[16px] border p-4 text-left transition ${
                  style === s.id ? "border-brand-500 bg-brand-50" : "border-gray-200"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${style === s.id ? "bg-brand-500 text-white" : "bg-surface text-gray-500"}`}
                >
                  <i className={`fa-solid ${s.icon}`} />
                </div>
                <span
                  className={`text-[15px] font-bold ${style === s.id ? "text-brand-600" : "text-gray-800"}`}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!style}
            onClick={finish}
            className="mt-4 h-14 w-full rounded-[16px] bg-brand-500 text-[16px] font-bold text-white shadow-lg shadow-brand-500/30 disabled:opacity-40"
          >
            eum 시작하기
          </button>
        </>
      )}
    </div>
  );
}
