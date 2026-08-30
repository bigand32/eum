export const FEEDBACK_INCLUDED_MINUTES = 5;
export const FEEDBACK_EXTRA_BLOCK_MINUTES = 5;

export function calcFeedbackExtraFee(
  durationSec: number,
  extraPer5Min: number,
  includedMin = FEEDBACK_INCLUDED_MINUTES,
  blockMin = FEEDBACK_EXTRA_BLOCK_MINUTES,
): { extraMinutes: number; extraBlocks: number; extraFee: number } {
  const extraSeconds = Math.max(0, durationSec - includedMin * 60);
  const extraMinutes = Math.ceil(extraSeconds / 60);
  const extraBlocks = extraMinutes > 0 ? Math.ceil(extraMinutes / blockMin) : 0;
  return { extraMinutes, extraBlocks, extraFee: extraBlocks * extraPer5Min };
}

export function formatMediaDuration(durationSec: number) {
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.floor(durationSec % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function isVideoFile(file: File) {
  if (file.type.startsWith("video") || file.type === "video/quicktime") return true;
  return /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name);
}

function readMediaDuration(el: HTMLMediaElement) {
  const duration = el.duration;
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

export async function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const isVideo = isVideoFile(file);
    const el = document.createElement(isVideo ? "video" : "audio");
    el.preload = "auto";
    if (isVideo) {
      const video = el as HTMLVideoElement;
      video.playsInline = true;
      video.muted = true;
    }

    let settled = false;
    const timeoutId = window.setTimeout(() => finish(null), 12_000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      el.load();
    };

    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (duration && duration > 0) {
        resolve(duration);
        return;
      }
      reject(new Error("duration"));
    };

    const tryFinish = () => {
      const duration = readMediaDuration(el);
      if (duration) finish(duration);
    };

    const trySeekDuration = () => {
      if (readMediaDuration(el)) {
        tryFinish();
        return;
      }
      if (el.duration === Infinity || Number.isNaN(el.duration)) {
        const onSeeked = () => {
          el.removeEventListener("seeked", onSeeked);
          const duration = readMediaDuration(el);
          if (duration) finish(duration);
        };
        el.addEventListener("seeked", onSeeked);
        try {
          el.currentTime = Number.MAX_SAFE_INTEGER;
        } catch {
          finish(null);
        }
      }
    };

    el.addEventListener("loadedmetadata", tryFinish);
    el.addEventListener("durationchange", tryFinish);
    el.addEventListener("canplaythrough", tryFinish);
    el.addEventListener("error", () => finish(null));

    el.src = url;
    el.load();
    trySeekDuration();
  });
}
