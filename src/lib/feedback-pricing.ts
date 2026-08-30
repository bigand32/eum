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

export function isVideoFile(file: File) {
  if (file.type.startsWith("video") || file.type === "video/quicktime") return true;
  return /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name);
}

function readMediaDuration(el: HTMLMediaElement) {
  const duration = el.duration;
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function mountMediaElement(isVideo: boolean) {
  const el = document.createElement(isVideo ? "video" : "audio");
  el.preload = "auto";
  el.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  if (isVideo) {
    const video = el as HTMLVideoElement;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
  }
  document.body.appendChild(el);
  return el;
}

function unmountMediaElement(el: HTMLMediaElement, url: string) {
  el.pause();
  el.removeAttribute("src");
  el.load();
  el.remove();
  URL.revokeObjectURL(url);
}

function waitForMediaDuration(el: HTMLMediaElement, url: string, timeoutMs: number) {
  return new Promise<number>((resolve, reject) => {
    let settled = false;

    const finish = (duration: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      unmountMediaElement(el, url);
      if (duration && duration > 0) resolve(duration);
      else reject(new Error("duration"));
    };

    const tryFinish = () => {
      const duration = readMediaDuration(el);
      if (duration) finish(duration);
    };

    const timeoutId = window.setTimeout(() => finish(null), timeoutMs);

    el.addEventListener("loadedmetadata", () => {
      tryFinish();
      if (el.duration === Infinity || Number.isNaN(el.duration)) {
        try {
          el.currentTime = 1e10;
        } catch {
          finish(null);
        }
      }
    });
    el.addEventListener("durationchange", tryFinish);
    el.addEventListener("canplay", tryFinish);
    el.addEventListener("seeked", tryFinish);
    el.addEventListener("error", () => finish(null));

    el.src = url;
    el.load();
  });
}

export async function getMediaDuration(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  const isVideo = isVideoFile(file);
  const el = mountMediaElement(isVideo);
  return waitForMediaDuration(el, url, isVideo ? 15_000 : 10_000);
}
