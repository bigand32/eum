# eum (음) — Next.js

보컬 코칭 플랫폼 **eum** Next.js 앱입니다.

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000)

## 아키텍처

상세 플로우 · DB 설계: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 주요 라우트

| 경로 | 설명 |
|------|------|
| `/search` | 마스터 탐색 |
| `/masters/[id]` | 프로필 · 상품 선택 |
| `/masters/[id]/feedback` | 피드백 신청·결제 |
| `/masters/[id]/reservation` | 전화/방문 예약 |
| `/feedback/[orderId]` | 피드백 수신 |
| `/master` | 마스터 대기함 |
| `/master/feedback/[orderId]` | 구간 코멘트 작성 |
| `/master/settings/pricing` | 요금 설정 |

`prototype/` — 기존 HTML 프로토타입 (참고용)
