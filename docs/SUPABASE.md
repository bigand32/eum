# Supabase 연동 가이드

## 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. **Project Settings → API** 에서 URL, `anon` key 복사
3. 프로젝트 루트에 `.env.local` 생성:

```bash
cp .env.local.example .env.local
# 값 입력
```

## 2. DB 스키마 적용

Supabase Dashboard → **SQL Editor** → `supabase/migrations/001_initial_schema.sql` 내용 붙여넣기 후 실행

## 3. Storage (강사 프로필 사진)

1. **Storage** → **New bucket** → 이름: `avatars`, **Public** 체크
2. Policies → authenticated 사용자 업로드 허용

## 4. Auth 설정

**Authentication → Providers → Email** 활성화

개발 중 이메일 확인을 끄려면:
**Authentication → Providers → Email → Confirm email** OFF

## 5. 데모 마스터 시드 (선택)

SQL Editor에서 데모 강사 데이터 삽입:

```sql
insert into public.masters (id, name, title, avatar_url, hero_image_url, rating, review_count, feedback_count, response_time_label, tags, bio, rank_label, career, phone_number, pricing)
values
  ('11111111-1111-1111-1111-111111111111', '김뮤직', '김뮤직 마스터', 'https://ui-avatars.com/api/?name=김뮤&background=f3f4f6&color=111827', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600', 4.9, 312, 842, '30분', array['팝보컬','뮤지컬','입시전문'], '정확한 진단이 빠른 성장을 만듭니다.', 'eum 추천순위 1위', array['前 JYP Entertainment 보컬 트레이너'], '010-1234-5678', '{"feedbackPrice":20000,"phonePrice15Min":18000,"phonePrice30Min":30000,"visitPrice":80000,"visitDurationMin":60,"feedbackIncludedMin":5,"feedbackExtraPer5Min":2000}'::jsonb);
```

## 6. 실행

```bash
npm run dev
```

환경 변수가 설정되면:
- **Auth**: Supabase Auth (로그인/회원가입)
- **DB**: PostgreSQL (masters, orders, reservations 등)
- **Storage**: 프로필 사진 업로드

환경 변수가 없으면 기존 **localStorage 데모 모드**로 동작합니다.

## 아키텍처

| 레이어 | 파일 |
|--------|------|
| Supabase 클라이언트 | `src/lib/supabase/client.ts`, `server.ts`, `middleware.ts` |
| Auth | `src/lib/auth/supabase-auth.ts`, `accounts.ts` |
| DB API | `src/lib/db/api.ts`, `supabase-store.ts` |
| 스키마 SQL | `supabase/migrations/001_initial_schema.sql` |

## RLS

Row Level Security가 적용되어 있습니다.
- 마스터 프로필: 공개 조회, 본인만 수정
- 주문/예약: 해당 수강생·강사만 접근
- 찜: 본인만 접근
