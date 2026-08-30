"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/master", label: "할일", icon: "fa-check-square", solid: true },
  { href: "/master/schedule", label: "일정", icon: "fa-calendar", solid: false },
  { href: "/master/settlement", label: "정산", icon: "fa-wallet", solid: true },
  { href: "/master/settings", label: "설정", icon: "fa-user", solid: false },
] as const;

export function MasterBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 z-50 flex w-full max-w-[400px] justify-between border-t border-gray-100 bg-white/95 px-6 py-2 pb-8 backdrop-blur-md">
      {tabs.map((tab) => {
        const active =
          tab.href === "/master"
            ? pathname === "/master"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex w-16 flex-col items-center gap-1 ${
              active ? "text-[#4f46e5]" : "text-gray-400 transition hover:text-gray-900"
            }`}
          >
            <i
              className={`${tab.solid ? "fa-solid" : "fa-regular"} ${tab.icon} mb-0.5 text-[20px]`}
            />
            <span className={`text-[10px] ${active ? "font-bold" : "font-semibold"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
