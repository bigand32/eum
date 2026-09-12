"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { readImageAsDataUrl } from "@/lib/auth/phone";
import {
  loadMasterSignupDraft,
  saveMasterSignupDraft,
  type MasterSignupDraft,
} from "@/lib/auth/signup-draft";
import { getHomePathForRole, getSession, isAuthenticated } from "@/lib/auth/session";

const ACCEPT = "image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf";
const MAX_BYTES = 4 * 1024 * 1024;

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "application/pdf" ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".pdf")
  );
}

export function MasterSignupVerifyView() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<MasterSignupDraft | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
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
    if (saved.verificationFile) {
      setFileName(saved.verificationFile.fileName);
      if (saved.verificationFile.mimeType.startsWith("image/")) {
        setPreviewUrl(saved.verificationFile.dataUrl);
      }
    }
  }, [router]);

  const acceptFile = async (file: File | undefined) => {
    if (!file || !draft) return;
    if (!isAllowedFile(file)) {
      setError("PNG, JPG, PDF 파일만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("파일은 4MB 이하로 올려 주세요.");
      return;
    }

    try {
      const dataUrl = await readImageAsDataUrl(file);
      const next = {
        ...draft,
        verificationFile: {
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          dataUrl,
        },
      };
      saveMasterSignupDraft(next);
      setDraft(next);
      setFileName(file.name);
      setPreviewUrl(file.type.startsWith("image/") ? dataUrl : null);
      setError(null);
    } catch {
      setError("파일을 불러올 수 없어요. 다시 시도해 주세요.");
    }
  };

  const clearFile = () => {
    if (!draft) return;
    const next = { ...draft, verificationFile: undefined };
    saveMasterSignupDraft(next);
    setDraft(next);
    setFileName(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleNext = () => {
    if (!draft?.verificationFile) {
      setError("학원강사 확인서 또는 사업자등록증을 첨부해 주세요.");
      return;
    }
    router.push("/signup/master");
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
        <p className="text-[13px] font-bold text-brand-500">2 / 3 · 마스터 인증</p>
        <h1 className="mt-1 text-[24px] font-extrabold tracking-tight text-gray-900">
          서류를 제출해주세요
        </h1>
        <p className="mt-2 text-[14px] font-medium text-gray-400">
          학원강사 확인서 또는 사업자등록증을 올려 주세요
        </p>
      </div>

      <div className="rounded-[18px] bg-[#eceef1] p-3.5">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-2 py-1 text-[10px] font-bold text-white">
          <i className="fa-regular fa-image text-[10px]" />
          예시 이미지
        </span>
        <div className="mt-3 flex items-stretch gap-1.5">
          <ExampleAcademyProof />
          <span className="flex shrink-0 items-center text-[10px] font-bold text-gray-500">또는</span>
          <ExampleBusinessLicense />
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void acceptFile(e.dataTransfer.files?.[0]);
        }}
        className={`mt-5 flex min-h-[148px] w-full flex-col items-center justify-center rounded-[16px] border border-dashed px-4 py-6 text-center transition ${
          dragging ? "border-brand-500 bg-brand-50" : "border-gray-300 bg-white"
        }`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="mb-3 h-16 w-12 rounded-[6px] object-cover" />
        ) : (
          <i className="fa-regular fa-file-lines mb-3 text-[22px] text-gray-400" />
        )}
        {fileName ? (
          <>
            <p className="max-w-full truncate text-[14px] font-bold text-gray-900">{fileName}</p>
            <p className="mt-1 text-[12px] font-medium text-gray-400">다시 올리려면 눌러 주세요</p>
          </>
        ) : (
          <>
            <p className="text-[14px] font-bold text-gray-900">
              파일을 끌어오거나 이 곳을 클릭해주세요
            </p>
            <p className="mt-1.5 text-[12px] font-medium text-gray-400">
              PNG, JPG, PDF 파일만 업로드 가능
            </p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => void acceptFile(e.target.files?.[0])}
      />

      {fileName && (
        <div className="mt-3 flex items-center justify-between rounded-[12px] bg-surface px-3 py-2.5">
          <p className="min-w-0 truncate text-[12px] font-medium text-gray-600">{fileName}</p>
          <button
            type="button"
            onClick={clearFile}
            className="ml-3 shrink-0 text-[12px] font-bold text-gray-400"
          >
            삭제
          </button>
        </div>
      )}

      <ul className="mt-4 space-y-1.5 text-[12px] leading-relaxed text-gray-400">
        <li>· 학원강사 확인서, 또는 사업자등록증 중 하나를 올려 주세요.</li>
        <li>· 개인정보가 포함된 경우 주민번호 뒷자리는 마스킹해 주세요.</li>
        <li>· 첨부파일은 마스터 인증에만 사용되며, 인증 후 삭제됩니다.</li>
        <li>
          · 파일 업로드가 실패하는 경우, 모바일 웹(크롬, 사파리 등 브라우저) 혹은 개인 PC로 접속하여
          진행해 주세요.
        </li>
      </ul>

      {error && <p className="mt-4 text-[13px] font-medium text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleNext}
        className="mt-6 h-[52px] w-full rounded-[14px] bg-gray-900 text-[16px] font-bold text-white transition-colors hover:bg-gray-800"
      >
        다음
      </button>
    </div>
  );
}

function ExampleAcademyProof() {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-[10px] border border-gray-200 bg-white px-2 py-2.5">
      <p className="text-center text-[9px] font-bold text-gray-800">학원강사 확인서</p>
      <dl className="mt-2.5 space-y-1 text-[7px] leading-tight text-gray-500">
        <ExampleRow label="학원명" value="OO 보컬아카데미" />
        <ExampleRow label="성명" value="OOO" />
        <ExampleRow label="직위" value="보컬 강사" />
        <ExampleRow label="재직기간" value="0000.00 ~" />
      </dl>
      <div className="mt-2 space-y-1">
        <div className="h-1.5 w-full rounded-sm bg-gray-100" />
        <div className="h-1.5 w-4/5 rounded-sm bg-gray-100" />
      </div>
      <p className="mt-auto pt-2 text-center text-[7px] tracking-[0.12em] text-gray-400">
        학원 직인
      </p>
    </div>
  );
}

function ExampleBusinessLicense() {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-[10px] border border-gray-200 bg-white px-2 py-2.5">
      <p className="text-center text-[9px] font-bold text-gray-800">사업자등록증</p>
      <dl className="mt-2.5 space-y-1.5 text-[7px] text-gray-500">
        <ExampleRow label="상호" value="OOO" />
        <ExampleRow label="대표자" value="OOO" />
        <div className="flex items-center justify-between gap-1">
          <span>등록번호</span>
          <span className="h-1.5 w-10 rounded-sm bg-gray-200" />
        </div>
        <ExampleRow label="업태" value="교육서비스" />
      </dl>
      <div className="mt-2 space-y-1">
        <div className="h-1.5 w-full rounded-sm bg-gray-100" />
        <div className="h-1.5 w-3/5 rounded-sm bg-gray-100" />
      </div>
      <p className="mt-auto pt-3 text-center text-[7px] tracking-[0.18em] text-gray-400">
        발급기관
      </p>
    </div>
  );
}

function ExampleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-1">
      <dt className="shrink-0">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}
