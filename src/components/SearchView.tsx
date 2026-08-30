"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ACADEMIES } from "@/lib/db/academies";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useDb } from "@/lib/db/use-db";
import { getOnboardingPrefs } from "@/lib/onboarding";

const MASTER_TRAITS: Record<string, string[]> = {
  "master-1": ["30분 내 응답", "스파르타형"],
  "master-2": ["칭찬요정형", "기초탄탄"],
};

const GENRE_FILTERS = [
  { id: "all", label: "전체" },
  { id: "kpop", label: "K-POP/아이돌", match: ["팝", "아이돌", "K-POP"] },
  { id: "musical", label: "뮤지컬/성악", match: ["뮤지컬", "성악", "입시"] },
  { id: "rap", label: "랩/미디", match: ["랩", "힙합", "미디"] },
] as const;

const ACADEMY_FILTERS = [
  { id: "all", label: "전체" },
  { id: "gangnam", label: "강남/서초", match: ["강남", "역삼"] },
  { id: "exam", label: "입시전문", match: ["입시"] },
] as const;

function matchesQuery(text: string, q: string) {
  return text.toLowerCase().includes(q.toLowerCase());
}

export function SearchView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"master" | "academy">("master");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [genreFilter, setGenreFilter] = useState("all");
  const [academyFilter, setAcademyFilter] = useState("all");
  const { masters } = useDb();
  const onboarding = getOnboardingPrefs();

  useEffect(() => {
    setTab(searchParams.get("tab") === "academy" ? "academy" : "master");
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const switchTab = useCallback(
    (next: "master" | "academy") => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "academy") params.set("tab", "academy");
      else params.delete("tab");
      const q = params.toString();
      router.replace(q ? `/search?${q}` : "/search", { scroll: false });
    },
    [router, searchParams],
  );

  const updateQuery = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) params.set("q", value.trim());
    else params.delete("q");
    const q = params.toString();
    router.replace(q ? `/search?${q}` : "/search", { scroll: false });
  };

  const filteredMasters = useMemo(() => {
    const q = query.trim();
    const genre = GENRE_FILTERS.find((f) => f.id === genreFilter);
    return masters
      .filter((m) => {
        if (q) {
          const haystack = [m.title, m.name, ...m.tags].join(" ");
          if (!matchesQuery(haystack, q)) return false;
        }
        if (genre && genre.id !== "all" && "match" in genre) {
          const tagText = m.tags.join(" ");
          if (!genre.match.some((k) => tagText.includes(k) || m.title.includes(k))) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (!onboarding?.genre) return 0;
        const boost = (m: typeof a) => {
          if (onboarding.genre === "kpop" && m.tags.some((t) => t.includes("팝"))) return 1;
          if (onboarding.genre === "musical" && m.tags.some((t) => t.includes("뮤지컬"))) return 1;
          if (onboarding.genre === "rap" && m.tags.some((t) => t.includes("랩"))) return 1;
          return 0;
        };
        return boost(b) - boost(a);
      });
  }, [masters, query, genreFilter, onboarding?.genre]);

  const filteredAcademies = useMemo(() => {
    const q = query.trim();
    const region = ACADEMY_FILTERS.find((f) => f.id === academyFilter);
    return ACADEMIES.filter((a) => {
      if (q) {
        const haystack = [a.name, a.distanceLabel, ...a.tags].join(" ");
        if (!matchesQuery(haystack, q)) return false;
      }
      if (region && region.id !== "all" && "match" in region) {
        const text = [a.name, a.distanceLabel, ...a.tags].join(" ");
        if (!region.match.some((k) => text.includes(k))) return false;
      }
      return true;
    });
  }, [query, academyFilter]);

  const isMaster = tab === "master";

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 px-5 pt-12 pb-0 backdrop-blur-md">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 flex-1 items-center rounded-[16px] border border-gray-100 bg-surface px-4 transition-colors focus-within:border-brand-500 focus-within:bg-white">
            <i className="fa-solid fa-magnifying-glass mr-2.5 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              placeholder="마스터 이름, 장르, 학원명 검색"
              className="w-full bg-transparent text-[15px] font-medium text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="relative flex text-[16px] font-bold">
          <button
            type="button"
            onClick={() => switchTab("master")}
            className={`flex-1 pb-3 transition-colors ${
              isMaster ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            마스터 찾기
          </button>
          <button
            type="button"
            onClick={() => switchTab("academy")}
            className={`flex-1 pb-3 transition-colors ${
              !isMaster ? "text-brand-500" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            학원 찾기
          </button>
          <div
            className="tab-indicator absolute bottom-0 left-0 h-0.5 w-1/2 rounded-t-full bg-brand-500"
            style={{ transform: isMaster ? "translateX(0)" : "translateX(100%)" }}
          />
        </div>
      </header>

      <div
        className={`sticky top-[116px] z-40 gap-2 overflow-x-auto border-b border-gray-50 bg-white px-5 py-3 no-scrollbar ${
          isMaster ? "flex" : "hidden"
        }`}
      >
        {GENRE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setGenreFilter(f.id)}
            className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold ${
              genreFilter === f.id
                ? "bg-gray-900 font-bold text-white shadow-sm"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        className={`sticky top-[116px] z-40 gap-2 overflow-x-auto border-b border-gray-50 bg-white px-5 py-3 no-scrollbar ${
          isMaster ? "hidden" : "flex"
        }`}
      >
        {ACADEMY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setAcademyFilter(f.id)}
            className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold ${
              academyFilter === f.id
                ? "bg-gray-900 font-bold text-white shadow-sm"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <main className="p-5">
        <div className={`flex-col gap-4 ${isMaster ? "flex" : "hidden"}`}>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[14px] font-bold text-gray-900">
              총 <span className="text-brand-500">{filteredMasters.length}명</span>의 마스터
            </div>
          </div>

          {filteredMasters.length === 0 ? (
            <div className="rounded-[24px] border border-gray-100 bg-white p-8 text-center text-[13px] text-gray-400">
              검색 결과가 없어요
            </div>
          ) : (
            filteredMasters.map((m, i) => (
              <Link
                key={m.id}
                href={`/masters/${m.id}`}
                className="shadow-soft cursor-pointer rounded-[24px] border border-gray-100 bg-white p-5 transition-colors hover:border-brand-200"
              >
                <div className="flex gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-[72px] w-[72px] rounded-full border border-gray-50 object-cover"
                    />
                    <div className="absolute right-1 bottom-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-start justify-between">
                      <div>
                        {i === 0 && (
                          <span className="mr-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-500">
                            PRO
                          </span>
                        )}
                        <span className="text-[16px] font-bold text-gray-900">{m.title}</span>
                      </div>
                      <FavoriteButton type="master" id={m.id} className="text-[16px]" />
                    </div>
                    <div className="mb-2 flex items-center gap-1 text-[12px] font-medium text-gray-500">
                      <i className="fa-solid fa-star text-[10px] text-brand-500" />
                      <span className="font-bold text-gray-900">{m.rating}</span> ({m.reviewCount}) ·{" "}
                      {m.tags.slice(0, 2).join(", ")}
                    </div>
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {(MASTER_TRAITS[m.id] ?? [`${m.responseTimeLabel} 내 응답`]).map((trait) => (
                        <span
                          key={trait}
                          className="rounded-md bg-surface px-2 py-1 text-[11px] font-semibold text-gray-600"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-gray-50 pt-3">
                  <div className="text-[12px] font-medium text-gray-500">음성 피드백 (1회)</div>
                  <div className="text-[15px] font-extrabold text-gray-900">
                    {m.pricing.feedbackPrice.toLocaleString()}
                    <span className="ml-0.5 text-[13px] font-medium">원~</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <div className={`flex-col gap-4 ${isMaster ? "hidden" : "flex"}`}>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-[14px] font-bold text-gray-900">
              내 주변 <span className="text-brand-500">{filteredAcademies.length}개</span>의 학원
            </div>
          </div>

          {filteredAcademies.length === 0 ? (
            <div className="rounded-[24px] border border-gray-100 bg-white p-8 text-center text-[13px] text-gray-400">
              검색 결과가 없어요
            </div>
          ) : (
            filteredAcademies.map((a) => (
              <Link
                key={a.id}
                href={`/academies/${a.id}`}
                className={`shadow-soft relative cursor-pointer overflow-hidden rounded-[24px] border bg-white p-4 transition-colors ${
                  a.isAd
                    ? "border-brand-100 hover:border-brand-300"
                    : "border-gray-100 hover:border-brand-200"
                }`}
              >
                {a.isAd && (
                  <div className="absolute top-0 right-0 z-10 rounded-bl-lg bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-500">
                    AD
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[16px] border border-gray-100">
                    <img src={a.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 flex-col justify-center">
                    <div className="mb-1 flex items-start justify-between">
                      <h3 className="text-[16px] font-bold leading-tight text-gray-900">{a.name}</h3>
                      <FavoriteButton type="academy" id={a.id} />
                    </div>
                    <p className="mb-2 flex items-center gap-1 text-[12px] font-medium text-gray-500">
                      <i className="fa-solid fa-star text-[10px] text-yellow-400" />
                      <span className="font-bold text-gray-700">{a.rating}</span> ({a.reviewCount}) ·{" "}
                      {a.distanceLabel}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.promoTag && (
                        <span className="rounded-md bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-500">
                          {a.promoTag}
                        </span>
                      )}
                      {a.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-gray-100 bg-surface px-2 py-1 text-[11px] font-semibold text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
