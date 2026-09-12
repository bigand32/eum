"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs: {
  href: string;
  label: string;
  icon: string;
  solid: boolean;
  badge?: boolean;
}[] = [
  { href: "/", label: "홈", icon: "fa-house", solid: true },
  { href: "/search", label: "마스터", icon: "fa-magnifying-glass", solid: true },
  { href: "/reservation", label: "예약", icon: "fa-calendar-check", solid: false },
  { href: "/daily", label: "일지", icon: "fa-book-open", solid: true, badge: true },
  { href: "/mypage", label: "마이", icon: "fa-user", solid: false },
];

export function BottomNav() {
  const pathname = usePathname();
  const hideNav =
    pathname === "/onboarding" ||
    /^\/masters\/[^/]+\/(feedback|reservation)/.test(pathname) ||
    /^\/masters\/[^/]+$/.test(pathname) ||
    /^\/feedback\//.test(pathname) ||
    /^\/challenges\/[^/]+$/.test(pathname) ||
    pathname === "/vocal-ai" ||
    pathname.startsWith("/contest/");

  if (hideNav) return null;

  return (
    <nav className="fixed bottom-0 left-1/2 z-[70] flex w-full max-w-[400px] -translate-x-1/2 justify-between border-t border-gray-100 bg-white/95 px-6 pt-2.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex w-12 flex-col items-center gap-1 ${
              active ? "text-brand-500" : "text-gray-400 hover:text-gray-900"
            }`}
          >
            <span className="relative inline-flex h-6 w-6 items-center justify-center">
              <i
                className={`fa-${tab.solid ? "solid" : "regular"} ${tab.icon} text-[20px]`}
              />
              {tab.badge ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
                </span>
              ) : null}
            </span>
            <span
              className={`text-[10px] tracking-wide ${active ? "font-bold" : "font-semibold"}`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
