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

export async function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("duration"));
    };
    el.src = url;
  });
}
