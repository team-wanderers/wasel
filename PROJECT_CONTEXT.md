# PROJECT_CONTEXT.md — واصل (Wasel)

> ملف المرجعية المركزي للوكلاء الذكيين والمساهمين.
> اقرأ هذا الملف **أولاً** قبل أي تعديل في الكود.

---

## 1. ما هو واصل؟

**واصل** هو نظام برمجي متكامل لإدارة واسترجاع المفقودات في **مدينة عتق ومحافظة شبوة** (اليمن).
يربط النظام بين أصحاب المفقودات والمُلتقِطين عبر محرك مطابقة ذكي، مع ضمان خصوصية البيانات وتيسير التسليم الآمن.

### المشكلة التي يحلّها
- غياب قناة موثوقة لتلاقي أصحاب المفقودات مع مَن عثر عليها.
- خطر انكشاف تفاصيل المفقودات الحساسة (بيانات الهوية، مستندات، مجوهرات).
- عدم وجود آلية تحقق محايدة تثبت ملكية المفقود قبل التسليم.

---

## 2. الركائز الأساسية للنظام

| الركيزة | الوصف | الملفات الرئيسية |
|---------|-------|-----------------|
| **Smart Matching Engine** | يقارن البلاغات المفتوحة (lost vs found) بناءً على التصنيف + التشابه النصي + المسافة الجغرافية (Haversine). يُنتج نقاط تطابق `matches.score` | `src/lib/matching.ts` |
| **Blind Verification** | حقل `secret_details` لا يُرسَل للطرف الآخر قبل قبول المطابقة؛ التحقق يجري عبر أسئلة يُحددها صاحب الغرض فقط | `src/db/schema/items.ts`, `src/db/schema/matching.ts` |
| **Safe Drop-off Points** | شبكة نقاط أمانة معتمدة (`pickup_points`) لتنظيم عملية التسليم المادي بطريقة آمنة ومحايدة | `src/db/schema/matching.ts` → `pickupPoints` |

---

## 3. المكدس التقني (Tech Stack)

| الطبقة | التقنية |
|--------|---------|
| Framework | **Next.js 16** (App Router) |
| Language | TypeScript >= 5 |
| Database | **PostgreSQL** (Docker locally) |
| ORM | **Drizzle ORM** v0.45+ |
| Validation | **Zod** v4 |
| Styling | Tailwind CSS v4 |
| Runtime | Node.js >= 22 |

---

## 4. هيكل قاعدة البيانات (Schema Overview)

```
src/db/schema/
├── auth.ts        → users · sessions · otp_codes
├── items.ts       → lost_items · found_items · item_media
├── matching.ts    → matches · claims · pickup_points · recoveries
└── system.ts      → notifications · audit_logs · settings
```

### Enums المُعرَّفة
- `user_role`: `user | admin`
- `otp_purpose`: `login | verify`
- `item_status`: `open | matched | claimed | recovered | closed`
- `item_category`: `documents | electronics | keys | bags | jewelry | pets | other`
- `match_status`: `suggested | accepted | rejected | expired`
- `claim_status`: `pending | verified | rejected | cancelled`
- `recovery_status`: `scheduled | in_progress | completed | cancelled`

### حقل البيانات السرية `secret_details`
موجود في `lost_items` و `found_items`.
**يُمنع** إرساله في أي استجابة API عامة أو في قوائم البحث العامة.

---

## 5. هيكل التطبيق (App Router)

```
src/app/
├── (public)/          → صفحات عامة بلا تسجيل دخول (بحث، تفاصيل)
├── (auth)/            → صفحات تسجيل الدخول (OTP)
├── (dashboard)/       → لوحة المستخدم (lost/, found/, matches/, claims/)
└── admin/             → لوحة المدير
```

---

## 6. GitHub Issues — الحالة الراهنة

جميع الـ Issues مفتوحة — لا شيء مُنجَز بعد:

| # | العنوان | المنطقة | الأولوية |
|---|---------|---------|---------|
| 1 | db: wire drizzle migrate/push against local postgres | area:db | p0 |
| 2 | auth: request/verify otp against otp_codes | area:auth | p0 |
| 3 | auth: pg sessions + cookie + requireUser/requireAdmin | area:auth | p0 |
| 4 | ui: app shell + public/auth/dashboard/admin layouts | area:ui | p0 |
| 5 | lost: crud lost_items + secret_details + lat/lng | area:lost | p0 |
| 6 | found: crud found_items + secret_details + lat/lng | area:found | p0 |
| 7 | search: public list/detail with category/status/text filters | area:search | p1 |
| 8 | media: local upload + item_media paths | area:media | p1 |
| 9 | match: score category + token overlap + haversine | area:match | p1 |
| 10 | match: accept/reject suggestions ui | area:match | p1 |
| 11 | notify: insert rows on match/claim/recovery events | area:notify | p1 |
| 12 | claim: create + status machine | area:claim | p1 |
| 13 | claim: verify against secret_details | area:claim | p1 |
| 14 | recovery: schedule + confirm at pickup_point | area:recovery | p1 |
| 15 | admin: manage users/items/pickup_points | area:admin | p1 |

---

## 7. قواعد الترميز الحاكمة

1. **لا قاعدة بيانات خارجية** — كل شيء في PostgreSQL.
2. **لا قوائم انتظار (queues)** — المطابقة تعمل بـ npm script أو Server Action.
3. **لا رفع للسحابة** — الوسائط تُخزَّن محلياً في `uploads/` (gitignored).
4. **secret_details دائماً محجوب** في الواجهات العامة والبحث.
5. **Drizzle ORM حصراً** — لا raw SQL مباشر، لا Prisma.
6. **Zod للتحقق** من كل مُدخلات API.
7. **Server Actions أو Route Handlers** — لا client-side fetch مباشر لـ db.

---

## 8. مسار التطوير المُقترح

```
[p0] DB Setup → OTP Auth → Sessions → App Shell → Lost CRUD → Found CRUD
      ↓
[p1] Search → Media → Matching Engine → Match UI → Notifications
      ↓
[p1] Claims → Claim Verification → Recoveries → Admin Panel
```

---

## 9. الوثائق المرجعية

| الوثيقة | المسار | الغرض |
|---------|--------|-------|
| SRS | `docs/SRS.md` | متطلبات النظام |
| SAD | `docs/SAD.md` | العمارة البرمجية |
| UX/UI Spec | `docs/UX-UI-SPEC.md` | مواصفات الواجهة |
| Implementation Plan | `implementation_plan.md` | خطة التنفيذ الحالية |

---

## 10. الإعداد المحلي السريع

```bash
cp .env.example .env        # أضف DATABASE_URL
docker compose up -d        # شغّل PostgreSQL
npm install
npm run db:push             # ادفع الـ schema
npm run dev                 # شغّل Next.js على http://localhost:3000
```
