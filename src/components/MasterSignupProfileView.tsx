"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { registerAccount } from "@/lib/auth/accounts";
import { formatSignupError } from "@/lib/auth/errors";
import { normalizePhone, readImageAsDataUrl } from "@/lib/auth/phone";
import {
  clearMasterSignupDraft,
  loadMasterSignupDraft,
  type MasterSignupDraft,
} from "@/lib/auth/signup-draft";
import { getHomePathForRole, getSession, isAuthenticated, setSession } from "@/lib/auth/session";

const inputClass =
  "h-12 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-[15px] outline-none focus:border-brand-500";

function LineAddField({
  label,
  placeholder,
  items,
  draft,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  items: string[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-bold text-gray-700">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={onAdd}
          aria-label={`${label} 추가`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-gray-200 bg-white text-[18px] text-brand-500 transition-colors hover:bg-brand-50"
        >
          <i className="fa-solid fa-plus" />
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center gap-2 rounded-[12px] border border-gray-100 bg-white px-3 py-2.5"
            >
              <span className="flex-1 text-[14px] font-medium text-gray-700">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                aria-label="삭제"
              >
                <i className="fa-solid fa-xmark text-[12px]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MasterSignupProfileView() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<MasterSignupDraft | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [bio, setBio] = useState("");
  const [careers, setCareers] = useState<string[]>([]);
  const [careerDraft, setCareerDraft] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      const session = getSession();
      if (session) router.replace(getHomePathForRole(session.role));
      return;
    }

    const saved = loadMasterSignupDraft();
    if (!saved) {
      router.replace("/signup");
      return;
    }
    setDraft(saved);
  }, [router]);

  const handleAvatarChange = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("프로필 사진은 이미지 파일만 가능해요.");
      return;
    }
    try {
      const dataUrl = await readImageAsDataUrl(file);
      setAvatarPreview(dataUrl);
      setAvatarDataUrl(dataUrl);
      setError(null);
    } catch {
      setError("프로필 사진을 불러올 수 없어요.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    if (!avatarDataUrl) {
      setError("프로필 사진을 등록해 주세요.");
      return;
    }
    if (!title.trim()) {
      setError("활동명을 입력해 주세요.");
      return;
    }
    if (!bio.trim()) {
      setError("자기소개를 입력해 주세요.");
      return;
    }
    const career = careers.map((line) => line.trim()).filter(Boolean);
    if (career.length === 0) {
      setError("경력을 한 줄 이상 추가해 주세요.");
      return;
    }
    const tagList = tags.map((tag) => tag.trim()).filter(Boolean);
    if (tagList.length === 0) {
      setError("전문 분야를 한 가지 이상 추가해 주세요.");
      return;
    }

    try {
      const user = await registerAccount({
        role: "master",
        name: draft.name,
        email: draft.email,
        phone: normalizePhone(draft.phone),
        password: draft.password,
        masterProfile: {
          title: title.trim(),
          bio: bio.trim(),
          career,
          tags: tagList,
          avatarUrl: avatarDataUrl,
        },
      });
      clearMasterSignupDraft();
      setSession(user);
      router.push("/master");
    } catch (err) {
      setError(formatSignupError(err));
    }
  };

  if (!draft) return null;

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-12 pb-10">
      <Link
        href="/signup"
        className="mb-6 inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-gray-600"
      >
        <i className="fa-solid fa-chevron-left text-[14px]" />
      </Link>

      <div className="mb-6">
        <p className="text-[13px] font-bold text-brand-500">2 / 2</p>
        <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-gray-900">
          강사 프로필
        </h1>
        <p className="mt-2 text-[14px] font-medium text-gray-500">
          학생들에게 보여질 프로필을 작성해 주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-white"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center text-[11px] font-medium text-gray-400">
                  <i className="fa-solid fa-camera mb-1 text-[16px]" />
                  사진
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e.target.files?.[0])}
            />
            <p className="text-[12px] leading-relaxed text-gray-500">
              프로필 사진을 등록해 주세요.
              <br />
              학생들에게 보이는 대표 이미지예요.
            </p>
          </div>

          <div>
            <label htmlFor="title" className="mb-2 block text-[13px] font-bold text-gray-700">
              활동명
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              placeholder="예: 김뮤직 마스터"
              className={inputClass}
            />
          </div>

          <LineAddField
            label="전문 분야"
            placeholder="예: 팝보컬"
            items={tags}
            draft={tagDraft}
            onDraftChange={(value) => {
              setTagDraft(value);
              setError(null);
            }}
            onAdd={() => {
              const next = tagDraft.trim();
              if (!next) return;
              setTags((prev) => [...prev, next]);
              setTagDraft("");
              setError(null);
            }}
            onRemove={(index) => {
              setTags((prev) => prev.filter((_, i) => i !== index));
            }}
          />

          <div>
            <label htmlFor="bio" className="mb-2 block text-[13px] font-bold text-gray-700">
              자기소개
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setError(null);
              }}
              rows={4}
              placeholder="코칭 스타일과 강점을 소개해 주세요."
              className="w-full resize-none rounded-[14px] border border-gray-200 bg-white p-4 text-[14px] outline-none focus:border-brand-500"
            />
          </div>

          <LineAddField
            label="경력"
            placeholder="예: 前 ○○엔터 보컬 트레이너"
            items={careers}
            draft={careerDraft}
            onDraftChange={(value) => {
              setCareerDraft(value);
              setError(null);
            }}
            onAdd={() => {
              const next = careerDraft.trim();
              if (!next) return;
              setCareers((prev) => [...prev, next]);
              setCareerDraft("");
              setError(null);
            }}
            onRemove={(index) => {
              setCareers((prev) => prev.filter((_, i) => i !== index));
            }}
          />
        </div>

        {error && <p className="mt-4 text-[13px] font-medium text-red-500">{error}</p>}

        <button
          type="submit"
          className="mt-6 h-[52px] w-full rounded-[14px] bg-gray-900 text-[16px] font-bold text-white transition-colors hover:bg-gray-800"
        >
          가입 완료
        </button>
      </form>
    </div>
  );
}
