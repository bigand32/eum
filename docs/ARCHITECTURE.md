# eum (음) — 아키텍처 & 플로우

## 상품 구조

| 상품 | 유형 | 결제 후 |
|------|------|---------|
| **피드백** | 비동기 (음원/영상 업로드) | 마스터가 구간 코멘트 작성 |
| **전화 상담** | 예약형 | 날짜·시간 슬롯 예약 |
| **방문 상담** | 예약형 | 날짜·시간 슬롯 예약 |

강사는 **피드백 / 전화 / 방문** 요금을 각자 설정하고 **언제든 수정** 가능합니다.  
이미 결제된 주문은 `priceAtPurchase` 스냅샷으로 금액이 고정됩니다.

---

## 화면 플로우

```
[수강생]
  탐색 /search
      ↓
  마스터 프로필 /masters/[id]
      ├─ 피드백 신청 /masters/[id]/feedback → 결제
      │       ↓
      │   피드백 대기 /feedback/[orderId]
      │       ↓ (마스터 작성 완료)
      │   구간별 피드백 확인 + 추가 옵션
      │       ├─ 추가 피드백 신청
      │       ├─ 전화 상담 예약
      │       └─ 방문 상담 예약
      │
      ├─ 전화 예약 /masters/[id]/reservation?type=phone
      └─ 방문 예약 /masters/[id]/reservation?type=visit
              ↓
          예약 내역 /reservation

[마스터]
  마스터 홈 /master
      ├─ 대기 피드백 → /master/feedback/[orderId] (여기에 코멘트)
      └─ 요금 설정 /master/settings/pricing
```

---

## Next.js 라우트

### 학생 `(student)`

| 경로 | 설명 |
|------|------|
| `/` | 홈 |
| `/search` | 마스터 탐색 |
| `/masters/[masterId]` | 마스터 프로필 · 3가지 상품 |
| `/masters/[masterId]/feedback` | 피드백 신청 · 결제 |
| `/masters/[masterId]/reservation` | 전화/방문 예약 · 결제 |
| `/feedback/[orderId]` | 피드백 확인 (구간 코멘트) |
| `/reservation` | 예약 · 주문 내역 |
| `/daily` | 연습일지 · 녹음 |
| `/mypage` | 마이 |

### 마스터 `master`

| 경로 | 설명 |
|------|------|
| `/master` | 할 일 · 대기 피드백 |
| `/master/feedback/[orderId]` | 구간별 피드백 작성 |
| `/master/settings/pricing` | 요금 설정 |

---

## DB 스키마 (TypeScript)

`src/lib/db/schema.ts` 참고.

### `masters`
- 프로필, `pricing` (feedbackPrice, phonePrice, visitPrice, …)

### `feedback_orders`
- `priceAtPurchase` — 결제 시점 스냅샷
- `status`: paid → in_review → completed
- `timestampComments[]`, `masterSummary`

### `reservations`
- `type`: phone | visit
- `priceAtPurchase`, `scheduledAt`, `preQuestion`

데모 저장소: `localStorage` (`eum_db_v1`) — `src/lib/db/store.ts`

---

## 프로덕션 DB 매핑 (참고)

| 데모 | PostgreSQL / Supabase |
|------|------------------------|
| `masters` | `masters` + `master_pricing` (또는 JSONB) |
| `feedback_orders` | `feedback_orders` |
| `reservations` | `reservations` |
| `priceAtPurchase` | 주문 생성 시 `masters.pricing` 복사 |

---

## 실행

```bash
npm run dev
```

**데모 시나리오**
1. `/search` → 김뮤직 → 피드백 신청 → 결제
2. `/master` → 구간별 피드백 작성 → 전송
3. `/feedback/[orderId]` → 구간 코멘트 확인
4. `/master/settings/pricing` → 요금 변경 (기존 주문 금액 유지)
