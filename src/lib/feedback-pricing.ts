export const FEEDBACK_INCLUDED_MINUTES = 5;
export const FEEDBACK_EXTRA_BLOCK_MINUTES = 5;
/** 영상·음원 업로드 최대 길이 (피드백 / 연습 / 패키지 / 답변 공통) */
export const MEDIA_MAX_DURATION_MINUTES = 5;
export const MEDIA_MAX_DURATION_SEC = MEDIA_MAX_DURATION_MINUTES * 60;

export function isMediaDurationOverLimit(durationSec: number) {
  return Number.isFinite(durationSec) && durationSec > MEDIA_MAX_DURATION_SEC;
}

export function mediaDurationLimitMessage() {
  return `영상·음원은 최대 ${MEDIA_MAX_DURATION_MINUTES}분까지 올릴 수 있어요.`;
}

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

export function isAudioFile(file: File) {
  if (file.type.startsWith("audio")) return true;
  return /\.(mp3|m4a|aac|wav|ogg|webm)$/i.test(file.name);
}

/** 피드백·연습 업로드 허용: 영상 또는 음원 */
export function isMediaFile(file: File) {
  return isVideoFile(file) || isAudioFile(file);
}

export function isVideoUrl(url: string) {
  if (url.startsWith("data:video")) return true;
  return /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url);
}

export function isAudioUrl(url: string) {
  if (url.startsWith("data:audio")) return true;
  return /\.(mp3|m4a|aac|wav|ogg)(\?|#|$)/i.test(url);
}

export function isMediaUrl(url: string) {
  return isVideoUrl(url) || isAudioUrl(url);
}

export function isFeedbackVideo(input: { mediaType?: string; mediaUrl?: string }) {
  return input.mediaType === "video" || !!(input.mediaUrl && isVideoUrl(input.mediaUrl));
}

export function formatFeedbackMediaLabel(label: string | undefined, isVideo: boolean) {
  if (!label || /__[0-9A-F-]{8,}/i.test(label) || /\.(mp4|mov|m4v|webm)$/i.test(label)) {
    return isVideo ? "내 연습 영상" : "내 녹음";
  }
  return label;
}

function readMediaDuration(el: HTMLMediaElement) {
  const duration = el.duration;
  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function mountMediaElement(isVideo: boolean) {
  const el = document.createElement(isVideo ? "video" : "audio");
  el.preload = "metadata";
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
  return waitForMediaDuration(el, url, isVideo ? 5_000 : 6_000);
}
