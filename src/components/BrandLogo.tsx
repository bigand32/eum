import Image from "next/image";
import Link from "next/link";
import { BRAND_LOCKUP_LIGHT_SRC, BRAND_LOCKUP_SRC, BRAND_NAME } from "@/lib/brand";

type BrandLogoProps = {
  variant?: "dark" | "light";
  size?: "md" | "sm" | "lg";
  suffix?: string;
  href?: string;
  className?: string;
};

/** 락업 원본 비율 (768 x 221) — 라운드 심볼 + eum */
const LOCKUP_RATIO = 768 / 221;

/** 헤더용 콤팩트 락업 */
const sizeClass = {
  lg: { width: 112, badge: "text-[10px]" },
  md: { width: 72, badge: "text-[9px]" },
  sm: { width: 64, badge: "text-[9px]" },
} as const;

export function BrandLogo({
  variant = "dark",
  size = "md",
  suffix,
  href,
  className = "",
}: BrandLogoProps) {
  const { width, badge } = sizeClass[size];
  const height = Math.round(width / LOCKUP_RATIO);
  const src = variant === "light" ? BRAND_LOCKUP_LIGHT_SRC : BRAND_LOCKUP_SRC;
  const suffixClass =
    variant === "light" ? "bg-white/20 text-white" : "bg-brand-500 text-white";

  const rowH = size === "lg" ? "h-9" : "h-8";
  const imgH = size === "lg" ? "h-6" : "h-4";
  const pxHeight = size === "lg" ? 24 : 16;

  const content = (
    <div className={`inline-flex ${rowH} items-center gap-1.5 ${className}`}>
      <Image
        src={src}
        alt={BRAND_NAME}
        width={width}
        height={height}
        priority
        className={`${imgH} !w-auto max-h-full shrink-0 object-contain object-left`}
        style={{ width: "auto", height: pxHeight }}
      />
      {suffix && (
        <span
          className={`rounded-sm px-2 py-0.5 font-bold tracking-wide ${badge} ${suffixClass}`}
        >
          {suffix}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`inline-flex ${rowH} items-center`}>
        {content}
      </Link>
    );
  }

  return content;
}
