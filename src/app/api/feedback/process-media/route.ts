import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";
import { transcodeMediaFile } from "@/lib/media/transcode";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const maxDuration = 120;

type ProcessMediaBody = {
  storagePath?: string;
  mediaType?: "audio" | "video";
};

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "ADMIN_NOT_CONFIGURED" }, { status: 503 });
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const supabaseAuth = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "AUTH_INVALID" }, { status: 401 });
  }

  const body = (await request.json()) as ProcessMediaBody;
  const storagePath = body.storagePath?.trim();
  const mediaType = body.mediaType;

  if (!storagePath || !mediaType) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!storagePath.startsWith(`${user.id}/raw/`)) {
    return NextResponse.json({ error: "FORBIDDEN_PATH" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: blob, error: downloadError } = await admin.storage
    .from("feedback-media")
    .download(storagePath);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "DOWNLOAD_FAILED" }, { status: 500 });
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "eum-media-"));
  const inputExt = path.extname(storagePath) || ".bin";
  const inputPath = path.join(tmpDir, `input${inputExt}`);
  const outputExt = mediaType === "video" ? ".mp4" : ".m4a";
  const outputPath = path.join(tmpDir, `output${outputExt}`);
  const uploadId = path.basename(storagePath).replace(/\.[^.]+$/, "");
  const processedPath = `${user.id}/processed/${uploadId}${outputExt}`;

  try {
    await fs.writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));
    await transcodeMediaFile(inputPath, outputPath, mediaType);

    const outputBuffer = await fs.readFile(outputPath);
    const contentType = mediaType === "video" ? "video/mp4" : "audio/mp4";

    const { error: uploadError } = await admin.storage
      .from("feedback-media")
      .upload(processedPath, outputBuffer, {
        contentType,
        upsert: true,
      });
    if (uploadError) {
      throw uploadError;
    }

    await admin.storage.from("feedback-media").remove([storagePath]);

    const { data: publicData } = admin.storage.from("feedback-media").getPublicUrl(processedPath);
    return NextResponse.json({
      publicUrl: publicData.publicUrl,
      storagePath: processedPath,
      processed: true,
    });
  } catch {
    const { data: publicData } = admin.storage.from("feedback-media").getPublicUrl(storagePath);
    return NextResponse.json({
      publicUrl: publicData.publicUrl,
      storagePath,
      processed: false,
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
