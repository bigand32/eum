export function SearchListThumb({
  src,
  alt,
  variant = "master",
}: {
  src: string;
  alt: string;
  variant?: "master" | "academy";
}) {
  return (
    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden border border-gray-50">
      {/* eslint-disable-next-line @next/next/no-img-element -- 검색 리스트는 다수라 lazy 네이티브가 더 가벼움 */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover ${
          variant === "master" ? "rounded-full" : "rounded-[16px]"
        }`}
        style={{ borderRadius: variant === "master" ? "9999px" : "16px" }}
      />
    </div>
  );
}
