"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useSession } from "@/lib/auth/use-session";
import { useStudentId } from "@/lib/auth/use-student-id";
import { savePracticeRecording, practiceSaveErrorMessage } from "@/lib/practice-recording";
import { getMediaDuration, isVideoFile } from "@/lib/feedback-pricing";
import { markAttendanceToday } from "@/lib/attendance";
import { formatTime } from "@/lib/timestamp-comments";

export function RecordModal() {
  const studentId = useStudentId();
  const { session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [selectedFile, setSelectedFile] = useState<Blob | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [saving, setSaving] = useState(false);

  const clearPreview = useCallback(() => {
    playbackAudioRef.current?.pause();
    setPlaybackPlaying(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setIsVideo(false);
    setElapsedSec(0);
    durationRef.current = 0;
  }, [previewUrl]);

  const applyFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    playbackAudioRef.current?.pause();
    setPlaybackPlaying(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
        let durationSec = 1;
        try {
          const duration = await getMediaDuration(file);
          if (Number.isFinite(duration) && duration > 0) {
            durationSec = Math.max(1, Math.ceil(duration));
          }
        } catch {
          durationSec = 1;
        }

        setSelectedFile(file);
        setIsVideo(isVideoFile(file));
        setPreviewUrl(URL.createObjectURL(file));
        setElapsedSec(durationSec);
        durationRef.current = durationSec;
      } catch {
        setError("파일을 불러오지 못했어요. 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
  }, []);

  const openModal = () => {
    clearPreview();
    setError(null);
    setOpen(true);
  };

  const closeModal = () => {
    clearPreview();
    setError(null);
    setOpen(false);
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void applyFile(file);
  };

  const handleSave = () => {
    void (async () => {
      if (!selectedFile) return;
      setSaving(true);
      try {
        const durationSec = Math.max(durationRef.current, elapsedSec, 1);
        const today = new Date();
        await savePracticeRecording({
          authUserId: session?.id,
          studentId: session?.studentId ?? studentId,
          blob: selectedFile,
          durationSec,
          title: `${today.getMonth() + 1}월 ${today.getDate()}일 연습`,
        });
        markAttendanceToday();
        closeModal();
      } catch (err) {
        alert(practiceSaveErrorMessage(err));
      } finally {
        setSaving(false);
      }
    })();
  };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openModal}
          className="w-full rounded-xl bg-gray-900 py-3.5 text-[15px] font-bold text-white hover:bg-gray-800"
        >
          지금 연습 영상 올리기
        </button>
      )}

      {open && (
        <div className="pointer-events-none fixed inset-0 z-[80] mx-auto max-w-[400px]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end">
            <div className="pointer-events-auto shadow-float max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] no-scrollbar">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[18px] font-bold text-gray-900">연습 기록</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-gray-500"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <p className="mb-4 text-[12px] leading-relaxed text-gray-500">
                연습 영상을 촬영하거나, 갤러리에서 영상·음원 파일을 선택해 주세요.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,audio/*,.mov,.mp4,.m4a,.mp3"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={handleFileInputChange}
              />

              {!selectedFile && (
                <>
                  <button
                    type="button"
                    disabled={loading || saving}
                    onClick={() => cameraInputRef.current?.click()}
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3.5 text-[15px] font-bold text-white hover:bg-gray-800 disabled:opacity-60"
                  >
                    <i className="fa-solid fa-video" />
                    카메라로 촬영하기
                  </button>
                  <button
                    type="button"
                    disabled={loading || saving}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl border border-gray-200 py-3 text-[14px] font-semibold text-gray-600 disabled:opacity-60"
                  >
                    갤러리에서 영상·음원 선택
                  </button>
                </>
              )}

              {loading && (
                <p className="mt-4 text-center text-[13px] font-medium text-gray-400">파일 불러오는 중...</p>
              )}

              {error && (
                <p className="mt-4 px-2 text-center text-[12px] font-medium text-red-500">{error}</p>
              )}

              {selectedFile && selectedFile.size > 0 && (
                <div className="mt-4">
                  <div className="mb-3 rounded-[16px] bg-surface p-4">
                    {isVideo && previewUrl ? (
                      <video
                        src={previewUrl}
                        controls
                        playsInline
                        className="mb-3 w-full rounded-xl bg-black"
                      />
                    ) : (
                      <div className="mb-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (playbackPlaying) {
                              playbackAudioRef.current?.pause();
                              setPlaybackPlaying(false);
                              return;
                            }
                            playbackAudioRef.current?.pause();
                            const audio = new Audio(previewUrl ?? URL.createObjectURL(selectedFile));
                            playbackAudioRef.current = audio;
                            void audio.play();
                            setPlaybackPlaying(true);
                            audio.onended = () => setPlaybackPlaying(false);
                          }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"
                        >
                          <i
                            className={`fa-solid ${playbackPlaying ? "fa-pause" : "fa-play"} text-[12px] ${playbackPlaying ? "" : "ml-0.5"}`}
                          />
                        </button>
                        <div>
                          <p className="text-[13px] font-bold text-gray-900">미리듣기</p>
                          <p className="text-[11px] text-gray-500 tabular-nums">{formatTime(elapsedSec)}</p>
                        </div>
                      </div>
                    )}
                    <p className="text-[13px] font-bold text-gray-900">
                      {isVideo ? "선택한 연습 영상" : "선택한 연습 음원"}
                    </p>
                    <p className="text-[11px] text-gray-500 tabular-nums">{formatTime(elapsedSec)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={clearPreview}
                    className="mb-2 w-full rounded-xl border border-gray-200 py-3 text-[14px] font-semibold text-gray-600"
                  >
                    다시 선택하기
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="w-full rounded-xl bg-brand-500 py-3.5 text-[15px] font-bold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {saving ? "저장 중..." : "일지에 저장하기 (+300P)"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
