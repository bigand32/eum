"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  createMasterPackage,
  deactivateMasterPackage,
  deleteMasterPackage,
  updateMasterPackage,
} from "@/lib/db/api";
import {
  formatPrice,
  PACKAGE_LEVEL_LABEL,
  type MasterPackage,
  type PackageLevel,
  type PackageWeek,
} from "@/lib/db/schema";
import { useMasterId } from "@/lib/auth/use-master-id";
import { useSession } from "@/lib/auth/use-session";
import { useDb } from "@/lib/db/use-db";
import { uploadPackageCover, uploadPackageWeekVideo } from "@/lib/feedback-media";
import {
  formatMediaDuration,
  getMediaDuration,
  isMediaDurationOverLimit,
  mediaDurationLimitMessage,
} from "@/lib/feedback-pricing";
import { WeekVideoThumb } from "@/components/WeekVideoThumb";

const LEVELS: PackageLevel[] = ["beginner", "intermediate", "master"];

type WeekDraft = {
  title: string;
  description: string;
  durationSec: number;
  videoUrl?: string;
};

function emptyWeek(): WeekDraft {
  return { title: "", description: "", durationSec: 0 };
}

function toDrafts(weeks: PackageWeek[]): WeekDraft[] {
  return weeks.map((w) => ({
    title: w.title,
    description: w.description ?? "",
    durationSec: w.durationSec ?? 0,
    videoUrl: w.videoUrl,
  }));
}

function cleanWeeks(weeks: WeekDraft[]): PackageWeek[] {
  return weeks
    .map((w, i) => ({
      week: i + 1,
      title: w.title.trim() || `${i + 1}주차`,
      description: w.description.trim() || undefined,
      videoUrl: w.videoUrl,
      durationSec: Math.max(0, Math.round(w.durationSec || 0)),
    }))
    .filter((w) => w.title);
}

