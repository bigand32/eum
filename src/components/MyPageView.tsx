"use client";

import Link from "next/link";
import { useDb } from "@/lib/db/use-db";
import { useStudentId } from "@/lib/auth/use-student-id";
import { useSession } from "@/lib/auth/use-session";
import { getPhoneDurationLabel } from "@/lib/phone-pricing";
import { toTelHref } from "@/lib/phone-call";

const menuItems = [
  {
    href: "/daily",
    icon: "fa-microphone-lines",
    solid: true,
    label: "내 연습 기록 및 피드백",
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
    label: "찜한 마스터 / 학원",
  },
  {
    href: "/mypage/reviews",
    icon: "fa-comment-dots",
    solid: false,
    label: "내가 쓴 리뷰",
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

export function MyPageView() {
  const db = useDb();
  const studentId = useStudentId();
  const { session } = useSession();
  const student = db.students.find((s) => s.id === studentId);
  const displayName = session?.name ?? student?.name ?? "회원";
  const upcoming = db.reservations
    .filter((r) => r.studentId === studentId && r.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  const upcomingMaster = upcoming
    ? db.masters.find((m) => m.id === upcoming.masterId)
    : null;

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between bg-surface/90 px-6 py-4 backdrop-blur-md">
        <h1 className="text-[20px] font-extrabold tracking-tight text-gray-900">내 정보</h1>
        <div className="flex gap-4 text-xl text-gray-800">
          <button
            type="button"
            aria-label="장바구니"
            className="transition-colors hover:text-brand-500"
          >
            <i className="fa-solid fa-cart-shopping text-[18px]" />
          </button>
          <button
            type="button"
            aria-label="설정"
            className="transition-colors hover:text-brand-500"
          >
            <i className="fa-solid fa-gear text-[18px]" />
          </button>
        </div>
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
              <button type="button" className="flex-1 cursor-pointer text-center">
                <div className="mb-1 text-[12px] font-semibold text-gray-500">내 쿠폰</div>
                <div className="text-[17px] font-extrabold text-gray-900">
                  2<span className="ml-0.5 text-[13px] font-medium">장</span>
                </div>
              </button>
            </div>
          </div>
        </section>

        <section className="mb-8 px-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[17px] font-bold tracking-tight text-gray-900">다가오는 코칭</h3>
            <Link
              href="/reservation"
              className="text-[12px] font-medium text-gray-400 hover:text-gray-600"
            >
              전체보기
            </Link>
          </div>

          {upcoming && upcomingMaster ? (
            <div className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="mb-2.5 inline-block rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-500">
                    {formatCoachingTime(upcoming.scheduledAt)}
                  </span>
                  <p className="mb-1 text-[13px] font-semibold text-brand-500">곧 코칭이 시작돼요</p>
                  <h4 className="mb-0.5 text-[17px] font-extrabold leading-tight tracking-tight text-gray-900">
                    {upcomingMaster.title}
                  </h4>
                  <p className="text-[13px] font-medium text-gray-400">
                    {upcoming.type === "phone"
                      ? getPhoneDurationLabel((upcoming.durationMin ?? 30) as 15 | 30)
                      : `방문 상담 (${upcoming.durationMin ?? upcomingMaster.pricing.visitDurationMin}분)`}
                  </p>
                </div>
                <img
                  src={upcomingMaster.avatarUrl}
                  alt={upcomingMaster.title}
                  className="h-[60px] w-[60px] shrink-0 rounded-full border border-gray-100 object-cover"
                />
              </div>
              {upcoming.type === "phone" ? (
                <a
                  href={toTelHref(upcomingMaster.phoneNumber)}
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

        <section className="mb-8 px-5">
          <Link
            href="/master"
            className="group relative block overflow-hidden rounded-[20px] bg-gradient-to-r from-gray-200 to-gray-100 p-5"
          >
            <div className="relative z-10">
              <span className="mb-1 block text-[11px] font-bold text-gray-500">
                원장님을 위한 서비스
              </span>
              <h4 className="mb-2 text-[16px] font-bold leading-tight text-gray-900">
                보컬 학원을 운영 중이신가요?
                <br />
                eum 파트너스 입점하기
              </h4>
              <div className="flex items-center gap-1 text-[12px] font-medium text-gray-600 transition-colors group-hover:text-brand-500">
                자세히 보기 <i className="fa-solid fa-arrow-right text-[10px]" />
              </div>
            </div>
            <i className="fa-solid fa-building absolute -right-4 -bottom-4 rotate-12 text-[80px] text-white opacity-40" />
          </Link>
        </section>
      </main>
    </>
  );
}
