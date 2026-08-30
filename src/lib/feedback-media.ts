import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadFeedbackMedia(userId: string, file: File): Promise<string> {
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

    const ext =
      file.name.split(".").pop() ??
      (file.type.includes("mp4") || file.type.includes("m4a") ? "m4a" : "webm");
    const path = `${userId}/${Date.now()}.${ext}`;
    const contentType =
      file.type ||
      (ext === "m4a" ? "audio/mp4" : ext === "webm" ? "audio/webm" : "application/octet-stream");

    const { error } = await supabase.storage.from("feedback-media").upload(path, file, {
      upsert: false,
      contentType,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("feedback-media").getPublicUrl(path);
    return data.publicUrl;
  }
  return readFileAsDataUrl(file);
}

export async function uploadPracticeBlob(userId: string, blob: Blob, durationSec: number) {
  const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("webm") ? "webm" : "m4a";
  const file = new File([blob], `practice-${durationSec}s.${ext}`, {
    type: blob.type || "audio/mp4",
  });
  return uploadFeedbackMedia(userId, file);
}