export function MasterPackageForm() {
  const db = useDb();
  const masterId = useMasterId();
  const { session } = useSession();
  const packages = db.masterPackages
    .filter((p) => p.masterId === masterId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const coverInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [level, setLevel] = useState<PackageLevel>("beginner");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [coverUploading, setCoverUploading] = useState(false);
  const [weeks, setWeeks] = useState<WeekDraft[]>([emptyWeek(), emptyWeek()]);
  const [priceVideo, setPriceVideo] = useState(99000);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setLevel("beginner");
    setTitle("");
    setDescription("");
    setCoverUrl(undefined);
    setWeeks([emptyWeek(), emptyWeek()]);
    setPriceVideo(99000);
  };

  const startEdit = (pkg: MasterPackage) => {
    setEditingId(pkg.id);
    setExpandedId(null);
    setLevel(pkg.level);
    setTitle(pkg.title);
    setDescription(pkg.description ?? "");
    setCoverUrl(pkg.coverUrl);
    setWeeks(pkg.weeks.length ? toDrafts(pkg.weeks) : [emptyWeek()]);
    setPriceVideo(pkg.priceVideo);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateWeek = (index: number, patch: Partial<WeekDraft>) => {
    setWeeks((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  };

  const handleCoverFile = async (file: File | undefined) => {
    if (!file || !session?.id) return;
    if (!file.type.startsWith("image/")) {
      setMessage("썸네일은 이미지 파일만 올릴 수 있어요.");
      return;
    }
    setCoverUploading(true);
    setMessage(null);
    try {
      const url = await uploadPackageCover(session.id, file);
      setCoverUrl(url);
    } catch {
      setMessage("썸네일 업로드에 실패했어요.");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const buildPayload = () => {
    const trimmedTitle = title.trim() || `${PACKAGE_LEVEL_LABEL[level]} 온라인 강의`;
    const cleanedWeeks = cleanWeeks(weeks);
    return {
      level,
      title: trimmedTitle,
      description: description.trim() || undefined,
      coverUrl,
      weeks: cleanedWeeks,
      // 하위 호환: 전화/방문 가격은 온라인 강의가와 동일하게 맞춤
      priceVisit: priceVideo,
      pricePhone: priceVideo,
      priceVideo,
    };
  };

  const handleSave = async () => {
    if (!masterId) {
      setMessage("마스터 프로필이 연결되지 않았어요.");
      return;
    }
    const payload = buildPayload();
    if (payload.weeks.length === 0) {
      setMessage("주차별 강의를 최소 1개 입력해 주세요.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (editingId) {
        await updateMasterPackage(editingId, payload);
        setMessage("강의를 수정했어요.");
        resetForm();
      } else {
        await createMasterPackage({ masterId, ...payload });
        setMessage("온라인 강의를 등록했어요.");
        resetForm();
      }
    } catch {
      setMessage(editingId ? "수정에 실패했어요." : "등록에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (packageId: string) => {
    if (!confirm("이 강의 판매를 종료할까요?")) return;
    try {
      await deactivateMasterPackage(packageId);
      if (editingId === packageId) resetForm();
      setMessage("판매를 종료했어요.");
    } catch {
      setMessage("판매 종료에 실패했어요.");
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm("강의를 완전히 삭제할까요? 되돌릴 수 없어요.")) return;
    try {
      await deleteMasterPackage(packageId);
      if (editingId === packageId) resetForm();
      if (expandedId === packageId) setExpandedId(null);
      setMessage("삭제했어요.");
    } catch {
      setMessage("삭제에 실패했어요.");
    }
  };

  return (
    <>
      <PageHeader title="온라인 강의" backHref="/master/settings" />
      <main className="flex flex-col gap-6 p-5 pb-28">
        <section className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-extrabold text-gray-900">
                {editingId ? "강의 수정" : "새 온라인 강의 만들기"}
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-gray-500">
                인프런처럼 주차별 영상·제목·설명을 올리고 한 번에 판매해요.
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="shrink-0 text-[12px] font-bold text-gray-400"
              >
                취소
              </button>
            )}
          </div>

          <div className="mb-4 flex gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition ${
                  level === lv
                    ? "bg-gray-900 text-white"
                    : "bg-surface text-gray-500 hover:bg-gray-100"
                }`}
              >
                {PACKAGE_LEVEL_LABEL[lv]}
              </button>
            ))}
          </div>

          <label className="mb-3 block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">강의 이름</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`예: ${PACKAGE_LEVEL_LABEL[level]} 보컬 4주 완성`}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-gray-400"
            />
          </label>

          <label className="mb-4 block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">한 줄 소개</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 기초 발성부터 한 곡 완성까지"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] outline-none focus:border-gray-400"
            />
          </label>

          <div className="mb-4">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">강의 썸네일</span>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleCoverFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={coverUploading}
              onClick={() => coverInputRef.current?.click()}
              className="relative block w-full overflow-hidden rounded-xl border border-dashed border-gray-200 bg-surface text-left disabled:opacity-60"
            >
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt="" className="aspect-[16/10] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 text-gray-400">
                  <i className="fa-solid fa-image text-[22px]" />
                  <span className="text-[12px] font-medium">
                    {coverUploading ? "업로드 중..." : "썸네일 이미지 선택"}
                  </span>
                </div>
              )}
              {coverUrl && (
                <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1.5 text-center text-[11px] font-bold text-white">
                  {coverUploading ? "업로드 중..." : "썸네일 변경"}
                </span>
              )}
            </button>
            {coverUrl && (
              <button
                type="button"
                onClick={() => setCoverUrl(undefined)}
                className="mt-2 text-[12px] font-medium text-gray-400"
              >
                썸네일 제거
              </button>
            )}
          </div>

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold text-gray-600">주차별 강의</span>
              <button
                type="button"
                onClick={() => setWeeks((prev) => [...prev, emptyWeek()])}
                className="text-[12px] font-bold text-gray-700"
              >
                + 주차 추가
              </button>
            </div>
            <p className="mb-2 text-[11px] text-gray-400">
              주차 썸네일은 올린 강의 영상 그대로 보여요.
            </p>
            <WeekEditor weeks={weeks} onChange={setWeeks} onUpdate={updateWeek} />
          </div>

          <label className="mb-5 block">
            <span className="mb-1.5 block text-[13px] font-bold text-gray-600">
              온라인 강의 가격
            </span>
            <input
              type="number"
              min={0}
              step={1000}
              value={priceVideo}
              onChange={(e) => setPriceVideo(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-[14px] font-bold tabular-nums outline-none focus:border-gray-400"
            />
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="w-full rounded-xl bg-gray-900 py-3.5 text-[15px] font-bold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "저장 중..." : editingId ? "수정 저장" : "강의 등록"}
          </button>
          {message && (
            <p className="mt-3 text-center text-[12px] font-medium text-gray-500">{message}</p>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-[15px] font-bold text-gray-900">등록된 강의</h3>
          {packages.length === 0 ? (
            <div className="rounded-[20px] border border-gray-100 bg-white p-8 text-center text-[13px] text-gray-400">
              아직 등록된 강의가 없어요
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {packages.map((pkg) => (
                <PackageListCard
                  key={pkg.id}
                  pkg={pkg}
                  expanded={expandedId === pkg.id}
                  onToggle={() =>
                    setExpandedId((cur) => (cur === pkg.id ? null : pkg.id))
                  }
                  onEdit={() => startEdit(pkg)}
                  onDeactivate={() => void handleDeactivate(pkg.id)}
                  onDelete={() => void handleDelete(pkg.id)}
                  onMessage={setMessage}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function WeekEditor({
  weeks,
  onChange,
  onUpdate,
}: {
  weeks: WeekDraft[];
  onChange: (weeks: WeekDraft[]) => void;
  onUpdate: (index: number, patch: Partial<WeekDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {weeks.map((week, i) => (
        <WeekDraftCard
          key={i}
          index={i}
          week={week}
          canRemove={weeks.length > 1}
          onUpdate={(patch) => onUpdate(i, patch)}
          onRemove={() => onChange(weeks.filter((_, idx) => idx !== i))}
        />
      ))}
    </div>
  );
}

function WeekDraftCard({
  index,
  week,
  canRemove,
  onUpdate,
  onRemove,
}: {
  index: number;
  week: WeekDraft;
  canRemove: boolean;
  onUpdate: (patch: Partial<WeekDraft>) => void;
  onRemove: () => void;
}) {
  const { session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const handleFile = async (file: File | undefined) => {
    if (!file || !session?.id) return;
    setUploading(true);
    setUploadPct(0);
    try {
      let durationSec = 0;
      try {
        const duration = await getMediaDuration(file);
        if (Number.isFinite(duration) && duration > 0) {
          durationSec = Math.max(1, Math.round(duration));
        }
      } catch {
        durationSec = 0;
      }
      if (durationSec > 0 && isMediaDurationOverLimit(durationSec)) {
        alert(mediaDurationLimitMessage());
        return;
      }
      const url = await uploadPackageWeekVideo(session.id, file, setUploadPct);
      onUpdate({ videoUrl: url, durationSec });
    } catch {
      alert("영상 업로드에 실패했어요.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-surface p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-bold text-gray-500">{index + 1}주차</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-medium text-gray-400"
          >
            삭제
          </button>
        )}
      </div>
      <input
        value={week.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        placeholder="강의 제목"
        className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] font-bold outline-none focus:border-gray-400"
      />
      <textarea
        value={week.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        placeholder="이번 주에 배우는 내용 설명"
        rows={2}
        className="mb-2 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[13px] outline-none focus:border-gray-400"
      />

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {week.videoUrl ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
          <WeekVideoThumb videoUrl={week.videoUrl} className="h-14 w-20" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-gray-800">영상 업로드됨</p>
            <p className="text-[11px] tabular-nums text-gray-400">
              {week.durationSec > 0
                ? `길이 ${formatMediaDuration(week.durationSec)}`
                : "길이 확인 중"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-bold text-gray-700"
            >
              {uploading ? `${uploadPct}%` : "교체"}
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ videoUrl: undefined, durationSec: 0 })}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-gray-400"
            >
              제거
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading || !session?.id}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white py-3 text-[12px] font-bold text-gray-600 disabled:opacity-50"
        >
          <i className="fa-solid fa-video text-[11px]" />
          {uploading ? `업로드 중 ${uploadPct}%` : "강의 영상 올리기"}
        </button>
      )}
    </div>
  );
}

function PackageListCard({
  pkg,
  expanded,
  onToggle,
  onEdit,
  onDeactivate,
  onDelete,
  onMessage,
}: {
  pkg: MasterPackage;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onMessage: (msg: string | null) => void;
}) {
  const [weekDrafts, setWeekDrafts] = useState<WeekDraft[]>(() =>
    pkg.weeks.length ? toDrafts(pkg.weeks) : [emptyWeek()],
  );
  const [savingWeeks, setSavingWeeks] = useState(false);
  const videoCount = pkg.weeks.filter((w) => w.videoUrl).length;

  useEffect(() => {
    if (!expanded) return;
    setWeekDrafts(pkg.weeks.length ? toDrafts(pkg.weeks) : [emptyWeek()]);
  }, [expanded, pkg.id, pkg.weeks]);

  const updateWeek = (index: number, patch: Partial<WeekDraft>) => {
    setWeekDrafts((prev) => prev.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  };

  const handleSaveWeeks = async () => {
    const cleaned = cleanWeeks(weekDrafts);
    if (cleaned.length === 0) {
      onMessage("주차를 최소 1개 남겨 주세요.");
      return;
    }
    setSavingWeeks(true);
    onMessage(null);
    try {
      await updateMasterPackage(pkg.id, {
        level: pkg.level,
        title: pkg.title,
        description: pkg.description,
        coverUrl: pkg.coverUrl,
        weeks: cleaned,
        priceVisit: pkg.priceVisit,
        pricePhone: pkg.pricePhone,
        priceVideo: pkg.priceVideo,
      });
      onMessage("주차별 강의를 저장했어요.");
    } catch {
      onMessage("저장에 실패했어요.");
    } finally {
      setSavingWeeks(false);
    }
  };

  return (
    <div
      className={`overflow-hidden rounded-[20px] border border-gray-100 bg-white ${
        pkg.isActive ? "" : "opacity-60"
      }`}
    >
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="mb-2 flex gap-3">
          {pkg.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pkg.coverUrl}
              alt=""
              className="h-14 w-20 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-surface text-gray-300">
              <i className="fa-solid fa-image text-[14px]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                  {PACKAGE_LEVEL_LABEL[pkg.level]}
                </span>
                <span className="truncate text-[14px] font-bold text-gray-900">{pkg.title}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[11px] font-medium text-gray-400">
                  {pkg.isActive ? "판매중" : "종료"}
                </span>
                <i
                  className={`fa-solid fa-chevron-down text-[10px] text-gray-300 transition-transform ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
            <p className="text-[12px] text-gray-500">
              {pkg.weeks.length}주 · 영상 {videoCount}개 · {formatPrice(pkg.priceVideo)}원
            </p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-gray-800">주차별 강의</p>
            <button
              type="button"
              onClick={() => setWeekDrafts((prev) => [...prev, emptyWeek()])}
              className="text-[12px] font-bold text-gray-700"
            >
              + 추가
            </button>
          </div>

          <WeekEditor
            weeks={weekDrafts}
            onChange={setWeekDrafts}
            onUpdate={updateWeek}
          />

          <button
            type="button"
            disabled={savingWeeks}
            onClick={() => void handleSaveWeeks()}
            className="mt-3 w-full rounded-xl bg-gray-900 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {savingWeeks ? "저장 중..." : "주차 내용 저장"}
          </button>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-700"
            >
              전체 수정
            </button>
            {pkg.isActive && (
              <button
                type="button"
                onClick={onDeactivate}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-bold text-gray-700"
              >
                판매종료
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-bold text-gray-500"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
