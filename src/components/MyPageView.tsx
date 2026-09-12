"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { matchesStudentScope } from "@/lib/student-utils";
import { useSession } from "@/lib/auth/use-session";
import { getPhoneDurationLabel } from "@/lib/phone-pricing";
import { toTelHref } from "@/lib/phone-call";
import { FriendInviteCard } from "@/components/FriendInviteCard";
import type { Master, Reservation } from "@/lib/db/schema";

const menuItems = [
  {
    href: "/daily",
    icon: "fa-microphone-lines",
    solid: true,
    label: "내 피드백 및 연습 기록",
  },
  {
    href: "/mypage/courses",
    icon: "fa-play",
    solid: true,
    label: "내 온라인 강의",
  },
  {
    href: "/mypage/payments",
    icon: "fa-credit-card",
    solid: false,
    label: "결제 내역",
  },
  {
    href: "/mypage/favorites",
    icon: "fa-heart",
    solid: false,
    label: "찜한 목록",
  },
  {
    href: "/mypage/reviews",
    icon: "fa-comment-dots",
    solid: false,
    label: "내가 쓴 리뷰",
  },
] as const;

const supportItems = [
  {
    href: "/mypage/support",
    icon: "fa-headset",
    solid: true,
    label: "고객센터",
  },
  {
    href: "/mypage/faq",
    icon: "fa-circle-question",
    solid: false,
    label: "FAQ",
  },
  {
    href: "/mypage/notices",
    icon: "fa-bullhorn",
    solid: true,
    label: "공지사항",
  },
] as const;

function formatCoachingTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const period = hours < 12 ? "오전" : "오후";
  const hour12 = hours % 12 || 12;
  const prefix = isToday ? "오늘" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${prefix} ${period} ${hour12}:${minutes}`;
}

function UpcomingCoachingCarousel({
  items,
}: {
  items: { reservation: Reservation; master: Master }[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      setIndex(Math.max(0, Math.min(items.length - 1, Math.round(el.scrollLeft / width))));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  return (
    <div>
      <div
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {items.map(({ reservation, master }) => (
          <div key={reservation.id} className="w-full min-w-full shrink-0 snap-center">
            <div className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="mb-2.5 inline-block rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-500">
                    {formatCoachingTime(reservation.scheduledAt)}
                  </span>
                  <p className="mb-1 text-[13px] font-semibold text-brand-500">곧 코칭이 시작돼요</p>
                  <h4 className="mb-0.5 text-[17px] font-extrabold leading-tight tracking-tight text-gray-900">
                    {master.title}
                  </h4>
                  <p className="text-[13px] font-medium text-gray-400">
                    {reservation.type === "phone"
                      ? getPhoneDurationLabel((reservation.durationMin ?? 30) as 15 | 30)
                      : `방문 상담 (${reservation.durationMin ?? master.pricing.visitDurationMin}분)`}
                  </p>
                </div>
                <img
                  src={master.avatarUrl}
                  alt={master.title}
                  className="h-[60px] w-[60px] shrink-0 rounded-full border border-gray-100 object-cover"
                />
              </div>
              {reservation.type === "phone" ? (
                <a
                  href={toTelHref(master.phoneNumber)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand-500 py-3 text-[14px] font-bold text-white transition-colors hover:bg-brand-600"
                >
                  <i className="fa-solid fa-phone text-[13px]" />
                  바로 전화하기
                </a>
              ) : (
                <Link
                  href="/reservation"
                  className="mt-4 block w-full rounded-[12px] bg-brand-500 py-3 text-center text-[14px] font-bold text-white transition-colors hover:bg-brand-600"
                >
                  방문 상담 확인하기
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.reservation.id}
              type="button"
              aria-label={`${i + 1}번째 코칭`}
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
      )}
    </div>
  );
}

export function MyPageView() {
  const db = useDb();
  const studentId = useStudentId();
  const { session } = useSession();
  const student = db.students.find((s) => s.id === studentId);
  const myCouponCount = db.studentCouponClaims.filter(
    (c) => (!studentId || c.studentId === studentId) && !c.usedAt,
  ).length;
  const displayName = session?.name ?? student?.name ?? "회원";
  const upcomingList = db.reservations
    .filter((r) => matchesStudentScope(studentId, r.studentId) && r.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .flatMap((reservation) => {
      const master = db.masters.find((m) => m.id === reservation.masterId);
      return master ? [{ reservation, master }] : [];
    });

  return (
    <>
      <header className="safe-top sticky top-0 z-50 flex items-center justify-between bg-surface/90 px-6 pb-4 backdrop-blur-md">
        <h1 className="text-[20px] font-extrabold tracking-tight text-gray-900">내 정보</h1>
        <Link
          href="/mypage/settings"
          aria-label="설정"
          className="text-xl text-gray-800 transition-colors hover:text-brand-500"
        >
          <i className="fa-solid fa-gear text-[18px]" />
        </Link>
      </header>

      <main className="flex flex-col">
        <section className="px-5 pt-2 pb-6">
          <div className="shadow-soft rounded-[28px] border border-gray-100 bg-white p-6">
            <div className="mb-6 flex items-center gap-4">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f3f4f6&color=111827`}
                alt=""
                className="h-16 w-16 rounded-full border border-gray-100 object-cover shadow-sm"
              />
              <div>
                <h2 className="text-[20px] font-extrabold leading-tight text-gray-900">
                  {displayName} 님
                </h2>
                <p className="mt-1 text-[13px] font-medium text-gray-500">eum과 함께한 지 12일째</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[16px] bg-surface p-4">
              <button type="button" className="flex-1 cursor-pointer border-r border-gray-200 text-center">
                <div className="mb-1 text-[12px] font-semibold text-gray-500">보유 포인트</div>
                <div className="text-[17px] font-extrabold text-brand-500">
                  {(student?.points ?? 1200).toLocaleString()}
                  <span className="ml-0.5 text-[13px] text-gray-900">P</span>
                </div>
              </button>
              <Link href="/mypage/coupons" className="flex-1 cursor-pointer text-center">
                <div className="mb-1 text-[12px] font-semibold text-gray-500">내 쿠폰</div>
                <div className="text-[17px] font-extrabold text-gray-900">
                  {myCouponCount}
                  <span className="ml-0.5 text-[13px] font-medium">장</span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {studentId ? (
          <section className="mb-8 px-5">
            <FriendInviteCard studentId={studentId} />
          </section>
        ) : null}

        <section className="mb-8 px-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[17px] font-bold tracking-tight text-gray-900">
              다가오는 코칭
              {upcomingList.length > 1 && (
                <span className="ml-1.5 text-[13px] font-bold text-brand-500">{upcomingList.length}</span>
              )}
            </h3>
            <Link
              href="/reservation"
              className="text-[12px] font-medium text-gray-400 hover:text-gray-600"
            >
              전체보기
            </Link>
          </div>

          {upcomingList.length > 0 ? (
            <UpcomingCoachingCarousel items={upcomingList} />
          ) : (
            <div className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-5 text-center">
              <p className="text-[14px] font-medium text-gray-400">예약된 코칭이 없어요</p>
              <Link
                href="/search"
                className="mt-3 inline-block text-[13px] font-bold text-brand-500"
              >
                마스터 찾아보기
              </Link>
            </div>
          )}
        </section>

        <section className="mb-8 px-5">
          <div className="shadow-soft overflow-hidden rounded-[24px] border border-gray-100 bg-white">
            {menuItems.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between p-5 transition active:bg-gray-50 ${
                  i < menuItems.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-gray-500">
                    <i
                      className={`fa-${item.solid ? "solid" : "regular"} ${item.icon} text-[14px]`}
                    />
                  </div>
                  <span className="truncate text-[15px] font-bold text-gray-900">{item.label}</span>
                </div>
                <i className="fa-solid fa-chevron-right shrink-0 text-[13px] text-gray-300" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10 px-5">
          <h3 className="mb-3 text-[17px] font-bold tracking-tight text-gray-900">고객지원</h3>
          <div className="shadow-soft overflow-hidden rounded-[24px] border border-gray-100 bg-white">
            {supportItems.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between p-5 transition active:bg-gray-50 ${
                  i < supportItems.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-gray-500">
                    <i
                      className={`fa-${item.solid ? "solid" : "regular"} ${item.icon} text-[14px]`}
                    />
                  </div>
                  <span className="truncate text-[15px] font-bold text-gray-900">{item.label}</span>
                </div>
                <i className="fa-solid fa-chevron-right shrink-0 text-[13px] text-gray-300" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
