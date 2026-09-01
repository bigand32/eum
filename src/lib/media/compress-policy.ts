export const COMPRESS_THRESHOLD_BYTES = 5 * 1024 * 1024;

export function shouldProcessMedia(input: {
  size: number;
  mediaType: "audio" | "video";
}): boolean {
  return input.mediaType === "video" || input.size >= COMPRESS_THRESHOLD_BYTES;
}
