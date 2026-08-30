"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth/use-session";
import { useStudentId } from "@/lib/auth/use-student-id";
import { savePracticeRecording, practiceSaveErrorMessage } from "@/lib/practice-recording";
import { markAttendanceToday } from "@/lib/attendance";
import { formatTime } from "@/lib/timestamp-comments";

function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function getRecorderMimeType() {
  const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function isPermissionError(error: unknown) {
  if (!(error instanceof DOMException)) return false;
  return error.name === "NotAllowedError" || error.name === "PermissionDeniedError";
}

function isMicNotSupported() {
  return typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia;
}

function isRecorderNotSupported() {
  return typeof MediaRecorder === "undefined";
}

async function requestMicStream(timeoutMs = 12_000): Promise<MediaStream> {
  if (isMicNotSupported()) {
    throw new Error("NOT_SUPPORTED");
  }

  return Promise.race([
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
    new Promise<MediaStream>((_, reject) => {
      window.setTimeout(() => reject(new Error("MIC_TIMEOUT")), timeoutMs);
    }),
  ]);
}

function createMediaRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = getRecorderMimeType();
  if (mimeType) {
    try {
      return new MediaRecorder(stream, { mimeType });
    } catch {
      // Safari/iOS fallback
    }
  }
  return new MediaRecorder(stream);
}

function micErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "NOT_SUPPORTED") {
      return "이 브라우저에서는 녹음을 지원하지 않아요. Safari로 열어 주세요.";
    }
    if (error.message === "MIC_TIMEOUT") {
      return "마이크 연결이 지연되고 있어요. 권한 팝업을 확인하거나 Safari를 새로고침해 주세요.";
    }
    if (error.message === "RECORD_NOT_SUPPORTED") {
      return "이 기기에서는 녹음 형식을 지원하지 않아요.";
    }
  }
  if (isPermissionError(error)) {
    return "마이크 권한이 필요해요. 설정 → Safari → 마이크에서 허용해 주세요.";
  }
  return "마이크를 사용할 수 없어요. Safari를 새로고침하거나 이어폰을 연결해 보세요.";
}

