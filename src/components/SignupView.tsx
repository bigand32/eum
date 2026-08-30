"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { registerAccount } from "@/lib/auth/accounts";
import { formatSignupError } from "@/lib/auth/errors";
import { isValidPhone, normalizePhone } from "@/lib/auth/phone";
import {
  getHomePathForRole,
  getSession,
  isAuthenticated,
  setSession,
} from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/session";
import { loadMasterSignupDraft, saveMasterSignupDraft } from "@/lib/auth/signup-draft";

const inputClass =
  "h-12 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-brand-500";

export function SignupView() {
  const router = useRouter();

  const [role, setRole] = useState<UserRole>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      const session = getSession();
      if (session) router.replace(getHomePathForRole(session.role));
      return;
    }

    const draft = loadMasterSignupDraft();
    if (draft) {
      setRole("master");
      setName(draft.name);
      setEmail(draft.email);
      setPhone(draft.phone);
      setPassword(draft.password);
      setPasswordConfirm(draft.password);
    }
  }, [router]);

  const validateBasicFields = () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError("필수 항목을 모두 입력해 주세요.");
      return false;
    }
    if (!isValidPhone(phone)) {
      setError("올바른 휴대폰 번호를 입력해 주세요.");
      return false;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 해요.");
      return false;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않아요.");
      return false;
    }
    if (!agreed) {
      setError("약관에 동의해 주세요.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBasicFields()) return;

    if (role === "master") {
      saveMasterSignupDraft({
        name: name.trim(),
        email: email.trim(),
        phone: normalizePhone(phone),
        password,
      });
      router.push("/signup/master");
      return;
    }

    try {
      const user = await registerAccount({
        role: "student",
        name: name.trim(),
        email: email.trim(),
        phone: normalizePhone(phone),
        password,
      });
      setSession(user);
      router.push("/");
    } catch (err) {
      setError(formatSignupError(err));
    }
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-12 pb-10">
      <Link
        href="/login"
        className="mb-6 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-gray-600"
      >
        <i className="fa-solid fa-chevron-left text-[14px]" />
      </Link>

      <div className="mb-6">
        {role === "master" && (
          <p className="text-[13px] font-bold text-brand-500">1 / 2</p>
        )}
        <h1 className={`${role === "master" ? "mt-1" : ""} text-[24px] font-extrabold tracking-tight text-gray-900`}>
          회원가입
        </h1>
        <p className="mt-2 text-[14px] font-medium text-gray-500">
          eum에서 어떤 역할로 시작할까요?
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-[14px] bg-surface p-1">
        {(
          [
            { key: "student" as const, label: "수강생", icon: "fa-user" },
            { key: "master" as const, label: "강사", icon: "fa-microphone-lines" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setRole(item.key);
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-[12px] py-3 text-[14px] font-bold transition-colors ${
              role === item.key
                ? "bg-white text-brand-500 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className={`fa-solid ${item.icon} text-[13px]`} />
            {item.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-[13px] font-bold text-gray-700">
              이름
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="실명 또는 닉네임"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="mb-2 block text-[13px] font-bold text-gray-700">
              이메일
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="name@email.com"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-[13px] font-bold text-gray-700">
              휴대폰 번호
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              placeholder="010-0000-0000"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="mb-2 block text-[13px] font-bold text-gray-700">
              비밀번호
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="8자 이상"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="signup-password-confirm"
              className="mb-2 block text-[13px] font-bold text-gray-700"
            >
              비밀번호 확인
            </label>
            <input
              id="signup-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value);
                setError(null);
              }}
              placeholder="비밀번호 다시 입력"
              className={inputClass}
            />
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              setError(null);
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-brand-500"
          />
          <span className="text-[13px] leading-relaxed text-gray-600">
            <span className="font-bold text-gray-900">[필수]</span> 서비스 이용약관 및 개인정보
            처리방침에 동의합니다
          </span>
        </label>

        {error && <p className="mt-3 text-[13px] font-medium text-red-500">{error}</p>}

        <button
          type="submit"
          className="mt-6 h-[52px] w-full rounded-[14px] bg-gray-900 text-[16px] font-bold text-white transition-colors hover:bg-gray-800"
        >
          {role === "master" ? "다음" : "수강생으로 가입하기"}
        </button>

        <p className="mt-5 text-center text-[14px] text-gray-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-bold text-brand-500 hover:text-brand-600">
            로그인
          </Link>
        </p>
      </form>
    </div>
  );
}
