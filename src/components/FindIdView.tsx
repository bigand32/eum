"use client";

import Link from "next/link";
import { useState } from "react";
import { findAccountEmail } from "@/lib/auth/find-id";
import { isValidPhone, normalizePhone } from "@/lib/auth/phone";

export function FindIdView() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("휴대폰 번호를 확인해 주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setEmail(null);
    try {
      const result = await findAccountEmail({
        name: name.trim(),
        phone: normalizePhone(phone),
      });
      if (result.error || !result.email) {
        setError(result.error || "일치하는 계정을 찾지 못했어요.");
        return;
      }
      setEmail(result.email);
    } finally {
      setSubmitting(false);
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

      <div className="mb-8">
        <h1 className="text-[24px] font-extrabold tracking-tight text-gray-900">아이디 찾기</h1>
        <p className="mt-2 text-[14px] font-medium text-gray-500">
          가입할 때 입력한 이름과 휴대폰 번호로 이메일을 찾아드려요.
        </p>
      </div>

      {email ? (
        <div className="flex flex-1 flex-col">
          <div className="rounded-[20px] border border-gray-100 bg-white p-6 text-center shadow-soft">
            <p className="text-[13px] font-medium text-gray-400">가입한 이메일</p>
            <p className="mt-2 text-[20px] font-extrabold tracking-tight text-gray-900">{email}</p>
            <p className="mt-3 text-[12px] text-gray-400">보안을 위해 일부만 표시했어요.</p>
          </div>
          <Link
            href="/login"
            className="mt-6 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-gray-900 text-[16px] font-bold text-white"
          >
            로그인하러 가기
          </Link>
          <button
            type="button"
            onClick={() => {
              setEmail(null);
              setError(null);
            }}
            className="mt-3 text-[13px] font-medium text-gray-400"
          >
            다시 찾기
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col">
          <div className="space-y-4">
            <div>
              <label htmlFor="find-name" className="mb-2 block text-[13px] font-bold text-gray-700">
                이름
              </label>
              <input
                id="find-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="가입 시 이름"
                disabled={submitting}
                className="h-12 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="find-phone" className="mb-2 block text-[13px] font-bold text-gray-700">
                휴대폰 번호
              </label>
              <input
                id="find-phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError(null);
                }}
                placeholder="010-0000-0000"
                disabled={submitting}
                className="h-12 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-brand-500 disabled:opacity-60"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-[13px] font-medium text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 h-[52px] w-full rounded-[14px] bg-gray-900 text-[16px] font-bold text-white transition-colors hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "찾는 중..." : "아이디 찾기"}
          </button>
        </form>
      )}
    </div>
  );
}
