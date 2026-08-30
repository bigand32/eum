"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loginAccount } from "@/lib/auth/accounts";
import { getCurrentAuthUser } from "@/lib/auth/supabase-auth";
import {
  getHomePathForRole,
  getSession,
  isAuthenticated,
  setSession,
} from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function LoginView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      if (isSupabaseConfigured()) {
        const user = await getCurrentAuthUser();
        if (user) {
          setSession(user);
          router.replace(getHomePathForRole(user.role));
        }
        return;
      }

      if (isAuthenticated()) {
        const session = getSession();
        if (session) router.replace(getHomePathForRole(session.role));
      }
    };

    void redirectIfLoggedIn();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    const user = await loginAccount(email.trim(), password);
    if (!user) {
      setError("이메일 또는 비밀번호가 올바르지 않아요.");
      return;
    }

    setSession(user);
    router.push(getHomePathForRole(user.role));
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-16 pb-10">
      <div className="mb-10 text-center">
        <Link href="/login" className="text-[32px] font-extrabold tracking-tighter text-gray-900">
          eum<span className="text-brand-500">.</span>
        </Link>
        <p className="mt-3 text-[14px] font-medium text-gray-500">
          보컬 코칭, eum에서 시작하세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-[13px] font-bold text-gray-700">
              이메일
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="name@email.com"
              className="h-12 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-[13px] font-bold text-gray-700">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="비밀번호 입력"
              className="h-12 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-[13px] font-medium text-red-500">{error}</p>}

        <button
          type="submit"
          className="mt-6 h-[52px] w-full rounded-[14px] bg-gray-900 text-[16px] font-bold text-white transition-colors hover:bg-gray-800"
        >
          로그인
        </button>

        <div className="mt-4 flex items-center justify-center gap-3 text-[13px]">
          <button type="button" className="font-medium text-gray-400 hover:text-gray-600">
            비밀번호 찾기
          </button>
          <span className="text-gray-200">|</span>
          <Link href="/signup" className="font-bold text-brand-500 hover:text-brand-600">
            회원가입
          </Link>
        </div>
      </form>
    </div>
  );
}
