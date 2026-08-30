import type { PracticeRecord } from "@/lib/db/schema";
import { savePracticeRecord } from "@/lib/db/api";
import { getCurrentAuthUser } from "@/lib/auth/supabase-auth";
import { uploadPracticeBlob } from "@/lib/feedback-media";

export async function savePracticeRecording(input: {
  authUserId?: string;
  studentId?: string;
  blob: Blob;
  durationSec: number;
  title: string;
}): Promise<PracticeRecord> {
  const user = await getCurrentAuthUser();
  const authUserId = input.authUserId ?? user?.id;
  const studentId = input.studentId ?? user?.studentId;

  if (!authUserId) {
    throw new Error("AUTH_REQUIRED");
  }
  if (!studentId) {
    throw new Error("STUDENT_ID_MISSING");
  }
  if (input.blob.size <= 0) {
    throw new Error("EMPTY_RECORDING");
  }

  const mediaUrl = await uploadPracticeBlob(authUserId, input.blob, input.durationSec);

  return savePracticeRecord({
    studentId,
    title: input.title,
    durationSec: input.durationSec,
    mediaUrl,
  });
}

export function practiceSaveErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "AUTH_REQUIRED") {
      return "로그인이 필요해요. 다시 로그인해 주세요.";
    }
    if (error.message === "STUDENT_ID_MISSING") {
      return "수강생 정보를 찾을 수 없어요. 다시 로그인해 주세요.";
    }
    if (error.message === "EMPTY_RECORDING") {
      return "녹음 파일이 비어 있어요. 1초 이상 다시 녹음해 주세요.";
    }
    if (error.message.includes("Bucket not found")) {
      return "Storage 설정이 필요해요. Supabase에 feedback-media 버킷을 만들어 주세요.";
    }
    if (error.message.includes("row-level security") || error.message.includes("RLS")) {
      return "저장 권한이 없어요. 다시 로그인한 뒤 시도해 주세요.";
    }
  }
  return "저장에 실패했어요. 네트워크 확인 후 다시 시도해 주세요.";
}
