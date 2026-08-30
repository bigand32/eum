"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMasterId } from "@/lib/auth/use-master-id";
import { useDb } from "@/lib/db/use-db";
import { useSession } from "@/lib/auth/use-session";
import { signOut } from "@/lib/auth/session";

const menuItems = [
  {
    href: "/master/settings/profile",
    icon: "fa-user-pen",
    label: "프로필 수정",
    desc: "소개 · 태그 · 경력",
    color: "bg-brand-50 text-brand-500",
  },
  {
    href: "/master/settings/pricing",
    icon: "fa-won-sign",
    label: "요금 설정",
    desc: "피드백 · 전화 · 방문 상담",
    color: "bg-indigo-50 text-[#4f46e5]",
  },
] as const;

export function MasterSettingsView() {
  const router = useRouter();
  const db = useDb();
  const { session } = useSession();
  const masterId = useMasterId();
  const master = db.masters.find((m) => m.id === masterId);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-gray-50 bg-white/90 px-5 py-4 backdrop-blur-md">
        <h1 className="text-center text-[16px] font-bold text-gray-900">설정</h1>
      </header>

      <main className="flex flex-col pb-28">
        <section className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <img
                src={master?.avatarUrl}
                alt=""
                className="h-20 w-20 rounded-full border border-gray-100 object-cover shadow-sm"
              />
              <div className="absolute right-0 bottom-0 h-5 w-5 rounded-full border-2 border-white bg-green-500" />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-sm bg-gray-900 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  PRO
                </span>
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
                  {master?.name ?? session?.name ?? "마스터"}
                </h2>
              </div>
              <p className="mt-1 text-[14px] font-medium text-gray-500">
                {master?.tags.slice(0, 2).join(" · ") || "보컬 코치"}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-[13px] font-semibold text-brand-500">
                <i className="fa-solid fa-bolt text-[11px]" />
                평균 {master?.responseTimeLabel ?? "1시간"} 내 응답
              </p>
            </div>
          </div>

          {master?.bio && (
            <p className="mt-5 text-[15px] leading-relaxed font-medium text-gray-700">
              &quot;{master.bio.split("\n")[0]}&quot;
            </p>
          )}
        </section>

        <section className="px-6 py-4">
          <div className="flex items-center justify-between rounded-[20px] bg-surface p-4 text-center">
            <div className="flex-1">
              <div className="mb-1 text-[12px] font-semibold text-gray-500">누적 첨삭</div>
              <div className="text-[18px] font-extrabold text-gray-900">
                {master?.feedbackCount ?? 0}
                <span className="ml-0.5 text-[14px] font-medium">건</span>
              </div>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div className="flex-1">
              <div className="mb-1 text-[12px] font-semibold text-gray-500">평점</div>
              <div className="flex items-center justify-center gap-1 text-[18px] font-extrabold text-gray-900">
                <i className="fa-solid fa-star text-[14px] text-yellow-400" />
                {master?.rating ?? 0}
              </div>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div className="flex-1">
              <div className="mb-1 text-[12px] font-semibold text-gray-500">리뷰</div>
              <div className="text-[18px] font-extrabold text-gray-900">
                {master?.reviewCount ?? 0}
                <span className="ml-0.5 text-[14px] font-medium">개</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-2 px-6 pt-2">
          <h3 className="mb-4 text-[18px] font-bold tracking-tight text-gray-900">계정 · 관리</h3>
          <div className="flex flex-col gap-3">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 rounded-[16px] border border-gray-100 bg-white p-4 shadow-soft transition hover:border-gray-200"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${item.color}`}
                >
                  <i className={`fa-solid ${item.icon}`} />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-gray-900">{item.label}</p>
                  <p className="text-[12px] text-gray-500">{item.desc}</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
              </Link>
            ))}

            {master && (
              <Link
                href={`/masters/${master.id}`}
                className="flex items-center gap-4 rounded-[16px] border border-gray-100 bg-white p-4 shadow-soft transition hover:border-gray-200"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                  <i className="fa-solid fa-eye" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-gray-900">내 프로필 미리보기</p>
                  <p className="text-[12px] text-gray-500">학생에게 보이는 화면</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex items-center gap-4 rounded-[16px] border border-gray-100 bg-white p-4 text-left shadow-soft transition hover:border-red-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
                <i className="fa-solid fa-arrow-right-from-bracket" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-gray-900">로그아웃</p>
                <p className="text-[12px] text-gray-500">{session?.email}</p>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
