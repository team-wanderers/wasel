# وثيقة العمارة البرمجية (SAD)
# Software Architecture Document — واصل (Wasel)

**الإصدار:** 1.0  
**التاريخ:** 2026-08-17  
**المشروع:** واصل — نظام إدارة المفقودات

---

## 1. نظرة معمارية عامة

يعتمد واصل على معمارية **Layered Monolith** مبنية فوق Next.js App Router، مع فصل واضح بين طبقات العرض، وطبقة الأعمال، وطبقة البيانات. الاختيار مبرَّر بحجم الفريق (صغير) والنطاق الجغرافي المحدد.

```
┌─────────────────────────────────────────────────────┐
│                   BROWSER / CLIENT                  │
│         React Server Components + Client Islands    │
├─────────────────────────────────────────────────────┤
│               NEXT.JS APP ROUTER                    │
│  ┌────────────┐ ┌─────────────┐ ┌────────────────┐ │
│  │  (public)  │ │ (dashboard) │ │     admin/     │ │
│  │  /search   │ │ /lost /found│ │  /users /items │ │
│  │  /items    │ │ /matches    │ │  /pickups      │ │
│  └────────────┘ └─────────────┘ └────────────────┘ │
├─────────────────────────────────────────────────────┤
│               SERVER ACTIONS / ROUTE HANDLERS       │
│         Validation (Zod) · Auth Guards              │
├─────────────────────────────────────────────────────┤
│                  BUSINESS LOGIC LIB                 │
│   src/lib/matching.ts  ·  src/lib/auth.ts           │
│   src/lib/notify.ts    ·  src/lib/env.ts            │
├─────────────────────────────────────────────────────┤
│               DRIZZLE ORM LAYER                     │
│         src/db/schema/*  ·  src/db/index.ts         │
├─────────────────────────────────────────────────────┤
│              POSTGRESQL (Docker)                    │
│  users · sessions · otp_codes                      │
│  lost_items · found_items · item_media              │
│  matches · claims · pickup_points · recoveries      │
│  notifications · audit_logs · settings              │
└─────────────────────────────────────────────────────┘
```

---

## 2. طبقة قاعدة البيانات

### 2.1 الجداول الرئيسية

```
auth.ts
├── users           (id, name, phone[unique], role, phone_verified_at)
├── sessions        (id, user_id→users, token_hash[unique], expires_at)
└── otp_codes       (id, phone, code_hash, purpose, expires_at, consumed_at)

items.ts
├── lost_items      (id, user_id→users, title, description, category,
│                   status, lat, lng, secret_details, lost_at)
├── found_items     (id, user_id→users, title, description, category,
│                   status, lat, lng, secret_details, found_at)
└── item_media      (id, lost_item_id?, found_item_id?, path, mime)

matching.ts
├── matches         (id, lost_item_id, found_item_id, score, status)
├── claims          (id, match_id?, lost_item_id, found_item_id,
│                   claimant_id→users, status, verification_notes)
├── pickup_points   (id, name, address, lat, lng, is_active)
└── recoveries      (id, claim_id[unique], pickup_point_id?,
                    status, scheduled_at, completed_at,
                    owner_confirmed_at, finder_confirmed_at)

system.ts
├── notifications   (id, user_id→users, type, title, body, read_at)
├── audit_logs      (id, actor_id→users?, action, entity_type, entity_id, meta)
└── settings        (key[pk], value, updated_at)
```

### 2.2 انتقالات الحالة

```
item_status:   open → matched → claimed → recovered
                                        → closed (manual)

match_status:  suggested → accepted
                         → rejected
                         → expired

claim_status:  pending → verified
                       → rejected
                       → cancelled

recovery_status: scheduled → in_progress → completed
                                          → cancelled
```

---

## 3. محرك المطابقة الذكي (Smart Matching Engine)

### 3.1 الخوارزمية

**الملف:** `src/lib/matching.ts`

```typescript
// المعادلة الأساسية
score = (categoryScore * 0.40)
      + (tokenOverlapScore * 0.35)
      + (geoScore * 0.25)

// categoryScore:   1.0 إذا تطابق category، وإلا 0.0
// tokenOverlapScore: Jaccard similarity على tokens العنوان والوصف
// geoScore:        1 - min(distance_km / MAX_RADIUS_KM, 1)
//                  MAX_RADIUS_KM = 50 (قابل للضبط من settings)
```

### 3.2 تدفق التنفيذ

```
1. جلب كل lost_items حيث status = 'open'
2. جلب كل found_items حيث status = 'open'
3. لكل زوج (lost, found):
   a. احسب score
   b. إذا score >= THRESHOLD (0.30):
      - INSERT INTO matches ON CONFLICT (lost_item_id, found_item_id)
        DO UPDATE SET score = EXCLUDED.score
4. سجّل في audit_logs
```

