"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EumLogo } from "@/components/EumLogo";
import { AppImage } from "@/components/AppImage";
import { FEATURED_ACADEMY } from "@/lib/db/academies";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { getStudentReminders } from "@/lib/reminders";
import { HomeChallenges } from "@/components/HomeChallenges";

const quickMenu = [
  { icon: "fa-microphone-lines", label: "피드백", href: "/search" },
  { icon: "fa-book-open", label: "연습일지", href: "/daily" },
] as const;

const promoBanners = [
  {
    id: "welcome",
    badge: "신규 가입 혜택",
    title: (
      <>
        첫 코칭 <span className="text-brand-500">50% 할인</span>
        <br />
        <span className="text-brand-500">5,000P</span> 즉시 지급
      </>
    ),
    desc: "eum에서 노래 실력을 레벨업하세요",
    href: "/search",
    tone: "brand" as const,
  },
  {
    id: "feedback",
    badge: "음성 피드백",
    title: (
      <>
        연습 영상 올리고
        <br />
        <span className="text-brand-500">코칭</span> 받기
      </>
    ),
    desc: "마스터가 타임스탬프로 짚어드려요",
    href: "/search",
    tone: "brand" as const,
  },
  {
    id: "academy",
    badge: "AD · 학원",
    title: (
      <>
        {FEATURED_ACADEMY.name}
        <br />
        <span className="text-white">조기등록 10%</span> 혜택
      </>
    ),
    desc: "강남역 인근 · 보컬입시 · 미디작곡",
    href: `/academies/${FEATURED_ACADEMY.id}`,
    tone: "dark" as const,
  },
] as const;

function HomePromoCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const next = Math.round(el.scrollLeft / width);
      setIndex(Math.max(0, Math.min(promoBanners.length - 1, next)));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const timer = window.setInterval(() => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const next = (Math.round(el.scrollLeft / width) + 1) % promoBanners.length;
      el.scrollTo({ left: next * width, behavior: "smooth" });
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="mt-2 px-5">
      <div className="relative overflow-hidden rounded-[24px]">
        <div
          ref={scrollerRef}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {promoBanners.map((banner) => (
            <Link
              key={banner.id}
              href={banner.href}
              className={`shadow-soft flex w-full min-w-full shrink-0 snap-center items-center gap-5 p-5 ${
                banner.tone === "dark" ? "bg-gray-900 text-white" : "bg-brand-50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <span
                  className={`mb-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    banner.tone === "dark"
                      ? "bg-white/15 text-white"
                      : "bg-white text-brand-500"
                  }`}
                >
                  {banner.badge}
                </span>
                <h2
                  className={`mb-1 text-[17px] font-extrabold leading-snug tracking-tight ${
                    banner.tone === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {banner.title}
                </h2>
                <p
                  className={`text-[12px] font-medium ${
                    banner.tone === "dark" ? "text-white/60" : "text-gray-400"
                  }`}
                >
                  {banner.desc}
                </p>
              </div>

              <div
                className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full ${
                  banner.tone === "dark" ? "bg-white/10" : "bg-white/80"
                }`}
              >
                <div className="flex h-9 items-end gap-[3px]">
                  {[35, 55, 85, 100, 70, 95, 50, 75, 40].map((h, i) => (
                    <div
                      key={i}
                      className={`wave-bar w-[3px] rounded-full ${
                        banner.tone === "dark" ? "bg-white" : "bg-brand-500"
                      }`}
                      style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {promoBanners.map((banner, i) => (
          <button
            key={banner.id}
            type="button"
            aria-label={`${i + 1}번째 배너`}
            onClick={() => {
              const el = scrollerRef.current;
              if (!el) return;
              el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
            }}
            className={`h-1.5 rounded-full transition-all ${
              index === i ? "w-4 bg-gray-900" : "w-1.5 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

export function HomeView() {
  const db = useDb();
  const studentId = useStudentId();
  const reminders = getStudentReminders(db, studentId).filter(
    (r) => r.kind === "today" || r.kind === "tomorrow" || r.kind === "feedback",
  );
  const featuredMasters = db.masters.slice(0, 8).map((m) => ({
    id: m.id,
    name: m.name,
    avatarUrl: m.avatarUrl,
    tag: m.tags.slice(0, 2).join(" · ") || m.title,
    status: `${m.responseTimeLabel} 내 응답`,
  }));

  return (
    <>
      <header className="safe-top sticky top-0 z-50 flex items-center justify-between bg-white/80 px-6 pb-4 backdrop-blur-xl">
        <EumLogo href="/" />
        <div className="flex gap-4 text-xl text-gray-800">
          <Link href="/search" aria-label="검색" className="transition-colors hover:text-brand-500">
            <i className="fa-solid fa-magnifying-glass" />
          </Link>
          <Link
            href="/reservation"
            aria-label="알림"
            className="relative transition-colors hover:text-brand-500"
          >
            <i className="fa-regular fa-bell" />
            {reminders.length > 0 && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full border border-white bg-red-500" />
            )}
          </Link>
        </div>
      </header>

      <main className="flex flex-col">
        <HomePromoCarousel />

        {reminders.length > 0 && (
          <section className="mt-5 px-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-gray-900">다가오는 일정</h3>
              <Link href="/reservation" className="text-[12px] font-medium text-gray-400">
                전체보기
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {reminders.slice(0, 3).map((r) => (
                <Link
                  key={r.id}
                  href={r.href}
                  className="flex items-center gap-3 rounded-[16px] border border-brand-100 bg-brand-50/60 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
                    <i
                      className={`fa-solid ${
                        r.kind === "feedback" ? "fa-comment-dots" : "fa-calendar-check"
                      } text-[13px]`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-gray-900">{r.title}</p>
                    <p className="truncate text-[12px] text-gray-500">{r.subtitle}</p>
                  </div>
                  <i className="fa-solid fa-chevron-right text-[11px] text-gray-300" />
                </Link>
              ))}
            </div>
          </section>
        )}

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

        <HomeChallenges />

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
                key={m.id}
                href={`/masters/${m.id}`}
                className="shadow-soft flex w-[130px] shrink-0 snap-start cursor-pointer flex-col items-center rounded-[20px] border border-gray-100 bg-white p-4"
              >
                <div className="relative mb-3 h-16 w-16 overflow-hidden rounded-full">
                  <AppImage
                    src={m.avatarUrl}
                    alt={m.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                    sizes="64px"
                  />
                </div>
                <h4 className="mb-0.5 text-[15px] font-bold text-gray-900">{m.name}</h4>
                <p className="line-clamp-1 text-center text-[12px] font-medium text-gray-500">
                  {m.tag}
                </p>
                <div className="mt-4 w-full rounded-[10px] bg-surface py-1.5 text-center text-[11px] font-bold text-gray-700">
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
              <AppImage
                src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop"
                alt={FEATURED_ACADEMY.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 430px) 100vw, 430px"
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
