import Link from "next/link";

export function PageHeader({
  title,
  backHref,
  subtitle,
}: {
  title: string;
  backHref?: string;
  subtitle?: string;
}) {
  return (
    <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur-md">
      {backHref ? (
        <Link href={backHref} className="w-8 text-xl text-gray-800">
          <i className="fa-solid fa-chevron-left" />
        </Link>
      ) : (
        <div className="w-8" />
      )}
      <div className="flex-1 text-center">
        <div className="text-[15px] font-bold text-gray-900">{title}</div>
        {subtitle && <div className="text-[11px] text-gray-500">{subtitle}</div>}
      </div>
      <div className="w-8" />
    </header>
  );
}
