"use client";

import Link from "next/link";
import type { Academy } from "@/lib/db/academies";

export function AcademyMapView({ academy }: { academy: Academy }) {
  const delta = 0.008;
  const bbox = `${academy.lng - delta},${academy.lat - delta},${academy.lng + delta},${academy.lat + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${academy.lat}%2C${academy.lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${academy.lat},${academy.lng}`;

  return (
    <div className="relative flex min-h-dvh flex-col bg-gray-100">
      <header className="absolute top-0 z-20 flex w-full items-center gap-3 bg-white/90 px-4 py-4 backdrop-blur-md">
        <Link
          href={`/academies/${academy.id}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <i className="fa-solid fa-chevron-left" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-bold text-gray-900">{academy.name}</h1>
          <p className="truncate text-[12px] text-gray-500">{academy.distanceLabel}</p>
        </div>
      </header>

      <iframe
        title={`${academy.name} 지도`}
        src={embedUrl}
        className="h-[55vh] w-full border-0"
        loading="lazy"
      />

      <div className="flex flex-1 flex-col gap-4 p-5 pb-28">
        <div className="shadow-soft rounded-[20px] border border-gray-100 bg-white p-5">
          <h2 className="mb-2 text-[15px] font-bold text-gray-900">주소</h2>
          <p className="text-[14px] leading-relaxed text-gray-600">{academy.address}</p>
          <p className="mt-2 text-[13px] text-brand-500">{academy.distanceLabel}</p>
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 items-center justify-center gap-2 rounded-[16px] bg-gray-900 text-[16px] font-bold text-white"
        >
          <i className="fa-solid fa-diamond-turn-right" />
          길찾기
        </a>
      </div>
    </div>
  );
}
