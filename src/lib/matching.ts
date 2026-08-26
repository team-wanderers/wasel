/**
 * Smart Matching Engine — محرك المطابقة الذكي
 * =============================================
 * يُقارن بلاغات المفقودات بالموجودات ويُنشئ اقتراحات تطابق.
 *
 * درجات المطابقة:
 *   - score >= 0.60 → "suggested" match مع تنبيه للطرفين
 *   - score 0.35–0.59 → تُحفظ كـ"suggested" بدون تنبيه
 *   - score < 0.35 → مُهمَل
 *
 * الأوزان:
 *   - تطابق التصنيف:    0.40
 *   - تداخل الكلمات:   0.35
 *   - القرب الجغرافي:   0.25
 */

import { db } from "@/db";
import { lostItems, foundItems, matches, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notify } from "./notify";
import { normalizeArabic } from "./normalize";

// ── Constants ──────────────────────────────────────────────────────────────

const TITLE_WEIGHT     = 0.40;
const DESC_WEIGHT      = 0.15;
const CATEGORY_WEIGHT  = 0.25;
const GEO_WEIGHT       = 0.20;

const MAX_RADIUS_KM    = 50;     // نصف القطر الأقصى للتأثير الجغرافي
const MATCH_THRESHOLD  = 0.60;  // عتبة إنشاء Match حقيقي + تنبيه
const POTENTIAL_FLOOR  = 0.35;  // أدنى درجة للتسجيل بدون تنبيه

// ── Text Tokenization ──────────────────────────────────────────────────────

/**
 * يُحوِّل النص العربي/الإنجليزي إلى مجموعة tokens موحدة ومطبَّعة.
 */
