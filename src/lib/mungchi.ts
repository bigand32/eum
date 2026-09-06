/** 챌린지 전용 뭉치 캐릭터 에셋 */

export const MUNGCHI = {
  idle: "/challenge-icons/mungchi/idle.png",
  sing: "/challenge-icons/mungchi/sing.png",
  breath: "/challenge-icons/mungchi/breath.png",
  calm: "/challenge-icons/mungchi/calm.png",
  analyze: "/challenge-icons/mungchi/analyze.png",
  win: "/challenge-icons/mungchi/win.png",
  best: "/challenge-icons/mungchi/best.png",
  highnote: "/challenge-icons/mungchi/highnote.png",
  write: "/challenge-icons/mungchi/write.png",
  headphones: "/challenge-icons/mungchi/headphones.png",
  checklist: "/challenge-icons/mungchi/checklist.png",
  exhale: "/challenge-icons/mungchi/exhale.png",
} as const;

export type MungchiPose = keyof typeof MUNGCHI;
