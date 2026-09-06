"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/lib/auth/use-session";
import { signOut } from "@/lib/auth/session";

export function StudentSettingsView() {
  const router = useRouter();
  const { session } = useSession();

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
          <p className="text-[17px] font-extrabold text-gray-900">
            {session?.name ?? "회원"}
          </p>
          <p className="mt-1 text-[14px] font-medium text-gray-500">
            {session?.email}
          </p>
          {session?.phone ? (
            <p className="mt-0.5 text-[13px] text-gray-400">{session.phone}</p>
          ) : null}
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
