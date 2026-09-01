import { shouldProcessMedia } from "@/lib/media/compress-policy";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
import { isVideoFile } from "@/lib/feedback-pricing";

export type FeedbackUploadResult = {
  publicUrl: string;
  storagePath: string;
  needsProcessing: boolean;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;
  if (file.type.includes("mp4") || file.type.includes("m4a")) return "m4a";
  if (file.type.includes("webm")) return "webm";
  if (file.type.includes("quicktime") || file.type.includes("mov")) return "mov";
  return "bin";
}

function getContentType(file: File, ext: string): string {
  if (file.type) return file.type;
  if (ext === "m4a") return "audio/mp4";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "mov") return "video/quicktime";
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "audio/webm";
  return "application/octet-stream";
}

function uploadWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error(`UPLOAD_FAILED_${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error("UPLOAD_NETWORK_ERROR"));
    xhr.onabort = () => reject(new Error("UPLOAD_ABORTED"));
    xhr.send(file);
  });
}

export async function uploadFeedbackMedia(
  userId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<FeedbackUploadResult> {
  const mediaType = isVideoFile(file) ? "video" : "audio";
  const needsProcessing = shouldProcessMedia({ size: file.size, mediaType });

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error("AUTH_REQUIRED");
    }
    if (session.user.id !== userId) {
      throw new Error("AUTH_USER_MISMATCH");
    }

    const ext = getFileExtension(file);
    const storagePath = `${userId}/${Date.now()}.${ext}`;
    const contentType = getContentType(file, ext);
    const encodedPath = storagePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const uploadUrl = `${getSupabaseUrl()}/storage/v1/object/feedback-media/${encodedPath}`;

    await uploadWithProgress(
      uploadUrl,
      file,
      {
        Authorization: `Bearer ${session.access_token}`,
        apikey: getSupabaseAnonKey(),
        "Content-Type": contentType,
        "x-upsert": "false",
        "cache-control": "3600",
      },
      onProgress,
    );

    const { data } = supabase.storage.from("feedback-media").getPublicUrl(storagePath);
    return {
      publicUrl: data.publicUrl,
      storagePath,
      needsProcessing,
    };
  }

  onProgress?.(50);
  const dataUrl = await readFileAsDataUrl(file);
  onProgress?.(100);
  return {
    publicUrl: dataUrl,
    storagePath: "",
    needsProcessing: false,
  };
}

export async function processFeedbackMedia(
  accessToken: string,
  storagePath: string,
  mediaType: "audio" | "video",
  orderId?: string,
): Promise<{ publicUrl: string; processed: boolean }> {
  const response = await fetch("/api/feedback/process-media", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ storagePath, mediaType, orderId }),
  });

  if (!response.ok) {
    throw new Error("PROCESS_FAILED");
  }

  return (await response.json()) as { publicUrl: string; processed: boolean };
}

/** 업로드 완료 후 백그라운드 압축 — 사용자 대기 없음 */
export function enqueueFeedbackMediaProcessing(
  accessToken: string,
  storagePath: string,
  mediaType: "audio" | "video",
  orderId: string,
) {
  void processFeedbackMedia(accessToken, storagePath, mediaType, orderId).catch(() => undefined);
}

export async function uploadPracticeBlob(
  userId: string,
  blob: Blob,
  durationSec: number,
  onProgress?: (percent: number) => void,
) {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "m4a";
  const file = new File([blob], `practice-${durationSec}s.${ext}`, {
    type: blob.type || "audio/mp4",
  });
  const result = await uploadFeedbackMedia(userId, file, onProgress);
  return result.publicUrl;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
