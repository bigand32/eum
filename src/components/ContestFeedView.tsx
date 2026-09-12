"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStudentId } from "@/lib/auth/use-student-id";
import {
  formatContestMonthLabel,
  getContestYoutubeUrl,
  getMonthsContestSong,
} from "@/lib/contest/songs";
import {
  ensureDemoContestEntries,
  getMyContestEntry,
  listContestEntries,
  splitContestLeaderboard,
  toggleContestHeart,
  type ContestEntry,
} from "@/lib/contest/storage";
import { ContestEntryCard } from "@/components/ContestEntryCard";
import { ContestEntryPopup } from "@/components/ContestEntryPopup";
import { ContestRankCircles } from "@/components/ContestRankCircles";

export function ContestFeedView() {
  const router = useRouter();
  const studentId = useStudentId();
  const month = getMonthsContestSong();
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [myEntry, setMyEntry] = useState<ContestEntry | null>(null);
  const [selected, setSelected] = useState<ContestEntry | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(false);

  const refresh = useCallback(() => {
    ensureDemoContestEntries({
      monthKey: month.monthKey,
      songTitle: month.songTitle,
      artist: month.artist,
    });
    const next = listContestEntries(month.monthKey);
    setEntries(next);
    setMyEntry(studentId ? getMyContestEntry(studentId, month.monthKey) : null);
    setSelected((cur) => (cur ? next.find((e) => e.id === cur.id) ?? null : null));
  }, [studentId, month.monthKey, month.songTitle, month.artist]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function onHeart(entryId: string) {
    if (!studentId) return;
    toggleContestHeart(entryId, studentId);
    refresh();
  }

  function pickMedia(kind: "video" | "audio") {
    setChallengeOpen(false);
    router.push(`/contest/submit?type=${kind}`);
  }

  const { top3 } = splitContestLeaderboard(entries);

  return (
    <div className="min-h-dvh bg-[#F5F6F8] pb-4">
      <header className="safe-top flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h1 className="text-[22px] font-extrabold tracking-tight text-gray-900">콘테스트</h1>
        <button
          type="button"
          onClick={() => (myEntry ? router.push("/contest/submit") : setChallengeOpen(true))}
          className="shrink-0 rounded-full bg-brand-500 px-4 py-2 text-[13px] font-bold text-white transition active:opacity-90"
        >
          {myEntry ? "출품작 수정" : "도전하기"}
        </button>
      </header>

      <div className="mt-4 px-5">
        <section className="rounded-[24px] bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-brand-500">
                이달의 대회 · {formatContestMonthLabel(month.monthKey)}
              </p>
              <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-gray-900">
                {month.songTitle}
              </h2>
              <p className="mt-1 text-[14px] font-semibold text-gray-500">{month.artist}</p>
            </div>
            <a
              href={getContestYoutubeUrl(month)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FF0000] px-3.5 py-2 text-[12px] font-bold text-white transition active:opacity-90"
              aria-label="유튜브 MV 보기"
            >
              <i className="fa-brands fa-youtube text-[14px]" />
              MV
            </a>
          </div>
        </section>

        {top3.length > 0 ? (
          <section className="mt-6">
            <ContestRankCircles entries={top3} onSelect={setSelected} />
          </section>
        ) : null}

        {entries.length > 0 ? (
          <section className="mt-4">
            <div className="grid grid-cols-2 gap-2.5">
              {entries.map((entry) => (
                <ContestEntryCard
                  key={entry.id}
                  entry={entry}
                  studentId={studentId}
                  onHeart={onHeart}
                  onOpen={setSelected}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {selected ? (
        <ContestEntryPopup
          entry={selected}
          studentId={studentId}
          onHeart={onHeart}
          onClose={() => setSelected(null)}
        />
      ) : null}

      {challengeOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 px-4 pb-8 sm:items-center"
          onClick={() => setChallengeOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-[400px] rounded-[24px] bg-white p-5 shadow-soft"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="출품 방식 선택"
          >
            <div className="flex items-center justify-between">
              <p className="text-[17px] font-extrabold text-gray-900">어떻게 도전할까요?</p>
              <button
                type="button"
                onClick={() => setChallengeOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-500"
                aria-label="닫기"
              >
                <i className="fa-solid fa-xmark text-[14px]" />
              </button>
            </div>
            <p className="mt-1 text-[13px] text-gray-500">영상 또는 음원 중 하나를 골라 주세요</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => pickMedia("video")}
                className="flex flex-col items-center gap-2.5 rounded-[20px] bg-brand-50 px-3 py-6 transition active:opacity-90"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-500 shadow-soft">
                  <i className="fa-solid fa-video text-[20px]" />
                </span>
                <span className="text-[15px] font-extrabold text-gray-900">영상</span>
                <span className="text-[11px] font-medium text-gray-400">mp4 · mov</span>
              </button>
              <button
                type="button"
                onClick={() => pickMedia("audio")}
                className="flex flex-col items-center gap-2.5 rounded-[20px] bg-gray-50 px-3 py-6 transition active:opacity-90"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-500 shadow-soft">
                  <i className="fa-solid fa-music text-[20px]" />
                </span>
                <span className="text-[15px] font-extrabold text-gray-900">음원</span>
                <span className="text-[11px] font-medium text-gray-400">mp3 · m4a</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
