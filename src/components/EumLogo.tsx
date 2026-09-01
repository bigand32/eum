import Link from "next/link";

type EumLogoProps = {
  variant?: "dark" | "light";
  size?: "md" | "sm";
  suffix?: string;
  href?: string;
  className?: string;
};

const sizeClass = {
  md: "text-[24px]",
  sm: "text-[20px]",
} as const;

export function EumLogo({
  variant = "dark",
  size = "md",
  suffix,
  href,
  className = "",
}: EumLogoProps) {
  const textClass =
    variant === "light" ? "text-white" : "text-gray-900";
  const dotClass =
    variant === "light" ? "text-brand-200" : "text-brand-500";
  const suffixClass =
    variant === "light"
      ? "bg-white/20 text-white"
      : "bg-gray-900 text-white";

  const content = (
    <div
      className={`inline-flex items-center gap-1.5 font-extrabold tracking-tighter ${sizeClass[size]} ${textClass} ${className}`}
    >
      <span>
        eum<span className={dotClass}>.</span>
      </span>
      {suffix && (
        <span
          className={`rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wide ${suffixClass}`}
        >
          {suffix}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
