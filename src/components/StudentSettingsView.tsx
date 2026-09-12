"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/lib/auth/use-session";
import { canChangePassword } from "@/lib/auth/student-settings";
import { signOut } from "@/lib/auth/session";

const rows: {
  href: string;
  icon: string;
  solid?: boolean;
  label: string;
  desc: string;
  emailOnly?: boolean;
}[] = [
  {
    href: "/mypage/settings/phone",
    icon: "fa-mobile-screen",
    solid: true,
    label: "휴대폰 번호",
    desc: "예약·연락에 사용해요",
  },
  {
    href: "/mypage/settings/password",
    icon: "fa-lock",
    solid: true,
    label: "비밀번호 변경",
    desc: "이메일 계정 비밀번호",
    emailOnly: true,
  },
  {
    href: "/mypage/settings/notifications",
    icon: "fa-bell",
    solid: false,
    label: "알림 설정",
    desc: "피드백·예약 리마인더",
  },
  {
    href: "/mypage/settings/delete",
    icon: "fa-user-slash",
    solid: true,
    label: "회원 탈퇴",
    desc: "계정과 이용 기록 삭제",
  },
];

export function StudentSettingsView() {
  const router = useRouter();
  const { session } = useSession();
  const showPassword = canChangePassword(session);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <>
      <PageHeader title="설정" backHref="/mypage" />
      <main className="flex flex-col gap-6 px-5 py-6 pb-28">
        <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
          <p className="mb-1 text-[12px] font-semibold text-gray-400">계정</p>
          <p className="text-[17px] font-extrabold text-gray-900">{session?.name ?? "회원"}</p>
          <p className="mt-1 text-[14px] font-medium text-gray-500">{session?.email}</p>
          {session?.phone ? (
            <p className="mt-0.5 text-[13px] text-gray-400">{session.phone}</p>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-soft">
          {rows
            .filter((row) => !row.emailOnly || showPassword)
            .map((row, i, list) => (
              <Link
                key={row.href}
                href={row.href}
                className={`flex items-center gap-4 p-5 transition active:bg-gray-50 ${
                  i < list.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-gray-500">
                  <i
                    className={`fa-${row.solid ? "solid" : "regular"} ${row.icon} text-[14px]`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-gray-900">{row.label}</p>
                  <p className="text-[12px] text-gray-500">{row.desc}</p>
                </div>
                <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
              </Link>
            ))}
        </section>

        <section className="overflow-hidden rounded-[20px] border border-gray-100 bg-white shadow-soft">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-red-50/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
              <i className="fa-solid fa-arrow-right-from-bracket" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-gray-900">로그아웃</p>
              <p className="text-[12px] text-gray-500">다른 계정으로 로그인</p>
            </div>
            <i className="fa-solid fa-chevron-right text-[12px] text-gray-300" />
          </button>
        </section>
      </main>
    </>
  );
}
