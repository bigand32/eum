export const COMPRESS_THRESHOLD_BYTES = 5 * 1024 * 1024;

export function shouldProcessMedia(input: {
  size: number;
  mediaType: "audio" | "video";
}): boolean {
  // 영상만 백그라운드 압축 (음원은 업로드 후 바로 사용)
  return input.mediaType === "video" && input.size >= COMPRESS_THRESHOLD_BYTES;
}
