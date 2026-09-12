/** 챌린지용 미니 SVG 아이콘 — 보컬·음정 메타포로 통일 */

type IconProps = { className?: string };

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** 5스케일 — 오름차순 음표 5개 */
export function IconScaleSteps({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="5" cy="17" r="1.7" fill="currentColor" />
      <circle cx="9" cy="14" r="1.7" fill="currentColor" />
      <circle cx="13" cy="11" r="1.7" fill="currentColor" />
      <circle cx="17" cy="8" r="1.7" fill="currentColor" />
      <circle cx="20.5" cy="5.5" r="1.5" fill="currentColor" />
      <path d="M5 17c3-2.2 5.5-4 8-6s5-4.5 7.5-5.5" {...stroke} />
    </svg>
  );
}

/** 9스케일 — 긴 스케일 + 음자리표 느낌 */
export function IconWave({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 16.5c1.2-3.5 2.2-5.5 3.5-5.5S10 14 11.2 11s2.3-5.5 3.8-5.5 2.5 3.2 3.7 5.5S21 16.5 21 16.5"
        {...stroke}
      />
      <circle cx="7.5" cy="11" r="1.35" fill="currentColor" />
      <circle cx="15" cy="5.5" r="1.35" fill="currentColor" />
    </svg>
  );
}

/** 성구전환 — 저음→고음 다리 */
export function IconPassaggio({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="6" cy="16" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="18" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.2 14.8c2.2-1.6 4.2-3.6 7.4-5.4" {...stroke} />
      <path d="M14.5 7.2h4.2v4.2" {...stroke} />
    </svg>
  );
}

/** 옥타브 리핏 — 같은 음 위·아래 + 반복 */
export function IconOctave({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8 7.2V17a2.4 2.4 0 1 1-1.8-2.32"
        {...stroke}
      />
      <circle cx="6.2" cy="17" r="2" fill="currentColor" />
      <path
        d="M16 4.8V14.6a2.4 2.4 0 1 1-1.8-2.32"
        {...stroke}
      />
      <circle cx="14.2" cy="14.6" r="2" fill="currentColor" />
      <path d="M18.8 7.5c.9.8 1.4 1.9 1.4 3.1" {...stroke} />
      <path d="M18.2 6.2h2.2v2.2" {...stroke} />
    </svg>
  );
}

/** 아르페지오 — 흩어진 화음 */
export function IconArpeggio({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="5.5" cy="17.5" r="1.8" fill="currentColor" />
      <circle cx="10" cy="12.5" r="1.8" fill="currentColor" />
      <circle cx="14.5" cy="8.5" r="1.8" fill="currentColor" />
      <circle cx="19" cy="5" r="1.8" fill="currentColor" />
      <path d="M5.5 17.5 10 12.5l4.5-4 4.5-3.5" {...stroke} />
    </svg>
  );
}

/** 호흡 — 들숨·날숨 원 */
export function IconBreath({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="12" cy="12" r="6.2" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.5" opacity="0.28" />
    </svg>
  );
}

export function IconPracticeNote({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M10 17.2V7.4l9-2v9.6" {...stroke} />
      <circle cx="7.6" cy="17.2" r="2.4" fill="currentColor" />
      <circle cx="16.6" cy="14.9" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function IconTrophy({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M8 4h8v5a4 4 0 0 1-8 0V4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5A2.5 2.5 0 0 1 16 10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 13v3M9 20h6M10 16h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function challengeIcon(id: string) {
  switch (id) {
    case "five-scale":
      return IconScaleSteps;
    case "nine-scale":
      return IconWave;
    case "passaggio-15":
      return IconPassaggio;
    case "octave-repeat":
      return IconOctave;
    case "arpeggio-1538":
      return IconArpeggio;
    case "breath-extend":
      return IconBreath;
    default:
      return IconPracticeNote;
  }
}
