"use client";

/** 주차별 영상 미리보기 썸네일 */
export function WeekVideoThumb({
  videoUrl,
  className = "h-12 w-[72px]",
}: {
  videoUrl?: string;
  className?: string;
}) {
  if (!videoUrl) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-gray-200/80 text-gray-400 ${className}`}
      >
        <i className="fa-solid fa-video-slash text-[11px]" />
      </div>
    );
  }

  const thumbSrc = videoUrl.includes("#") ? videoUrl : `${videoUrl}#t=0.1`;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-black ${className}`}
    >
      <video
        src={thumbSrc}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-gray-900">
          <i className="fa-solid fa-play text-[8px] translate-x-[0.5px]" />
        </span>
      </span>
    </div>
  );
}
