/** 발성·호흡 따라 하기 루틴 */

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
    id: "five-scale",
    challengeId: "five-scale",
    title: "5스케일 연습",
    subtitle: "상행·하행으로 음감과 정확도를 키워요",
    totalMin: "8분",
    level: "입문",
    keywords: ["5스케일", "스케일", "발성"],
    steps: [
      {
        id: "prep",
        title: "준비 · 발음 고르기",
        durationSec: 60,
        how: "립트릴, 허밍, 모음(아에이오우) 중 오늘 쓸 발음을 정해요. 시작음~끝음은 내 음역에 맞게 조절해요.",
        tip: "억지로 고음까지 가지 말고 편한 구간부터",
      },
      {
        id: "asc",
        title: "5스케일 상행",
        durationSec: 150,
        how: "남자: 1옥 도→3옥 도 / 여자: 1옥 미→3옥 파. 5음 스케일로 천천히 올라가요.",
        tip: "한 번 반복할 때마다 발음을 바꿔보세요",
      },
      {
        id: "desc",
        title: "5스케일 하행",
        durationSec: 150,
        how: "같은 음역을 위에서 아래로 내려와요. 음정을 또박또박 맞추며 반복.",
        tip: "내려올 때 소리가 풀리지 않게 유지",
      },
      {
        id: "vowel",
        title: "모음으로 한 바퀴",
        durationSec: 120,
        how: "아→에→이→오→우 순으로 같은 스케일을 한 번씩 더 해요.",
        tip: "모음 위주 연습이 발성에 특히 좋아요",
      },
    ],
  },
  {
    id: "nine-scale",
    challengeId: "nine-scale",
    title: "9스케일 연습",
    subtitle: "메이저 스케일로 성구전환을 부드럽게",
    totalMin: "8분",
    level: "입문",
    keywords: ["9스케일", "스케일", "성구전환"],
    steps: [
      {
        id: "warm",
        title: "가볍게 워밍업",
        durationSec: 90,
        how: "립트릴이나 허밍으로 저음부터 고음까지 한두 번 훑어요.",
        tip: "목풀기 용도로 가볍게",
      },
      {
        id: "asc",
        title: "9스케일 상행",
        durationSec: 150,
        how: "남자: 1옥 도→3옥 도 / 여자: 1옥 미→3옥 파. 메이저 스케일로 부드럽게 올라가요.",
        tip: "성구가 바뀌는 구간에서 힘을 빼세요",
      },
      {
        id: "desc",
        title: "9스케일 하행",
        durationSec: 150,
        how: "같은 구간을 하행으로. 연결이 끊기지 않게 이어서 내려와요.",
        tip: "저음~고음이 한 줄로 이어지게",
      },
      {
        id: "vowel",
        title: "모음 본연습",
        durationSec: 90,
        how: "아에이오우 중 하나로 상행·하행을 한 세트 더 해요.",
        tip: "연습일지에 '9스케일'이라고 남겨요",
      },
    ],
  },
  {
    id: "passaggio-15",
    challengeId: "passaggio-15",
    title: "1.5스케일 · 성구전환",
    subtitle: "도약과 연결로 자연스러운 성구전환",
    totalMin: "9분",
    level: "입문",
    keywords: ["1.5스케일", "성구전환", "발성"],
    steps: [
      {
        id: "round1",
        title: "1차 · 립트릴/허밍",
        durationSec: 150,
        how: "1옥 도에서 3옥 파까지 올라갔다 내려와요. 립트릴이나 허밍으로 가볍게.",
        tip: "고음은 억지로 내지 말고 넘겨주듯",
      },
      {
        id: "round2",
        title: "2차 · 모음 발성",
        durationSec: 180,
        how: "같은 스케일을 모음(아에이오우)으로 한 번 더. 메이저 음정을 위아래로 도약하듯 움직여요.",
        tip: "성구전환이 안 되면 연결 연습, 되면 더 자연스럽게",
      },
      {
        id: "focus",
        title: "전환 구간 집중",
        durationSec: 120,
        how: "성구가 바뀌는 음 근처만 반복. 소리 크기보다 연결에 집중.",
        tip: "지르지 말고 부드럽게",
      },
      {
        id: "cool",
        title: "쿨다운",
        durationSec: 90,
        how: "허밍으로 음을 내려 목을 식혀요.",
        tip: "제목에 '성구전환' 또는 '1.5스케일' 기록",
      },
    ],
  },
  {
    id: "octave-repeat",
    challengeId: "octave-repeat",
    title: "옥타브 리핏",
    subtitle: "파사지오 구간 연결 · 소리 강화",
    totalMin: "7분",
    level: "입문",
    keywords: ["옥타브", "리핏", "파사지오", "발성"],
    steps: [
      {
        id: "prep",
        title: "발음 준비",
        durationSec: 60,
        how: "멈, 국, 네이처럼 한 음씩 끊어 낼 수 있는 발음을 고르세요.",
        tip: "짧게 또박또박 내는 연습이에요",
      },
      {
        id: "up",
        title: "옥타브 올라가기",
        durationSec: 150,
        how: "1옥 도에서 3옥 레까지. 올라갈 때 발성이 흔들리지 않게.",
        tip: "리핏되는 첫 고음에 특히 집중",
      },
      {
        id: "repeat",
        title: "리핏 · 고음 유지",
        durationSec: 120,
        how: "고음에서 반복(리핏)되는 음을 안정적으로 낸 뒤 내려와요.",
        tip: "스케일이 끝날 때까지 소리를 풀지 마세요",
      },
      {
        id: "down",
        title: "하행 음정 체크",
        durationSec: 90,
        how: "내려올 때 음정을 놓치지 않게 천천히. 2~3세트.",
        tip: "연습일지에 '옥타브' 또는 '리핏' 기록",
      },
    ],
  },
  {
    id: "arpeggio-1538",
    challengeId: "arpeggio-1538",
    title: "아르페지오 목풀기",
    subtitle: "1-5-3-8-5-3-1로 부드럽게 워밍업",
    totalMin: "7분",
    level: "초보",
    keywords: ["아르페지오", "1538531", "목풀기", "발성"],
    steps: [
      {
        id: "lip",
        title: "입술 트릴",
        durationSec: 90,
        how: "1-5-3-8-5-3-1 스케일을 입술 트릴로. 부드럽게 연결하되 음정은 정확하게.",
        tip: "지르지 말고 가볍게",
      },
      {
        id: "tongue",
        title: "혀 트릴",
        durationSec: 90,
        how: "같은 패턴을 혀 트릴로. 성대·입·혀를 깨워요.",
        tip: "안 되면 입술 트릴로 대체 OK",
      },
      {
        id: "hum",
        title: "허밍",
        durationSec: 90,
        how: "허밍으로 같은 아르페지오. 진동이 얼굴 앞으로 모이게.",
        tip: "음정이 흔들리면 템포를 늦추세요",
      },
      {
        id: "vowel",
        title: "순수 모음",
        durationSec: 120,
        how: "아·에·이·오·우 중 하나로 1-5-3-8-5-3-1을 2~3회.",
        tip: "제목에 '아르페지오' 또는 '목풀기' 기록",
      },
    ],
  },
  {
    id: "breath-extend",
    challengeId: "breath-extend",
    title: "호흡 늘리기",
    subtitle: "흉복식호흡으로 20초→30초→40초",
    totalMin: "8분",
    level: "초보",
    keywords: ["호흡", "흉복식", "호흡늘리기", "복식"],
    steps: [
      {
        id: "stand",
        title: "자세 잡기",
        durationSec: 45,
        how: "편하게 선 상태로 준비. 어깨는 내리고 시선은 앞.",
        tip: "흉복식호흡을 목표로 해요",
      },
      {
        id: "in20",
        title: "20초 들이쉬기",
        durationSec: 90,
        how: "20초간 호흡 100%를 채우며 마십니다. 흉곽이 확장되고 윗배가 나오게. 가득 차면 3초 버팁니다.",
        tip: "이를 닫고 혀를 이 뒤에 붙이면 천천히 마실 수 있어요",
      },
      {
        id: "out20",
        title: "20초 내쉬기",
        durationSec: 90,
        how: "20초간 마신 숨을 모두 뱉어요. 흉곽 확장을 유지하며 뱉으면 배가 들어갑니다.",
        tip: "한 번에 다 비우지 말고 조절하며",
      },
      {
        id: "stepup",
        title: "30초 · 40초로 늘리기",
        durationSec: 150,
        how: "같은 방법으로 30초, 가능해지면 40초까지. 들이쉬기→3초 유지→내쉬기 세트로.",
        tip: "제목에 '호흡' 또는 '호흡늘리기' 기록",
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