### 3.3 آلية التفعيل

- **npm script:** `npm run match:run` → يستدعي `src/scripts/run-matching.ts`
- **بدون queue** — تشغيل مباشر ضمن transaction.

---

## 4. نظام التحقق العمياء (Blind Verification)

```
1. صاحب المفقود يضع secret_details (مثال: "رقم الوثيقة: 123456")
2. عند اقتراح مطابقة، يُرسَل للمدّعي سؤال عام:
   "ما هي التفاصيل التي تعرفها عن هذا الغرض؟"
3. المدير يقارن الإجابة مع secret_details المخزَّن
4. يُغلق الـ claim بـ verified أو rejected
5. لا تُكشف secret_details قط في API responses العامة
```

**قاعدة صارمة:** كل Route Handler يجلب `lost_items` أو `found_items` يجب أن يستخدم:
```typescript
// صحيح - يستبعد secret_details
const { secretDetails: _, ...safeItem } = item;

// أو بـ Drizzle:
db.select({
  id: lostItems.id,
  title: lostItems.title,
  // ... بدون secretDetails
}).from(lostItems)
```

---

## 5. شبكة نقاط الأمانة (Safe Drop-off Points)

```
pickup_points
├── name: "مركز شرطة عتق"
├── address: "شارع الجمهورية، عتق"
├── lat / lng: الإحداثيات الدقيقة
└── is_active: true/false

recoveries
├── claim_id → claims (one-to-one)
├── pickup_point_id → pickup_points
├── scheduled_at: موعد التسليم
├── owner_confirmed_at: تأكيد الصاحب
└── finder_confirmed_at: تأكيد الملتقِط
```

---

## 6. طبقة المصادقة والتفويض

### 6.1 تدفق OTP

```
POST /api/auth/otp/request
  → validate phone (Zod)
  → generate 6-digit code
  → hash code (SHA-256 + salt)
  → INSERT otp_codes (phone, code_hash, purpose, expires_at=+10min)
  → [إرسال SMS - placeholder في المرحلة الأولى]
  → 200 OK

POST /api/auth/otp/verify
  → validate phone + code (Zod)
  → SELECT otp_codes WHERE phone=? AND consumed_at IS NULL AND expires_at > now()
  → verify hash
  → UPDATE consumed_at = now()
  → UPSERT users (phone)
  → INSERT sessions (user_id, token_hash, expires_at=+30days)
  → Set-Cookie: session=<raw_token>; HttpOnly; Secure; SameSite=Lax
  → redirect to /dashboard
```

### 6.2 Route Guards

```typescript
// src/lib/auth.ts
export async function requireUser(cookies): Promise<User>
export async function requireAdmin(cookies): Promise<User>
// كلاهما يرمي redirect('/login') عند الفشل
```

---

## 7. هيكل الملفات المقترح النهائي

```
wasel/
├── PROJECT_CONTEXT.md
├── docs/
│   ├── SRS.md
│   ├── SAD.md
│   └── UX-UI-SPEC.md
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── search/
│   │   │   └── items/[id]/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── lost/
│   │   │   ├── found/
│   │   │   ├── matches/
│   │   │   └── claims/
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── items/
│   │   │   └── pickup-points/
│   │   └── api/
│   │       ├── auth/otp/request/
│   │       ├── auth/otp/verify/
│   │       ├── media/upload/
│   │       └── match/run/
│   ├── db/
│   │   ├── index.ts
│   │   └── schema/
│   │       ├── auth.ts
│   │       ├── items.ts
│   │       ├── matching.ts
│   │       ├── system.ts
│   │       └── index.ts
│   ├── lib/
│   │   ├── auth.ts          ← OTP + sessions + guards
│   │   ├── matching.ts      ← Smart Matching Engine
│   │   ├── notify.ts        ← notify() helper
│   │   └── env.ts           ← validated env vars
│   └── components/          ← مكونات React المشتركة
├── drizzle.config.ts
├── docker-compose.yml
└── package.json
```

---

## 8. قرارات المعمارة (Architecture Decision Records)

| القرار | الخيار المُتخَّذ | السبب |
|--------|----------------|-------|
| ORM | Drizzle | Type-safe، خفيف، بدون runtime overhead |
| Auth | OTP + PG Sessions | بسيط، لا حاجة لـ JWT أو OAuth في السياق المحلي |
| Queue | لا queue | حجم البيانات صغير، تشغيل يدوي كافٍ |
| Storage | Local disk | لا تكلفة cloud، مناسب للنطاق الجغرافي المحدد |
| SMS | Placeholder | تكامل لاحق بعد استقرار النظام |
| Monorepo | لا | فريق صغير، مونوليث أسرع |
