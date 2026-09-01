import { spawn } from "child_process";
import ffmpegStatic from "ffmpeg-static";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = ffmpegStatic;
    if (!ffmpegPath) {
      reject(new Error("FFMPEG_NOT_AVAILABLE"));
      return;
    }

    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`FFMPEG_FAILED_${code}: ${stderr.slice(-400)}`));
    });
  });
}

export async function transcodeMediaFile(
  inputPath: string,
  outputPath: string,
  mediaType: "audio" | "video",
): Promise<void> {
  const args =
    mediaType === "video"
      ? [
          "-i",
          inputPath,
          "-vf",
          "scale='min(1280,iw)':-2",
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          "-crf",
          "28",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          "-y",
          outputPath,
        ]
      : [
          "-i",
          inputPath,
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          "-y",
          outputPath,
        ];

  await runFfmpeg(args);
}