export function RecordModal() {
  const studentId = useStudentId();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [isMonitorOn, setIsMonitorOn] = useState(() => !isIOSDevice());
  const [isReverbOn, setIsReverbOn] = useState(false);
  const [isPitchOn, setIsPitchOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micLoading, setMicLoading] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [saving, setSaving] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const pitchFilterRef = useRef<BiquadFilterNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderMimeRef = useRef("");
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordedDurationRef = useRef(0);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const syncElapsed = useCallback(() => {
    if (recordingStartedAtRef.current === null) return 0;
    const sec = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000);
    setElapsedSec(sec);
    recordedDurationRef.current = sec;
    return sec;
  }, []);

  const stopMic = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    setMicReady(false);
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    monitorGainRef.current = null;
    reverbGainRef.current = null;
    pitchFilterRef.current = null;
  }, []);

  const setupMonitorGraph = useCallback(
    (ctx: AudioContext, stream: MediaStream) => {
      const source = ctx.createMediaStreamSource(stream);
      const monitorGain = ctx.createGain();
      monitorGain.gain.value = isMonitorOn ? 0.75 : 0;

      const delay = ctx.createDelay(0.3);
      delay.delayTime.value = 0.07;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.35;
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = isReverbOn ? 0.45 : 0;

      const pitchFilter = ctx.createBiquadFilter();
      pitchFilter.type = "peaking";
      pitchFilter.frequency.value = 2800;
      pitchFilter.Q.value = 1.2;
      pitchFilter.gain.value = isPitchOn ? 4 : 0;

      source.connect(pitchFilter);
      pitchFilter.connect(monitorGain);
      source.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(reverbGain);
      reverbGain.connect(monitorGain);
      monitorGain.connect(ctx.destination);

      monitorGainRef.current = monitorGain;
      reverbGainRef.current = reverbGain;
      pitchFilterRef.current = pitchFilter;
    },
    [isMonitorOn, isReverbOn, isPitchOn],
  );

  const ensureMic = useCallback(async () => {
    if (micStreamRef.current) return micStreamRef.current;

    const stream = await requestMicStream();
    micStreamRef.current = stream;

    if (isMonitorOn && !isIOSDevice()) {
      const ctx = new AudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      setupMonitorGraph(ctx, stream);
      audioCtxRef.current = ctx;
    }

    setMicReady(true);
    return stream;
  }, [isMonitorOn, setupMonitorGraph]);

  const openModal = () => {
    if (isRecorderNotSupported()) {
      alert("이 브라우저에서는 녹음을 지원하지 않아요. iPhone 기본 Safari로 열어 주세요.");
      return;
    }
    setOpen(true);
    setRecordedBlob(null);
    setElapsedSec(0);
    recordedDurationRef.current = 0;
    recordingStartedAtRef.current = null;
    setMicReady(false);
    setMicError(null);
  };

  const startRecording = () => {
    if (!micStreamRef.current) {
      throw new Error("MIC_NOT_READY");
    }

    playbackAudioRef.current?.pause();
    setPlaybackPlaying(false);
    setRecordedBlob(null);
    setMicError(null);
    chunksRef.current = [];

    let recorder: MediaRecorder;
    try {
      recorder = createMediaRecorder(micStreamRef.current);
    } catch {
      throw new Error("RECORD_NOT_SUPPORTED");
    }

    recorderMimeRef.current = recorder.mimeType || getRecorderMimeType();
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(isIOSDevice() ? undefined : 250);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    recordingStartedAtRef.current = Date.now();
    recordedDurationRef.current = 0;
    syncElapsed();
    timerRef.current = setInterval(syncElapsed, 250);
  };

  const finalizeRecording = useCallback(async () => {
    syncElapsed();
    recordingStartedAtRef.current = null;
    clearTimer();
    setIsRecording(false);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setIsFinalizing(true);
    setMicError(null);

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        const blobType = recorderMimeRef.current || recorder.mimeType || "audio/mp4";
        const blob = new Blob(chunksRef.current, { type: blobType });
        if (blob.size > 0) {
          setRecordedBlob(blob);
        } else {
          setRecordedBlob(null);
          setMicError("녹음 파일을 만들지 못했어요. 1초 이상 녹음한 뒤 다시 시도해 주세요.");
        }
        mediaRecorderRef.current = null;
        resolve();
      };

      recorder.onstop = finish;
      recorder.onerror = () => {
        setMicError("녹음을 저장하지 못했어요. 다시 시도해 주세요.");
        finish();
      };

      try {
        if (recorder.state === "recording") {
          recorder.requestData();
        }
      } catch {
        // Safari/iOS may not support requestData — stop() still flushes on stop.
      }

      try {
        recorder.stop();
      } catch {
        finish();
        return;
      }

      window.setTimeout(finish, 2000);
    });

    setIsFinalizing(false);
  }, [syncElapsed, clearTimer]);

  const closeModal = () => {
    if (isRecording) void finalizeRecording();
    playbackAudioRef.current?.pause();
    clearTimer();
    recordingStartedAtRef.current = null;
    stopMic();
    setMicLoading(false);
    setIsFinalizing(false);
    setOpen(false);
  };

  const handleRecordTap = () => {
    void (async () => {
      if (isRecording) {
        await finalizeRecording();
        return;
      }

      if (isFinalizing || micLoading) return;

      setMicLoading(true);
      setMicError(null);
      try {
        await ensureMic();
        if (audioCtxRef.current?.state === "suspended") {
          await audioCtxRef.current.resume();
        }
        startRecording();
      } catch (error) {
        stopMic();
        setMicReady(false);
        const message = micErrorMessage(error);
        setMicError(message);
        alert(message);
      } finally {
        setMicLoading(false);
      }
    })();
  };

  useEffect(() => {
    if (monitorGainRef.current) {
      monitorGainRef.current.gain.value = isMonitorOn ? 0.75 : 0;
    }
  }, [isMonitorOn]);

  useEffect(() => {
    if (reverbGainRef.current) {
      reverbGainRef.current.gain.value = isReverbOn ? 0.45 : 0;
    }
  }, [isReverbOn]);

  useEffect(() => {
    if (pitchFilterRef.current) {
      pitchFilterRef.current.gain.value = isPitchOn ? 4 : 0;
    }
  }, [isPitchOn]);

  useEffect(() => () => stopMic(), [stopMic]);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openModal}
          className="w-full rounded-xl bg-gray-900 py-3.5 text-[15px] font-bold text-white hover:bg-gray-800"
        >
          지금 녹음 시작하기
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] mx-auto flex max-w-[400px] flex-col justify-end bg-black/40 backdrop-blur-sm">
          <div className="shadow-float max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-white px-5 pt-5 pb-10 no-scrollbar">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[18px] font-bold text-gray-900">자유 녹음</h3>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-gray-500"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <p className="mb-4 flex items-start gap-1.5 text-[12px] leading-relaxed text-gray-500">
              <i className="fa-solid fa-headphones mt-0.5 shrink-0 text-[11px] text-gray-400" />
              <span>
                {isIOSDevice() ? (
                  <>
                    <span className="font-semibold text-gray-600">iPhone Safari 제한:</span> 실시간
                    모니터링은 에어팟이 아니라 <span className="font-semibold">스피커</span>로
                    나올 수 있어요. 녹음 후 재생 버튼으로 확인해 주세요.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-gray-600">이어폰 사용을 권장해요.</span>{" "}
                    스피커로 모니터링하면 하울링이 날 수 있어요.
                  </>
                )}
              </span>
            </p>

            <div className="flex items-center justify-between border-b border-gray-100 py-3">
              <div>
                <p className="text-[14px] font-bold text-gray-900">실시간 모니터링</p>
                <p className="mt-0.5 text-[12px] text-gray-500">
                  {isIOSDevice()
                    ? "iPhone 웹에서는 지원되지 않아요"
                    : "말하는 동시에 내 목소리 들리기"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isMonitorOn}
                disabled={isIOSDevice()}
                onClick={() => setIsMonitorOn((v) => !v)}
                className={`toggle-track relative h-7 w-12 shrink-0 rounded-full disabled:opacity-40 ${isMonitorOn ? "is-on bg-brand-500" : "bg-gray-200"}`}
              >
                <span className="toggle-knob absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform" />
              </button>
            </div>

            <div className="mb-4 border-b border-gray-100 py-3">
              <p className="mb-3 text-[12px] font-bold tracking-wide text-gray-400">이펙트 (선택)</p>
              <div className="flex gap-2">
                {[
                  { label: "리버브", icon: "fa-water", on: isReverbOn, set: setIsReverbOn },
                  { label: "피치 보정", icon: "fa-music", on: isPitchOn, set: setIsPitchOn },
                ].map((fx) => (
                  <button
                    key={fx.label}
                    type="button"
                    onClick={() => fx.set((v) => !v)}
                    className={`flex-1 rounded-xl border py-2.5 text-[13px] font-semibold transition ${
                      fx.on
                        ? "border-brand-500 bg-brand-50 text-brand-600"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    <i className={`fa-solid ${fx.icon} mr-1`} />
                    {fx.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-2 flex flex-col items-center py-4">
              <div className="mb-3 flex h-5 items-center gap-2">
                {isRecording ? (
                  <>
                    <span className="rec-dot h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-[13px] font-bold text-red-500">녹음 중</span>
                  </>
                ) : isFinalizing ? (
                  <span className="text-[13px] font-medium text-gray-400">녹음 파일 만드는 중...</span>
                ) : (
                  <span className="text-[13px] font-medium text-gray-400">
                    {micLoading
                      ? "마이크 연결 중..."
                      : recordedBlob
                        ? "녹음 완료"
                        : micReady
                          ? "녹음 준비됨"
                          : "빨간 버튼을 눌러 녹음 시작"}
                  </span>
                )}
              </div>
              <div className="mb-4 text-[36px] font-extrabold tracking-tight text-gray-900 tabular-nums">
                {formatTime(elapsedSec)}
              </div>
              <div
                className={`mb-5 flex h-10 items-end justify-center gap-[3px] ${isRecording ? "" : "opacity-30"}`}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="wave-bar w-[3px] rounded-full bg-brand-500"
                    style={{ height: "100%", animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <button
                type="button"
                disabled={micLoading || isFinalizing}
                onClick={handleRecordTap}
                className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] disabled:opacity-60 ${
                  isRecording ? "bg-gray-900" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                <i className={`fa-solid ${isRecording ? "fa-stop" : "fa-microphone"}`} />
              </button>
              <p className="mt-3 text-center text-[12px] text-gray-400">
                {isRecording ? "탭하여 녹음 중지" : "탭하여 녹음 시작"}
              </p>
              {micError && (
                <p className="mt-2 px-2 text-center text-[12px] font-medium text-red-500">
                  {micError}
                </p>
              )}
            </div>

            {recordedBlob && recordedBlob.size > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-3 rounded-[16px] bg-surface p-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (playbackPlaying) {
                        playbackAudioRef.current?.pause();
                        setPlaybackPlaying(false);
                        return;
                      }
                      playbackAudioRef.current?.pause();
                      const audio = new Audio(URL.createObjectURL(recordedBlob));
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
                    <p className="text-[13px] font-bold text-gray-900">방금 녹음한 연습</p>
                    <p className="text-[11px] text-gray-500 tabular-nums">{formatTime(elapsedSec)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    void (async () => {
                      if (!recordedBlob) return;
                      setSaving(true);
                      try {
                        const durationSec = Math.max(recordedDurationRef.current, elapsedSec, 1);
                        const today = new Date();
                        await savePracticeRecording({
                          authUserId: session?.id,
                          studentId: session?.studentId ?? studentId,
                          blob: recordedBlob,
                          durationSec,
                          title: `${today.getMonth() + 1}월 ${today.getDate()}일 연습`,
                        });
                        markAttendanceToday();
                        closeModal();
                      } catch (error) {
                        alert(practiceSaveErrorMessage(error));
                      } finally {
                        setSaving(false);
                      }
                    })();
                  }}
                  className="w-full rounded-xl bg-brand-500 py-3.5 text-[15px] font-bold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "일지에 저장하기 (+300P)"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
