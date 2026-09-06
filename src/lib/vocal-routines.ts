/** 초보자가 따라 하기 쉬운 보컬 기본 루틴 */

export type RoutineStep = {
  id: string;
  title: string;
  durationSec: number;
  how: string;
  tip: string;
};

export type VocalRoutine = {
  id: string;
  challengeId: string;
  title: string;
  subtitle: string;
  totalMin: string;
  level: "초보" | "입문";
  keywords: string[];
  steps: RoutineStep[];
};

export const VOCAL_ROUTINES: VocalRoutine[] = [
  {
    id: "daily-warmup",
    challengeId: "daily-warmup",
    title: "매일 워밍업 5분",
    subtitle: "노래 전 몸을 깨우는 기본 스트레칭·허밍",
    totalMin: "5분",
    level: "초보",
    keywords: ["워밍업", "허밍", "warmup"],
    steps: [
      {
        id: "neck",
        title: "목·어깨 풀기",
        durationSec: 60,
        how: "천천히 고개를 좌우로 돌리고, 어깨를 앞뒤로 5회씩 돌려요.",
        tip: "힘을 빼고 호흡은 코로 편안하게",
      },
      {
        id: "hum",
        title: "허밍(Mmm)",
        durationSec: 90,
        how: "입을 다물고 '음~' 소리로 낮은음→높은음→낮은음 슬라이드.",
        tip: "코·이마에 진동이 느껴지면 잘하고 있는 거예요",
      },
      {
        id: "lip",
        title: "립 트릴",
        durationSec: 90,
        how: "입술을 부르르 떨며 음을 위아래로 부드럽게 움직여요.",
        tip: "안 되면 손가락으로 볼을 살짝 받쳐보세요",
      },
      {
        id: "siren",
        title: "사이렌(Ng~)",
        durationSec: 60,
        how: "'응~' 소리로 최저음에서 최고음까지 부드럽게 올렸다 내려요.",
        tip: "목구멍을 조이지 말고 미끄러지듯",
      },
    ],
  },
  {
    id: "scale-basics",
    challengeId: "scale-basics",
    title: "스케일 기초 연습",
    subtitle: "도레미로 음정·음역을 익히는 입문 스케일",
    totalMin: "7분",
    level: "초보",
    keywords: ["스케일", "도레미", "scale"],
    steps: [
      {
        id: "five",
        title: "5음 스케일 (도레미파솔)",
        durationSec: 120,
        how: "편한 음에서 도→레→미→파→솔→파→미→레→도. 2~3키 옮겨 반복.",
        tip: "각 음을 또박또박, 서두르지 말기",
      },
      {
        id: "arpeggio",
        title: "아르페지오 (도미솔도)",
        durationSec: 120,
        how: "도-미-솔-높은도-솔-미-도. '아' 모음으로 부드럽게.",
        tip: "높은도는 작게라도 OK, 무리하지 않기",
      },
      {
        id: "staccato",
        title: "짧게 끊기 스케일",
        durationSec: 90,
        how: "같은 5음을 짧은 '다다다다다'로. 복부에 살짝 탄력을.",
        tip: "목으로 끊지 말고 숨으로 끊기",
      },
      {
        id: "cool",
        title: "쿨다운 허밍",
        durationSec: 90,
        how: "다시 허밍으로 음을 내려 목을 식혀요.",
        tip: "연습 후 물 한 모금!",
      },
    ],
  },
  {
    id: "breath-basics",
    challengeId: "breath-basics",
    title: "호흡법 기초",
    subtitle: "복식호흡으로 안정된 소리의 밑바탕 만들기",
    totalMin: "6분",
    level: "초보",
    keywords: ["호흡", "복식", "breath"],
    steps: [
      {
        id: "belly",
        title: "복식 느끼기",
        durationSec: 90,
        how: "한 손을 배에. 코로 들이쉴 때 배가 나오고, 내쉴 때 들어가요.",
        tip: "어깨가 올라가면 흉식이에요 — 다시 배에 집중",
      },
      {
        id: "box",
        title: "박스 호흡 4-4-4-4",
        durationSec: 120,
        how: "4초 들이쉬기 → 4초 참기 → 4초 내쉬기 → 4초 쉬기. 3라운드.",
        tip: "무리해서 참지 말고 편한 템포로",
      },
      {
        id: "sss",
        title: "S 연장 호흡",
        durationSec: 90,
        how: "깊게 들이쉰 뒤 '스으으으'로 가능한 한 길고 고르게 내쉬기.",
        tip: "소리가 흔들리면 숨이 부족한 신호",
      },
      {
        id: "phrase",
        title: "짧은 프레이즈에 적용",
        durationSec: 60,
        how: "숨 들이쉬고 '아~'를 한 호흡에 5초 유지. 3회.",
        tip: "끝으로 갈수록 작아져도 괜찮아요",
      },
    ],
  },
  {
    id: "beginner-daily",
    challengeId: "beginner-daily",
    title: "초보 데일리 10분",
    subtitle: "워밍업 → 호흡 → 스케일을 한 번에 도는 종합 루틴",
    totalMin: "10분",
    level: "초보",
    keywords: ["데일리", "발성", "루틴", "daily"],
    steps: [
      {
        id: "w1",
        title: "워밍업 허밍",
        durationSec: 90,
        how: "허밍으로 저→고→저 슬라이드 3회.",
        tip: "목소리 깨우기 단계예요",
      },
      {
        id: "w2",
        title: "호흡 한 세트",
        durationSec: 120,
        how: "복식 3회 + S 연장 2회.",
        tip: "배의 움직임만 느껴도 성공",
      },
      {
        id: "w3",
        title: "5음 스케일",
        durationSec: 180,
        how: "도레미파솔 왕복, 키를 바꿔가며 4회.",
        tip: "오늘 컨디션에 맞는 음역만",
      },
      {
        id: "w4",
        title: "좋아하는 한 소절",
        durationSec: 150,
        how: "쉬운 노래 한 소절을 천천히 2번 불러요.",
        tip: "완벽보다 '오늘 했음'이 중요해요",
      },
      {
        id: "w5",
        title: "쿨다운",
        durationSec: 60,
        how: "낮은 허밍으로 마무리.",
        tip: "연습일지에 '데일리'라고 남겨보세요",
      },
    ],
  },
];

export function getRoutineByChallengeId(challengeId: string) {
  return VOCAL_ROUTINES.find((r) => r.challengeId === challengeId);
}

export function formatStepTime(sec: number) {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}분 ${s}초` : `${m}분`;
}
