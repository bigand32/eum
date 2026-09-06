"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ensureMasterProfile, loadMaster, saveMasterPricing } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";
import { useDbReady } from "@/lib/db/db-provider";
import { useMasterId } from "@/lib/auth/use-master-id";
import { useSession } from "@/lib/auth/use-session";
import { getSession, setSession } from "@/lib/auth/session";
import type { Master } from "@/lib/db/schema";

function PriceRow({
  label,
  hint,
  value,
  unit,
  onChange,
  step = 1000,
  min = 0,
}: {
  label: string;
  hint?: string;
  value: number;
  unit: string;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-gray-900">{label}</p>
        {hint ? <p className="mt-0.5 text-[12px] text-gray-400">{hint}</p> : null}
      </div>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="w-[7.5rem] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-right text-[16px] font-bold tabular-nums text-gray-900 outline-none focus:border-gray-400"
      />
      <span className="w-6 shrink-0 text-[13px] text-gray-500">{unit}</span>
    </div>
  );
}

function MasterPricingFields({ master }: { master: Master }) {
  const [feedbackPrice, setFeedbackPrice] = useState(master.pricing.feedbackPrice);
  const [feedbackAdditionalPrice, setFeedbackAdditionalPrice] = useState(
    master.pricing.feedbackAdditionalPrice ?? master.pricing.feedbackPrice,
  );
  const [phonePrice15Min, setPhonePrice15Min] = useState(master.pricing.phonePrice15Min);
  const [phonePrice30Min, setPhonePrice30Min] = useState(master.pricing.phonePrice30Min);
  const [visitPrice, setVisitPrice] = useState(master.pricing.visitPrice);
  const [visitDurationMin, setVisitDurationMin] = useState(master.pricing.visitDurationMin);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setFeedbackPrice(master.pricing.feedbackPrice);
    setFeedbackAdditionalPrice(
      master.pricing.feedbackAdditionalPrice ?? master.pricing.feedbackPrice,
    );
    setPhonePrice15Min(master.pricing.phonePrice15Min);
    setPhonePrice30Min(master.pricing.phonePrice30Min);
    setVisitPrice(master.pricing.visitPrice);
    setVisitDurationMin(master.pricing.visitDurationMin);
  }, [master.pricing]);

  const markDirty = () => setSaved(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const next = await saveMasterPricing(master.id, {
        feedbackPrice,
        feedbackAdditionalPrice,
        feedbackIncludedMin: 5,
        feedbackExtraPer5Min: 0,
        phonePrice15Min,
        phonePrice30Min,
        visitPrice,
        visitDurationMin,
      });
      if (!next) {
        setSaveError("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaveError("저장에 실패했어요. 네트워크를 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex flex-col gap-6 px-5 py-5 pb-4">
      <section>
        <h2 className="mb-1 px-1 text-[13px] font-bold text-gray-500">피드백</h2>
        <div className="rounded-2xl border border-gray-100 bg-white px-4 divide-y divide-gray-50">
          <PriceRow
            label="첫 피드백"
            hint="학생이 처음 보낼 때"
            value={feedbackPrice}
            unit="원"
            onChange={(n) => {
              setFeedbackPrice(n);
              markDirty();
            }}
          />
          <PriceRow
            label="추가 피드백"
            hint="한 번 더 보낼 때"
            value={feedbackAdditionalPrice}
            unit="원"
            onChange={(n) => {
              setFeedbackAdditionalPrice(n);
              markDirty();
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 px-1 text-[13px] font-bold text-gray-500">전화</h2>
        <div className="rounded-2xl border border-gray-100 bg-white px-4 divide-y divide-gray-50">
          <PriceRow
            label="15분"
            value={phonePrice15Min}
            unit="원"
            onChange={(n) => {
              setPhonePrice15Min(n);
              markDirty();
            }}
          />
          <PriceRow
            label="30분"
            value={phonePrice30Min}
            unit="원"
            onChange={(n) => {
              setPhonePrice30Min(n);
              markDirty();
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 px-1 text-[13px] font-bold text-gray-500">방문</h2>
        <div className="rounded-2xl border border-gray-100 bg-white px-4 divide-y divide-gray-50">
          <PriceRow
            label="1회 요금"
            value={visitPrice}
            unit="원"
            onChange={(n) => {
              setVisitPrice(n);
              markDirty();
            }}
          />
          <PriceRow
            label="상담 시간"
            value={visitDurationMin}
            unit="분"
            step={15}
            min={30}
            onChange={(n) => {
              setVisitDurationMin(n);
              markDirty();
            }}
          />
        </div>
      </section>

      {saveError && (
        <p className="text-center text-[13px] font-medium text-red-500">{saveError}</p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className={`w-full rounded-xl py-4 text-[15px] font-bold text-white transition-colors disabled:opacity-60 ${
          saved ? "bg-green-600" : "bg-master-500 hover:bg-indigo-700"
        }`}
      >
        {saved ? "저장됐어요" : saving ? "저장 중..." : "저장하기"}
      </button>
    </main>
  );
}

export function MasterPricingForm() {
  const db = useDb();
  const dbReady = useDbReady();
  const { session, loading: sessionLoading } = useSession();
  const masterId = useMasterId();
  const cachedMaster =
    db.masters.find((m) => m.id === masterId) ??
    (session?.id ? db.masters.find((m) => m.userId === session.id) : undefined);
  const [fetchedMaster, setFetchedMaster] = useState<Master | undefined>();
  const [fetchingMaster, setFetchingMaster] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const master = cachedMaster ?? fetchedMaster;

  useEffect(() => {
    if (master || !dbReady || sessionLoading || !session?.id || session.role !== "master") {
      return;
    }

    let cancelled = false;
    setBootstrapping(true);
    void ensureMasterProfile({ name: session.name, phone: session.phone })
      .then((next) => {
        if (cancelled || !next) return;
        setFetchedMaster(next);
        const current = getSession();
        if (current && current.masterId !== next.id) {
          setSession({ ...current, masterId: next.id });
        }
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dbReady, master, session?.id, session?.name, session?.phone, session?.role, sessionLoading]);

  useEffect(() => {
    if (!masterId || cachedMaster) {
      setFetchedMaster(undefined);
      setFetchingMaster(false);
      return;
    }

    let cancelled = false;
    setFetchingMaster(true);
    void loadMaster(masterId)
      .then((next) => {
        if (!cancelled) setFetchedMaster(next);
      })
      .finally(() => {
        if (!cancelled) setFetchingMaster(false);
      });

    return () => {
      cancelled = true;
    };
  }, [masterId, cachedMaster]);

  const waitingForData =
    (sessionLoading || !dbReady || bootstrapping) && !master;
  const waitingForMasterFetch = fetchingMaster && !master;

  if (waitingForData || waitingForMasterFetch) {
    return (
      <main className="flex flex-col items-center justify-center px-5 py-16">
        <p className="text-[14px] text-gray-400">요금 정보를 불러오는 중...</p>
      </main>
    );
  }

  if (!master) {
    return (
      <main className="flex flex-col items-center gap-3 px-5 py-16 text-center">
        <p className="text-[14px] text-gray-500">마스터 프로필을 불러올 수 없어요.</p>
        <Link href="/master/settings" className="text-[14px] font-bold text-brand-500">
          설정으로
        </Link>
      </main>
    );
  }

  return (
    <MasterPricingFields
      key={`${master.id}-${master.pricing.updatedAt}`}
      master={master}
    />
  );
}
