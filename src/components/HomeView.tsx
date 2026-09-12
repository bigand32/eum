"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { AppImage } from "@/components/AppImage";
import { PartnerInquiryModal } from "@/components/PartnerInquiryModal";
import { FEATURED_ACADEMY } from "@/lib/db/academies";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { getStudentReminders } from "@/lib/reminders";

type QuickMenuItem = {
  art: string;
  label: string;
  href: string;
};

const quickMenu: QuickMenuItem[] = [
  { art: "/brand/icons/feedback-v3.png", label: "피드백", href: "/search" },
  { art: "/brand/icons/journal-v3.png", label: "연습일지", href: "/daily" },
  { art: "/brand/icons/challenge-v4.png", label: "챌린지", href: "/challenges" },
  { art: "/brand/icons/contest-v4.png", label: "콘테스트", href: "/contest" },
];

type PromoBanner = {
  id: string;
  badge: string;
  title: ReactNode;
  desc: string;
  art: string;
  /** 없으면 클릭 시 파트너 신청 폼을 띄운다 */
  href?: string;
};

const promoBanners: PromoBanner[] = [
  {
    id: "welcome",
    badge: "신규 가입 혜택",
    title: (
      <>
        첫 코칭 <span className="text-gray-900">50% 할인</span>
        <br />
        <span className="text-gray-900">5,000P</span> 즉시 지급
      </>
    ),
    desc: "eum에서 노래 실력을 레벨업하세요",
    href: "/search",
    art: "/brand/promo/welcome-v3.png",
  },
  {
    id: "feedback",
    badge: "음성 피드백",
    title: (
      <>
        연습 영상 올리고
        <br />
        코칭 받기
      </>
    ),
    desc: "마스터가 타임스탬프로 짚어드려요",
    href: "/search",
    art: "/brand/promo/feedback-v3.png",
  },
  {
    id: "partner",
    badge: "파트너 모집",
    title: (
      <>
        보컬학원 파트너 모집
        <br />
        지금 신청하세요
      </>
    ),
    desc: "eum에서 수강생을 만나보세요",
    art: "/brand/promo/academy-v3.png",
  },
];

const PROMO_CARD_CLASS =
  "shadow-soft flex w-full min-w-full shrink-0 snap-center items-center gap-4 bg-gray-50 p-5 text-left";

function PromoBannerBody({ banner, priority }: { banner: PromoBanner; priority: boolean }) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <span className="mb-2 inline-block rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-gray-500">
          {banner.badge}
        </span>
        <h2 className="mb-1 text-[17px] font-extrabold leading-snug tracking-tight text-gray-900">
          {banner.title}
        </h2>
        <p className="text-[12px] font-medium text-gray-400">{banner.desc}</p>
      </div>

      <AppImage
        src={banner.art}
        alt=""
        width={192}
        height={192}
        priority={priority}
        className="h-[96px] w-[96px] shrink-0 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
      />
    </>
  );
}

function HomePromoCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [partnerOpen, setPartnerOpen] = useState(false);

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
          {promoBanners.map((banner, i) =>
            banner.href ? (
              <Link key={banner.id} href={banner.href} className={PROMO_CARD_CLASS}>
                <PromoBannerBody banner={banner} priority={i === 0} />
              </Link>
            ) : (
              <button
                key={banner.id}
                type="button"
                onClick={() => setPartnerOpen(true)}
                className={PROMO_CARD_CLASS}
              >
                <PromoBannerBody banner={banner} priority={i === 0} />
              </button>
            ),
          )}
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

      <PartnerInquiryModal open={partnerOpen} onClose={() => setPartnerOpen(false)} />
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
    <div className="min-h-dvh bg-white">
      <header className="safe-top sticky top-0 z-50 flex min-h-14 items-center justify-between bg-white/85 px-5 pb-2 backdrop-blur-xl">
        <BrandLogo href="/" />
        <div className="flex h-10 shrink-0 items-center gap-0.5 text-gray-800">
          <Link
            href="/search"
            aria-label="검색"
            className="inline-flex h-10 w-10 items-center justify-center transition-colors hover:text-brand-500"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </Link>
          <Link
            href="/reservation"
            aria-label="알림"
            className="relative inline-flex h-10 w-10 items-center justify-center transition-colors hover:text-brand-500"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10 21a2 2 0 0 0 4 0" />
            </svg>
            {reminders.length > 0 && (
              <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500" />
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
                  className="shadow-soft flex items-center gap-3 rounded-[18px] bg-gray-50 px-4 py-3.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-500">
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
          <div className="shadow-soft grid grid-cols-4 overflow-hidden rounded-[24px] bg-gray-50">
            {quickMenu.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-1.5 px-1 py-4 transition-colors active:bg-gray-100"
              >
                <AppImage
                  src={item.art}
                  alt=""
                  width={112}
                  height={112}
                  className="h-12 w-12 object-contain"
                />
                <p className="text-[12px] font-bold text-gray-900">{item.label}</p>
              </Link>
            ))}
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
                key={m.id}
                href={`/masters/${m.id}`}
                className="shadow-soft flex w-[130px] shrink-0 snap-start cursor-pointer flex-col items-center rounded-[20px] bg-gray-50 p-4"
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
                <div className="mt-4 w-full rounded-[10px] bg-white py-1.5 text-center text-[11px] font-bold text-gray-700">
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
            className="shadow-soft block cursor-pointer overflow-hidden rounded-[24px] bg-gray-50"
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
              <span className="rounded-[8px] bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600">
                📍 강남역 800m
              </span>
              <span className="rounded-[8px] bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600">
                보컬입시
              </span>
              <span className="rounded-[8px] bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600">
                미디작곡
              </span>
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}