function tokenize(text: string): Set<string> {
  const normalized = normalizeArabic(text);
  return new Set(
    normalized
      .replace(/[^\u0600-\u06FFa-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

/** مشابهة Jaccard بين سلسلتين نصيتين */
function tokenOverlap(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) intersectionCount++;
  }

  const unionSize = new Set([...setA, ...setB]).size;
  return unionSize === 0 ? 0 : intersectionCount / unionSize;
}

// ── Haversine Distance ─────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Score Computation ──────────────────────────────────────────────────────

type LostRow  = { id: string; title: string; description: string; category: string; lat: number | null; lng: number | null; userId: string };
type FoundRow = { id: string; title: string; description: string; category: string; lat: number | null; lng: number | null; userId: string };

export function computeScore(lost: LostRow, found: FoundRow): number {
  // 1. تطابق التصنيف
  const catScore = lost.category === found.category ? 1.0 : 0.0;

  // 2. تداخل الكلمات في العنوان (Title Similarity)
  const titleScore = tokenOverlap(lost.title, found.title);

  // 3. تداخل الكلمات في الوصف (Description Similarity)
  const descScore = tokenOverlap(lost.description || "", found.description || "");

  // 4. القرب الجغرافي
  let geoScore = 0;
  if (
    lost.lat != null && lost.lng != null &&
    found.lat != null && found.lng != null
  ) {
    const distKm = haversineKm(lost.lat, lost.lng, found.lat, found.lng);
    geoScore = Math.max(0, 1 - distKm / MAX_RADIUS_KM);
  } else if (catScore === 1.0 && (titleScore > 0 || descScore > 0)) {
    // درجة جغرافية محايدة في حال عدم وجود إحداثيات ولكن مع تطابق التصنيف والنص
    geoScore = 0.5;
  }

  let rawScore =
    titleScore * TITLE_WEIGHT +
    descScore  * DESC_WEIGHT  +
    catScore   * CATEGORY_WEIGHT +
    geoScore   * GEO_WEIGHT;

  // تخفيض الوزن واشتراط وجود تشابه نصي لمنع رفع النسبة فوق 35% بمجرد اشتراك المدينة والتصنيف
  if (titleScore === 0) {
    if (descScore === 0) {
      // انعدام التشابه في العنوان والوصف تماماً
      rawScore = Math.min(rawScore, 0.30);
    } else if (descScore < 0.20) {
      // تشابه وصفي ضعيف جداً مع انعدام تشابه العنوان
      rawScore = Math.min(rawScore, 0.35);
    } else {
      // وجود تشابه وصفي مع انعدام تشابه العنوان
      rawScore = Math.min(rawScore, 0.45);
    }
  }

  return Math.round(rawScore * 1000) / 1000; // 3 decimals
}

// ── Engine Runner ──────────────────────────────────────────────────────────

export interface MatchingResult {
  inserted: number;
  updated:  number;
  skipped:  number;
  durationMs: number;
}

export async function runMatchingEngine(): Promise<MatchingResult> {
  const start = Date.now();
  let inserted = 0;
  let updated  = 0;
  let skipped  = 0;

  // 1. جلب البلاغات المفتوحة
  const openLost = await db
    .select({
      id: lostItems.id, title: lostItems.title,
      description: lostItems.description, category: lostItems.category,
      lat: lostItems.lat, lng: lostItems.lng, userId: lostItems.userId,
    })
    .from(lostItems)
    .where(eq(lostItems.status, "open"));

  const openFound = await db
    .select({
      id: foundItems.id, title: foundItems.title,
      description: foundItems.description, category: foundItems.category,
      lat: foundItems.lat, lng: foundItems.lng, userId: foundItems.userId,
    })
    .from(foundItems)
    .where(eq(foundItems.status, "open"));

  if (openLost.length === 0 || openFound.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0, durationMs: Date.now() - start };
  }

  console.log(`[Matching] ${openLost.length} lost × ${openFound.length} found = ${openLost.length * openFound.length} pairs`);

  // 2. حساب النقاط لكل زوج
  for (const lost of openLost) {
    for (const found of openFound) {
      // لا تُطابق بلاغات المستخدم نفسه مع نفسه
      if (lost.userId === found.userId) { skipped++; continue; }

      const score = computeScore(lost, found);

      if (score < POTENTIAL_FLOOR) { skipped++; continue; }

      // 3. INSERT / UPDATE في matches
      const existing = await db.query.matches.findFirst({
        where: (m, { and, eq: deq }) =>
          and(deq(m.lostItemId, lost.id), deq(m.foundItemId, found.id)),
      });

      if (!existing) {
        await db.insert(matches).values({
          lostItemId: lost.id,
          foundItemId: found.id,
          score,
          status: "suggested",
        });
        inserted++;

        // تنبيه فقط للمطابقات فوق العتبة
        if (score >= MATCH_THRESHOLD) {
          await Promise.all([
            notify({
              userId: lost.userId,
              type: "match.created",
              title: "وجدنا تطابقاً لبلاغك المفقود!",
              body: `تم العثور على تطابق لـ "${lost.title}" بنسبة ${Math.round(score * 100)}%`,
              link: "/dashboard/matches",
            }),
            notify({
              userId: found.userId,
              type: "match.created",
              title: "هناك مطابقة لغرضٍ وجدته!",
              body: `توجد مطابقة للغرض "${found.title}" مع بلاغ مفقود بنسبة ${Math.round(score * 100)}%`,
              link: "/dashboard/matches",
            }),
          ]);
        }
      } else if (Math.abs(existing.score - score) > 0.01) {
        await db
          .update(matches)
          .set({ score })
          .where(eq(matches.id, existing.id));
        updated++;
      } else {
        skipped++;
      }
    }
  }

  const durationMs = Date.now() - start;

  // 4. سجِّل في audit_logs
  await db.insert(auditLogs).values({
    action: "matching_run",
    entityType: "system",
    meta: { inserted, updated, skipped, durationMs, pairs: openLost.length * openFound.length },
  });

  console.log(`[Matching] Done — inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}, time: ${durationMs}ms`);

  return { inserted, updated, skipped, durationMs };
}
