"use client";

import Link from "next/link";
import { FEATURED_ACADEMY } from "@/lib/db/academies";
import { useDb } from "@/lib/db/use-db";

const quickMenu = [
  { icon: "fa-microphone-lines", label: "피드백", href: "/search" },
  { icon: "fa-book-open", label: "연습일지", href: "/daily" },
] as const;

const offlineMaster = {
  id: "master-offline",
  name: "최랩퍼",
  tag: "트렌디 랩 · 믹싱",
  status: "오프라인",
  online: false,
};

export function HomeView() {
  const { masters } = useDb();
  const featuredMasters = [
    ...masters.map((m) => ({
      id: m.id,
      name: m.name,
      tag: m.tags.slice(0, 2).join(" · "),
      status: `${m.responseTimeLabel} 내 응답`,
      online: true,
    })),
    offlineMaster,
  ];

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-xl">
        <div className="text-[24px] font-extrabold tracking-tighter text-gray-900">
          eum<span className="text-brand-500">.</span>
        </div>
        <div className="flex gap-4 text-xl text-gray-800">
          <Link href="/search" aria-label="검색" className="transition-colors hover:text-brand-500">
            <i className="fa-solid fa-magnifying-glass" />
          </Link>
          <button type="button" aria-label="알림" className="relative transition-colors hover:text-brand-500">
            <i className="fa-regular fa-bell" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full border border-white bg-red-500" />
          </button>
        </div>
      </header>

      <main className="flex flex-col">
        <section className="mt-2 px-5">
          <div className="shadow-soft flex items-center gap-5 rounded-[24px] bg-brand-50 p-5">
            <div className="min-w-0 flex-1">
              <span className="mb-2 inline-block rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-brand-500">
                신규 가입 혜택
              </span>
              <h2 className="mb-1 text-[17px] font-extrabold leading-snug tracking-tight text-gray-900">
                첫 코칭 <span className="text-brand-500">50% 할인</span>
                <br />
                <span className="text-brand-500">5,000P</span> 즉시 지급
              </h2>
              <p className="text-[12px] font-medium text-gray-400">
                eum에서 노래 실력을 레벨업하세요
              </p>
            </div>

            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-white/80">
              <div className="flex h-9 items-end gap-[3px]">
                {[35, 55, 85, 100, 70, 95, 50, 75, 40].map((h, i) => (
                  <div
                    key={i}
                    className="wave-bar w-[3px] rounded-full bg-brand-500"
                    style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 px-5">
          <div className="shadow-soft grid grid-cols-2 divide-x divide-gray-100 overflow-hidden rounded-[24px] border border-gray-100 bg-white">
            {quickMenu.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-2.5 px-3 py-5 transition-colors active:bg-surface/60"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-[18px] text-brand-500">
                  <i className={`fa-solid ${item.icon}`} />
                </div>
                <p className="text-[15px] font-bold text-gray-900">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 px-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[19px] font-bold tracking-tight text-gray-900">진행중인 챌린지</h3>
            <button type="button" className="text-[13px] font-medium text-gray-400 hover:text-gray-600">
              전체보기
            </button>
          </div>
          <div className="shadow-soft rounded-[24px] border border-gray-100 bg-white p-5">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <span className="rounded-md bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-500">
                  자율미션
                </span>
                <h4 className="mt-2.5 text-[16px] font-bold leading-snug text-gray-900">
                  주 3회 연습일지 작성
                </h4>
                <p className="mt-1 text-[13px] text-gray-500">2일차 진행 중이에요</p>
              </div>
              <div className="text-right">
                <span className="mb-1 block text-[11px] font-medium text-gray-400">달성률</span>
                <div className="text-[22px] font-extrabold tracking-tight text-brand-500">
                  66<span className="text-sm font-bold">%</span>
                </div>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-1000 ease-out" style={{ width: "66%" }} />
            </div>
          </div>
        </section>

        <section className="mt-12 pl-5">
          <div className="mb-4 flex items-center justify-between pr-5">
            <h3 className="text-[19px] font-bold tracking-tight text-gray-900">
              지금 빠른 피드백 가능한 마스터
            </h3>
            <Link href="/search" className="text-[13px] font-medium text-gray-400 hover:text-gray-600">
              더보기
            </Link>
          </div>
          <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-6 pr-5">
            {featuredMasters.map((m) => (
              <Link
                key={m.name}
                href={m.online ? `/masters/${m.id}` : "/search"}
                className="shadow-soft flex w-[130px] shrink-0 snap-start cursor-pointer flex-col items-center rounded-[20px] border border-gray-100 bg-white p-4"
              >
                <div className="relative mb-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=f3f4f6&color=111827&font-size=0.4`}
                    alt={m.name}
                    className={`h-16 w-16 rounded-full object-cover ${m.online ? "" : "opacity-60"}`}
                  />
                  <div
                    className={`absolute right-0 bottom-0 h-4 w-4 rounded-full border-2 border-white ${
                      m.online ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                </div>
                <h4 className="mb-0.5 text-[15px] font-bold text-gray-900">{m.name}</h4>
                <p className="text-[12px] font-medium text-gray-500">{m.tag}</p>
                <div
                  className={`mt-4 w-full rounded-[10px] py-1.5 text-center text-[11px] font-bold ${
                    m.online
                      ? "bg-surface text-gray-700"
                      : "border border-gray-100 bg-transparent text-gray-400"
                  }`}
                >
                  {m.status}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 mb-8 px-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[19px] font-bold tracking-tight text-gray-900">내 주변 검증된 학원</h3>
          </div>
          <Link
            href={`/academies/${FEATURED_ACADEMY.id}`}
            className="shadow-soft block cursor-pointer overflow-hidden rounded-[24px] border border-gray-100 bg-white"
          >
            <div className="relative h-[180px] bg-gray-200">
              <img
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop"
                alt={FEATURED_ACADEMY.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute top-4 left-4 rounded-md bg-gray-900/80 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-md">
                AD
              </div>
              <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between">
                <div className="text-white">
                  <h4 className="mb-1 text-[20px] font-bold leading-tight">{FEATURED_ACADEMY.name}</h4>
                  <p className="text-[13px] font-medium text-white/80">
                    2027 입시반 조기등록 시 10% 혜택
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-4">
              <span className="rounded-[8px] bg-surface px-3 py-1.5 text-[12px] font-semibold text-gray-600">
                📍 강남역 800m
              </span>
              <span className="rounded-[8px] bg-surface px-3 py-1.5 text-[12px] font-semibold text-gray-600">
                보컬입시
              </span>
              <span className="rounded-[8px] bg-surface px-3 py-1.5 text-[12px] font-semibold text-gray-600">
                미디작곡
              </span>
            </div>
          </Link>
        </section>
      </main>
    </>
  );
}
