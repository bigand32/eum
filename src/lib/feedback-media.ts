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
    const ext = file.name.split(".").pop() ?? "webm";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("feedback-media").upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("feedback-media").getPublicUrl(path);
    return data.publicUrl;
  }
  return readFileAsDataUrl(file);
}

export async function uploadPracticeBlob(userId: string, blob: Blob, durationSec: number) {
  const file = new File([blob], `practice-${durationSec}s.webm`, {
    type: blob.type || "audio/webm",
  });
  return uploadFeedbackMedia(userId, file);
}
