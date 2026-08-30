"use client";

import { toggleFavorite } from "@/lib/db/api";
import { useDb } from "@/lib/db/use-db";
import { getSession } from "@/lib/auth/session";

export function FavoriteButton({
  type,
  id,
  className = "",
}: {
  type: "master" | "academy";
  id: string;
  className?: string;
}) {
  const db = useDb();
  const active =
    type === "master"
      ? db.favoriteMasterIds.includes(id)
      : db.favoriteAcademyIds.includes(id);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const userId = getSession()?.id;
    if (!userId) return;
    await toggleFavorite({ userId, type, id, active });
  };

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      className={`transition ${active ? "text-red-500" : "text-gray-300 hover:text-red-500"} ${className}`}
      aria-label={active ? "찜 해제" : "찜하기"}
    >
      <i className={`${active ? "fa-solid" : "fa-regular"} fa-heart`} />
    </button>
  );
}
