"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveMasterPricing } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";
import { useMasterId } from "@/lib/auth/use-master-id";
import { formatPrice } from "@/lib/db/schema";

type PriceField = "feedbackPrice" | "visitPrice";

const PRODUCTS: {
  key: PriceField;
  label: string;
  desc: string;
  icon: string;
  suffix: string;
  color: string;
}[] = [
  {
    key: "feedbackPrice",
    label: "음성/영상 피드백",
    desc: "비동기 · 구간별 코멘트",
    icon: "fa-microphone-lines",
    suffix: "원 / 건",
    color: "bg-brand-50 text-brand-500",
  },
  {
    key: "visitPrice",
    label: "방문 상담",
    desc: "대면 레슨 · 예약",
    icon: "fa-door-open",
    suffix: "원 / 회",
    color: "bg-violet-50 text-violet-600",
  },
];

function formatUpdatedAt(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function MasterPricingForm() {
  const router = useRouter();
  const db = useDb();
  const masterId = useMasterId();
  const master = db.masters.find((m) => m.id === masterId);

  const [feedbackPrice, setFeedbackPrice] = useState(20000);
  const [phonePrice15Min, setPhonePrice15Min] = useState(18000);
  const [phonePrice30Min, setPhonePrice30Min] = useState(30000);
  const [visitPrice, setVisitPrice] = useState(80000);
  const [visitDurationMin, setVisitDurationMin] = useState(60);
  const [saved, setSaved] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  const values: Record<PriceField, number> = {
    feedbackPrice,
    visitPrice,
  };

  const setters: Record<PriceField, (n: number) => void> = {
    feedbackPrice: setFeedbackPrice,
    visitPrice: setVisitPrice,
  };

  useEffect(() => {
    if (!master) return;
    setFeedbackPrice(master.pricing.feedbackPrice);
    setPhonePrice15Min(master.pricing.phonePrice15Min);
    setPhonePrice30Min(master.pricing.phonePrice30Min);
    setVisitPrice(master.pricing.visitPrice);
    setVisitDurationMin(master.pricing.visitDurationMin);
    setUpdatedAt(master.pricing.updatedAt);
  }, [master]);

  if (!master) return null;

  const bump = (key: PriceField, delta: number) => {
    setters[key](Math.max(0, values[key] + delta));
    setSaved(false);
  };

  const bumpPhone = (duration: 15 | 30, delta: number) => {
    if (duration === 15) setPhonePrice15Min((p) => Math.max(0, p + delta));
    else setPhonePrice30Min((p) => Math.max(0, p + delta));
    setSaved(false);
  };

  const handleSave = async () => {
    const next = await saveMasterPricing(master.id, {
      feedbackPrice,
      phonePrice15Min,
      phonePrice30Min,
      visitPrice,
      visitDurationMin,
    });
    if (next) setUpdatedAt(next.pricing.updatedAt);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <main className="flex flex-col gap-5 px-5 py-5 pb-28">
      <div className="rounded-[16px] border border-amber-100 bg-amber-50 px-4 py-3.5">
        <p className="text-[13px] leading-relaxed text-amber-900">
          <i className="fa-solid fa-circle-info mr-1.5 text-amber-500" />
          요금은 <strong>언제든 수정</strong>할 수 있어요. 이미 결제된 주문은 당시 금액이
          유지됩니다.
        </p>
        {updatedAt && (
          <p className="mt-2 text-[11px] text-amber-700/70">
            마지막 수정: {formatUpdatedAt(updatedAt)}
          </p>
        )}
      </div>

      {PRODUCTS.map((p) => (
        <section
          key={p.key}
          className="shadow-soft overflow-hidden rounded-[20px] border border-gray-100 bg-white"
        >
          <div className="flex items-center gap-3 border-b border-gray-50 px-4 py-3.5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${p.color}`}>
              <i className={`fa-solid ${p.icon}`} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">{p.label}</h3>
              <p className="text-[12px] text-gray-500">{p.desc}</p>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1000}
                value={values[p.key]}
                onChange={(e) => {
                  setters[p.key](Math.max(0, Number(e.target.value)));
                  setSaved(false);
                }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-[20px] font-extrabold tracking-tight outline-none focus:border-brand-500"
              />
              <span className="shrink-0 text-[13px] font-medium text-gray-500">{p.suffix}</span>
            </div>
            <div className="flex gap-2">
              {[1000, 5000, 10000].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => bump(p.key, d)}
                  className="flex-1 rounded-lg bg-surface py-2 text-[12px] font-bold text-gray-600 hover:bg-gray-100"
                >
                  +{(d / 1000).toLocaleString()}천
                </button>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="shadow-soft overflow-hidden rounded-[20px] border border-gray-100 bg-white">
        <div className="flex items-center gap-3 border-b border-gray-50 px-4 py-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <i className="fa-solid fa-phone" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">전화 상담</h3>
            <p className="text-[12px] text-gray-500">15·30분 · 예약 후 1:1 통화</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          {(
            [
              { duration: 15 as const, value: phonePrice15Min, set: setPhonePrice15Min },
              { duration: 30 as const, value: phonePrice30Min, set: setPhonePrice30Min },
            ] as const
          ).map(({ duration, value, set }) => (
            <div key={duration}>
              <label className="mb-2 block text-[12px] font-semibold text-gray-500">
                {duration}분
              </label>
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={value}
                  onChange={(e) => {
                    set(Math.max(0, Number(e.target.value)));
                    setSaved(false);
                  }}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[18px] font-extrabold outline-none focus:border-brand-500"
                />
                <span className="shrink-0 text-[12px] text-gray-500">원</span>
              </div>
              <div className="flex gap-1">
                {[1000, 5000].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => bumpPhone(duration, d)}
                    className="flex-1 rounded-lg bg-surface py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100"
                  >
                    +{(d / 1000).toLocaleString()}천
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-4">
        <h3 className="mb-4 text-[14px] font-bold text-gray-900">방문 상담 시간</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={30}
            step={15}
            value={visitDurationMin}
            onChange={(e) => {
              setVisitDurationMin(Number(e.target.value));
              setSaved(false);
            }}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[16px] font-bold outline-none"
          />
          <span className="shrink-0 text-[13px] text-gray-500">분</span>
        </div>
      </section>

      <section className="rounded-[20px] bg-gray-900 p-4 text-white">
        <p className="mb-3 text-[11px] font-bold tracking-wide text-gray-400">
          수강생 프로필 미리보기
        </p>
        <div className="flex flex-col gap-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-gray-400">피드백</span>
            <span className="font-bold">{formatPrice(feedbackPrice)}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">전화 상담 15분</span>
            <span className="font-bold">{formatPrice(phonePrice15Min)}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">전화 상담 30분</span>
            <span className="font-bold">{formatPrice(phonePrice30Min)}원</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">방문 상담</span>
            <span className="font-bold">
              {formatPrice(visitPrice)}원 · {visitDurationMin}분
            </span>
          </div>
        </div>
        <Link
          href={`/masters/${master.id}`}
          className="mt-4 flex items-center justify-center gap-1 rounded-xl bg-white/10 py-2.5 text-[12px] font-bold text-white hover:bg-white/15"
        >
          프로필에서 확인하기
          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
        </Link>
      </section>

      <button
        type="button"
        onClick={handleSave}
        className={`w-full rounded-xl py-4 text-[15px] font-bold text-white transition-colors ${
          saved ? "bg-green-600" : "bg-master-500 hover:bg-indigo-700"
        }`}
      >
        {saved ? (
          <>
            <i className="fa-solid fa-check mr-1.5" />
            저장됐어요
          </>
        ) : (
          "요금 저장하기"
        )}
      </button>

      <button
        type="button"
        onClick={() => router.push("/master")}
        className="text-center text-[13px] font-medium text-gray-400 hover:text-gray-600"
      >
        마스터 홈으로
      </button>
    </main>
  );
}
