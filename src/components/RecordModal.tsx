"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth/use-session";
import { useStudentId } from "@/lib/auth/use-student-id";
import { savePracticeRecord } from "@/lib/db/api";
import { uploadPracticeBlob } from "@/lib/feedback-media";
import { markAttendanceToday } from "@/lib/attendance";
import { formatTime } from "@/lib/timestamp-comments";

export function RecordModal() {
  const studentId = useStudentId();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [isMonitorOn, setIsMonitorOn] = useState(true);
  const [isReverbOn, setIsReverbOn] = useState(false);
  const [isPitchOn, setIsPitchOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [saving, setSaving] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const pitchFilterRef = useRef<BiquadFilterNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopMic = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    monitorGainRef.current = null;
    reverbGainRef.current = null;
    pitchFilterRef.current = null;
  }, []);

  const initAudio = useCallback(async () => {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
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

    audioCtxRef.current = ctx;
    micStreamRef.current = stream;
    monitorGainRef.current = monitorGain;
    reverbGainRef.current = reverbGain;
    pitchFilterRef.current = pitchFilter;
  }, [isMonitorOn, isReverbOn, isPitchOn]);

  const openModal = async () => {
    setOpen(true);
    setRecordedBlob(null);
    setElapsedSec(0);
    try {
      await initAudio();
    } catch {
      alert("마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.");
      setOpen(false);
    }
  };

  const closeModal = () => {
    if (isRecording) stopRecording();
    playbackAudioRef.current?.pause();
    stopMic();
    setOpen(false);
  };

  const startRecording = () => {
    if (!micStreamRef.current) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(micStreamRef.current);
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      setRecordedBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setElapsedSec(0);
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => void openModal()}
        className="w-full rounded-xl bg-gray-900 py-3.5 text-[15px] font-bold text-white hover:bg-gray-800"
      >
        지금 녹음 시작하기
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        className="w-full rounded-xl bg-gray-900 py-3.5 text-[15px] font-bold text-white hover:bg-gray-800"
      >
        지금 녹음 시작하기
      </button>

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
              <span className="font-semibold text-gray-600">이어폰 사용을 권장해요.</span> 스피커로
              모니터링하면 하울링이 날 수 있어요.
            </span>
          </p>

          <div className="flex items-center justify-between border-b border-gray-100 py-3">
            <div>
              <p className="text-[14px] font-bold text-gray-900">실시간 모니터링</p>
              <p className="mt-0.5 text-[12px] text-gray-500">말하는 동시에 내 목소리 들리기</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isMonitorOn}
              onClick={() => setIsMonitorOn((v) => !v)}
              className={`toggle-track relative h-7 w-12 shrink-0 rounded-full ${isMonitorOn ? "is-on bg-brand-500" : "bg-gray-200"}`}
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
              ) : (
                <span className="text-[13px] font-medium text-gray-400">
                  {recordedBlob ? "녹음 완료" : "녹음 준비됨"}
                </span>
              )}
            </div>
            <div className="mb-4 text-[36px] font-extrabold tracking-tight text-gray-900 tabular-nums">
              {formatTime(elapsedSec)}
            </div>
            <div className={`mb-5 flex h-10 items-end justify-center gap-[3px] ${isRecording ? "" : "opacity-30"}`}>
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
              onClick={() => {
                if (audioCtxRef.current?.state === "suspended") {
                  void audioCtxRef.current.resume();
                }
                if (isRecording) stopRecording();
                else startRecording();
              }}
              className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] ${
                isRecording ? "bg-gray-900" : "bg-red-500 hover:bg-red-600"
              }`}
            >
              <i className={`fa-solid ${isRecording ? "fa-stop" : "fa-microphone"}`} />
            </button>
            <p className="mt-3 text-[12px] text-gray-400">
              {isRecording ? "탭하여 녹음 중지" : "탭하여 녹음 시작"}
            </p>
          </div>

          {recordedBlob && (
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
                      const userId = session?.id ?? studentId;
                      const mediaUrl = await uploadPracticeBlob(userId, recordedBlob, elapsedSec);
                      const today = new Date();
                      await savePracticeRecord({
                        studentId,
                        title: `${today.getMonth() + 1}월 ${today.getDate()}일 연습`,
                        durationSec: elapsedSec,
                        mediaUrl,
                      });
                      markAttendanceToday();
                      closeModal();
                    } catch {
                      alert("저장에 실패했어요. 다시 시도해 주세요.");
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
    </>
  );
}
