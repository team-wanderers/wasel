import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import {
  users,
  lostItems,
  foundItems,
  matches,
  claims,
  recoveries,
  pickupPoints,
} from "@/db/schema";
import { count, eq, desc } from "drizzle-orm";
import Link from "next/link";
import {
  IconPlay,
  IconTarget,
  IconShield,
  IconPackage,
  IconUser,
  IconMapPin,
  IconTrendingUp,
  IconLayers,
  IconActivity,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة الإدارة والإحصائيات | واصل",
  description: "المؤشرات التشغيلية الحية، إحصائيات البلاغات والمطابقات وعمليات الاسترجاع",
};

const statusLabels: Record<string, { label: string; bg: string; color: string }> = {
  open: { label: "مفتوح", bg: "hsl(215,90%,94%)", color: "hsl(215,90%,35%)" },
  matched: { label: "مطابق", bg: "hsl(38,90%,92%)", color: "hsl(38,90%,30%)" },
  claimed: { label: "مُطالب به", bg: "hsl(270,70%,94%)", color: "hsl(270,55%,45%)" },
  recovered: { label: "مسترجع", bg: "var(--color-success-light)", color: "hsl(142,60%,25%)" },
  closed: { label: "مغلق", bg: "var(--color-bg-secondary)", color: "var(--color-text-muted)" },
  pending: { label: "قيد المراجعة", bg: "hsl(38,90%,92%)", color: "hsl(38,90%,30%)" },
  verified: { label: "موثق", bg: "var(--color-success-light)", color: "hsl(142,60%,25%)" },
  rejected: { label: "مرفوض", bg: "var(--color-danger-light)", color: "hsl(0,70%,40%)" },
  scheduled: { label: "مجدول", bg: "hsl(215,90%,94%)", color: "hsl(215,90%,35%)" },
  deposited: { label: "مودع بالأمانة", bg: "hsl(270,70%,94%)", color: "hsl(270,55%,45%)" },
  completed: { label: "مكتمل", bg: "var(--color-success-light)", color: "hsl(142,60%,25%)" },
};

function formatTime(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "—";
  return new Date(dateValue).toLocaleString("ar-YE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function AdminPage() {
  await requireAdmin();

  // استعلامات PostgreSQL المجمعة للحصول على إحصائيات حية ودقيقة
  const [
    [usersTotalRes],
    [usersAdminRes],
    [usersVerifiedRes],

    [lostTotalRes],
    [lostOpenRes],
    [lostRecoveredRes],
    [lostClosedRes],

    [foundTotalRes],
    [foundOpenRes],
    [foundRecoveredRes],
    [foundClosedRes],

    [matchesTotalRes],
    [matchesSuggestedRes],
    [matchesAcceptedRes],
    [matchesRejectedRes],

    [claimsTotalRes],
    [claimsPendingRes],
    [claimsVerifiedRes],
    [claimsRejectedRes],

    [recoveriesTotalRes],
    [recoveriesCompletedRes],
    [recoveriesScheduledRes],
    [recoveriesDepositedRes],

    [pickupPointsTotalRes],
    [pickupPointsActiveRes],

    recentLost,
    recentFound,
    recentClaims,
    recentRecoveries,
  ] = await Promise.all([
    // المستخدمون
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(eq(users.role, "admin")),
    db.select({ count: count() }).from(users).where(eq(users.emailVerified, true)),

    // المفقودات
    db.select({ count: count() }).from(lostItems),
    db.select({ count: count() }).from(lostItems).where(eq(lostItems.status, "open")),
    db.select({ count: count() }).from(lostItems).where(eq(lostItems.status, "recovered")),
    db.select({ count: count() }).from(lostItems).where(eq(lostItems.status, "closed")),

    // المعثورات
    db.select({ count: count() }).from(foundItems),
    db.select({ count: count() }).from(foundItems).where(eq(foundItems.status, "open")),
    db.select({ count: count() }).from(foundItems).where(eq(foundItems.status, "recovered")),
    db.select({ count: count() }).from(foundItems).where(eq(foundItems.status, "closed")),

    // المطابقات
    db.select({ count: count() }).from(matches),
    db.select({ count: count() }).from(matches).where(eq(matches.status, "suggested")),
    db.select({ count: count() }).from(matches).where(eq(matches.status, "accepted")),
    db.select({ count: count() }).from(matches).where(eq(matches.status, "rejected")),

    // المطالبات
    db.select({ count: count() }).from(claims),
    db.select({ count: count() }).from(claims).where(eq(claims.status, "pending")),
    db.select({ count: count() }).from(claims).where(eq(claims.status, "verified")),
    db.select({ count: count() }).from(claims).where(eq(claims.status, "rejected")),

    // الاستلام والتسليم
    db.select({ count: count() }).from(recoveries),
    db.select({ count: count() }).from(recoveries).where(eq(recoveries.status, "completed")),
    db.select({ count: count() }).from(recoveries).where(eq(recoveries.status, "scheduled")),
    db.select({ count: count() }).from(recoveries).where(eq(recoveries.status, "deposited")),

    // نقاط الأمانة
    db.select({ count: count() }).from(pickupPoints),
    db.select({ count: count() }).from(pickupPoints).where(eq(pickupPoints.isActive, true)),

    // أحدث البلاغات المفقودة
    db
      .select({
        id: lostItems.id,
        title: lostItems.title,
        status: lostItems.status,
        createdAt: lostItems.createdAt,
        userName: users.name,
      })
      .from(lostItems)
      .leftJoin(users, eq(lostItems.userId, users.id))
      .orderBy(desc(lostItems.createdAt))
      .limit(4),

    // أحدث المعثورات
    db
      .select({
        id: foundItems.id,
        title: foundItems.title,
        status: foundItems.status,
        createdAt: foundItems.createdAt,
        userName: users.name,
      })
      .from(foundItems)
      .leftJoin(users, eq(foundItems.userId, users.id))
      .orderBy(desc(foundItems.createdAt))
      .limit(4),

    // أحدث المطالبات
    db
      .select({
        id: claims.id,
        status: claims.status,
        createdAt: claims.createdAt,
        claimantName: users.name,
      })
      .from(claims)
      .leftJoin(users, eq(claims.claimantId, users.id))
      .orderBy(desc(claims.createdAt))
      .limit(4),

    // أحدث عمليات الاسترجاع
    db
      .select({
        id: recoveries.id,
        status: recoveries.status,
        scheduledAt: recoveries.scheduledAt,
        createdAt: recoveries.createdAt,
        pickupPointName: pickupPoints.name,
      })
      .from(recoveries)
      .leftJoin(pickupPoints, eq(recoveries.pickupPointId, pickupPoints.id))
      .orderBy(desc(recoveries.createdAt))
      .limit(4),
  ]);

  // الحسابات الرقمية ومعدلات الأداء
  const totalUsers = Number(usersTotalRes?.count ?? 0);
  const totalAdmins = Number(usersAdminRes?.count ?? 0);
  const totalVerifiedUsers = Number(usersVerifiedRes?.count ?? 0);

  const totalLost = Number(lostTotalRes?.count ?? 0);
  const openLost = Number(lostOpenRes?.count ?? 0);
  const recoveredLost = Number(lostRecoveredRes?.count ?? 0);
  const closedLost = Number(lostClosedRes?.count ?? 0);

  const totalFound = Number(foundTotalRes?.count ?? 0);
  const openFound = Number(foundOpenRes?.count ?? 0);
  const recoveredFound = Number(foundRecoveredRes?.count ?? 0);
  const closedFound = Number(foundClosedRes?.count ?? 0);

  const totalReports = totalLost + totalFound;
  const totalOpenReports = openLost + openFound;
  const totalRecoveredReports = recoveredLost + recoveredFound;

  const totalMatches = Number(matchesTotalRes?.count ?? 0);
  const suggestedMatches = Number(matchesSuggestedRes?.count ?? 0);
  const acceptedMatches = Number(matchesAcceptedRes?.count ?? 0);
  const rejectedMatches = Number(matchesRejectedRes?.count ?? 0);

  const totalClaims = Number(claimsTotalRes?.count ?? 0);
  const pendingClaims = Number(claimsPendingRes?.count ?? 0);
  const verifiedClaims = Number(claimsVerifiedRes?.count ?? 0);
  const rejectedClaims = Number(claimsRejectedRes?.count ?? 0);

  const totalRecoveries = Number(recoveriesTotalRes?.count ?? 0);
  const completedRecoveries = Number(recoveriesCompletedRes?.count ?? 0);
  const scheduledRecoveries = Number(recoveriesScheduledRes?.count ?? 0);
  const depositedRecoveries = Number(recoveriesDepositedRes?.count ?? 0);

  const totalPickupPoints = Number(pickupPointsTotalRes?.count ?? 0);
  const activePickupPoints = Number(pickupPointsActiveRes?.count ?? 0);

  // معدلات النجاح
  const recoverySuccessRate =
    totalReports > 0 ? Math.round((totalRecoveredReports / totalReports) * 100) : 0;
  const claimVerificationRate =
    totalClaims > 0 ? Math.round((verifiedClaims / totalClaims) * 100) : 0;
  const matchAcceptanceRate =
    totalMatches > 0 ? Math.round((acceptedMatches / totalMatches) * 100) : 0;

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      {/* Header Banner */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "var(--space-6)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "0.35rem 0.8rem",
              borderRadius: "999px",
              background: "hsl(215,90%,94%)",
              color: "hsl(215,90%,35%)",
              fontSize: "var(--font-size-xs)",
              fontWeight: 700,
              marginBottom: "var(--space-3)",
            }}
          >
            <IconShield size={14} /> لوحة القيادة المركزية
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>
            مؤشرات الأداء والإحصائيات التشغيلية
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)", marginTop: "var(--space-1)" }}>
            إحصائيات مباشرة وفورية مستخرجة من قاعدة البيانات Postgres لإدارة ومراقبة المنصة
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <form action="/api/match/run" method="POST">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <IconPlay size={14} /> تشغيل محرك المطابقة الذكية
            </button>
          </form>

          <Link href="/admin/pickup-points" className="btn btn-outline btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
            <IconMapPin size={14} /> نقاط الأمانة ({activePickupPoints})
          </Link>
        </div>
      </section>

      {/* Top 4 KPI Highlight Stat Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "var(--space-4)" }}>
        {/* Card 1: Total Reports */}
        <div className="card" style={{ padding: "var(--space-5)", borderTop: "4px solid var(--color-primary)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>إجمالي البلاغات المسجلة</span>
              <div style={{ padding: "6px", background: "var(--color-primary-light)", borderRadius: "var(--radius-md)", color: "var(--color-primary)" }}>
                <IconLayers size={18} />
              </div>
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--color-text)", lineHeight: 1.1 }}>
              {totalReports}
            </div>
          </div>
          <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", display: "flex", justifyContent: "space-between" }}>
            <span>مفتوحة: <strong>{totalOpenReports}</strong></span>
            <span>مسترجعة: <strong style={{ color: "hsl(142,60%,25%)" }}>{totalRecoveredReports}</strong></span>
          </div>
        </div>

        {/* Card 2: Smart Matches */}
        <div className="card" style={{ padding: "var(--space-5)", borderTop: "4px solid hsl(210, 80%, 50%)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>المطابقات الذكية</span>
              <div style={{ padding: "6px", background: "hsl(210, 70%, 95%)", borderRadius: "var(--radius-md)", color: "hsl(210, 60%, 35%)" }}>
                <IconTarget size={18} />
              </div>
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "hsl(210, 70%, 35%)", lineHeight: 1.1 }}>
              {totalMatches}
            </div>
          </div>
          <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", display: "flex", justifyContent: "space-between" }}>
            <span>مقترحة: <strong>{suggestedMatches}</strong></span>
            <span>مقبولة: <strong style={{ color: "hsl(142,60%,25%)" }}>{acceptedMatches} ({matchAcceptanceRate}%)</strong></span>
          </div>
        </div>

        {/* Card 3: Claims */}
        <div className="card" style={{ padding: "var(--space-5)", borderTop: "4px solid hsl(38, 90%, 45%)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>مطالبات الملكية</span>
              <div style={{ padding: "6px", background: "hsl(38, 90%, 95%)", borderRadius: "var(--radius-md)", color: "hsl(38, 80%, 28%)" }}>
                <IconShield size={18} />
              </div>
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "hsl(38, 85%, 35%)", lineHeight: 1.1 }}>
              {totalClaims}
            </div>
          </div>
          <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", display: "flex", justifyContent: "space-between" }}>
            <span>قيد المراجعة: <strong>{pendingClaims}</strong></span>
            <span>تم التوثيق: <strong style={{ color: "hsl(142,60%,25%)" }}>{verifiedClaims} ({claimVerificationRate}%)</strong></span>
          </div>
        </div>

        {/* Card 4: Recoveries */}
        <div className="card" style={{ padding: "var(--space-5)", borderTop: "4px solid hsl(142, 65%, 40%)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", fontWeight: 600 }}>عمليات الاسترجاع</span>
              <div style={{ padding: "6px", background: "hsl(142, 60%, 95%)", borderRadius: "var(--radius-md)", color: "hsl(142, 65%, 24%)" }}>
                <IconPackage size={18} />
              </div>
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "hsl(142, 60%, 25%)", lineHeight: 1.1 }}>
              {completedRecoveries}
            </div>
          </div>
          <div style={{ marginTop: "var(--space-3)", paddingTop: "var(--space-2)", borderTop: "1px solid var(--color-border)", fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", display: "flex", justifyContent: "space-between" }}>
            <span>إجمالي العمليات: <strong>{totalRecoveries}</strong></span>
            <span>نسبة الاسترجاع: <strong style={{ color: "hsl(142,60%,25%)" }}>{recoverySuccessRate}%</strong></span>
          </div>
        </div>
      </section>

      {/* Deep-dive 4 Detailed Operational Panels */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--space-6)" }}>
        {/* Panel 1: Lost vs Found Breakdown */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconLayers size={18} /> توزيع بلاغات المفقودات والموجودات
            </h2>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              إجمالي {totalReports} بلاغ
            </span>
          </div>

          {/* Comparative Progress Bar */}
          <div style={{ marginBottom: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "var(--space-1)", fontWeight: 600 }}>
              <span style={{ color: "hsl(0,70%,40%)" }}>مفقودات ({totalLost})</span>
              <span style={{ color: "hsl(142,60%,25%)" }}>معثورات ({totalFound})</span>
            </div>
            <div style={{ height: "10px", borderRadius: "999px", background: "var(--color-bg-secondary)", display: "flex", overflow: "hidden" }}>
              <div
                style={{
                  width: totalReports > 0 ? `${(totalLost / totalReports) * 100}%` : "50%",
                  background: "hsl(0, 75%, 55%)",
                  transition: "width 300ms",
                }}
                title={`مفقودات: ${totalLost}`}
              />
              <div
                style={{
                  width: totalReports > 0 ? `${(totalFound / totalReports) * 100}%` : "50%",
                  background: "hsl(142, 60%, 40%)",
                  transition: "width 300ms",
                }}
                title={`معثورات: ${totalFound}`}
              />
            </div>
          </div>

          {/* Stats Breakdown Table */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
            <div>
              <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "hsl(0,70%,40%)", marginBottom: "var(--space-2)" }}>
                تفاصيل المفقودات
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                <li style={{ display: "flex", justifyContent: "space-between" }}><span>مفتوحة ونشطة:</span> <strong>{openLost}</strong></li>
                <li style={{ display: "flex", justifyContent: "space-between" }}><span>تم استرجاعها:</span> <strong style={{ color: "hsl(142,60%,25%)" }}>{recoveredLost}</strong></li>
                <li style={{ display: "flex", justifyContent: "space-between" }}><span>مغلقة ومؤرشفة:</span> <strong>{closedLost}</strong></li>
              </ul>
            </div>

            <div>
              <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "hsl(142,60%,25%)", marginBottom: "var(--space-2)" }}>
                تفاصيل المعثورات
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                <li style={{ display: "flex", justifyContent: "space-between" }}><span>مفتوحة وبانتظار المالك:</span> <strong>{openFound}</strong></li>
                <li style={{ display: "flex", justifyContent: "space-between" }}><span>تم تسليمها للمالك:</span> <strong style={{ color: "hsl(142,60%,25%)" }}>{recoveredFound}</strong></li>
                <li style={{ display: "flex", justifyContent: "space-between" }}><span>مغلقة ومؤرشفة:</span> <strong>{closedFound}</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Panel 2: Funnel from Matches to Handover */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconTrendingUp size={18} /> مسار التحقق والاسترجاع (Funnel)
            </h2>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              كفاءة الإجراءات
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {/* Step 1: Suggested */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "4px" }}>
                <span>1. مطابقات ذكية مكتشفة ({rejectedMatches} مرفوضة)</span>
                <strong>{totalMatches} اقتراح</strong>
              </div>
              <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-bg-secondary)", overflow: "hidden" }}>
                <div style={{ width: "100%", height: "100%", background: "hsl(215, 80%, 60%)" }} />
              </div>
            </div>

            {/* Step 2: Accepted */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "4px" }}>
                <span>2. تم قبولها بين الطرفين</span>
                <strong>{acceptedMatches} ({matchAcceptanceRate}%)</strong>
              </div>
              <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-bg-secondary)", overflow: "hidden" }}>
                <div style={{ width: `${matchAcceptanceRate}%`, height: "100%", background: "hsl(38, 90%, 50%)" }} />
              </div>
            </div>

            {/* Step 3: Verified Claim */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "4px" }}>
                <span>3. مطالبات تم إثبات ملكيتها ({rejectedClaims} مرفوضة)</span>
                <strong>{verifiedClaims} ({claimVerificationRate}%)</strong>
              </div>
              <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-bg-secondary)", overflow: "hidden" }}>
                <div style={{ width: `${claimVerificationRate}%`, height: "100%", background: "hsl(142, 60%, 45%)" }} />
              </div>
            </div>

            {/* Step 4: Completed Recovery */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-xs)", marginBottom: "4px" }}>
                <span>4. تم التسليم والاسترجاع بنجاح</span>
                <strong style={{ color: "hsl(142,60%,25%)" }}>{completedRecoveries} تسليم مكتمل</strong>
              </div>
              <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-bg-secondary)", overflow: "hidden" }}>
                <div
                  style={{
                    width: verifiedClaims > 0 ? `${Math.min(100, Math.round((completedRecoveries / verifiedClaims) * 100))}%` : "0%",
                    height: "100%",
                    background: "hsl(142, 65%, 30%)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Pickup Points & Deliveries */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconMapPin size={18} /> شبكة نقاط الأمانة والاسترجاع
            </h2>
            <Link href="/admin/pickup-points" className="hover:underline" style={{ fontSize: "var(--font-size-xs)", color: "var(--color-primary)", fontWeight: 600 }}>
              إدارة النقاط ←
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div style={{ background: "var(--color-bg-secondary)", padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>نقاط الأمانة النشطة</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-text)" }}>{activePickupPoints} / {totalPickupPoints}</div>
            </div>

            <div style={{ background: "var(--color-bg-secondary)", padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>أغراض مودعة بالأمانة</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "hsl(270,55%,45%)" }}>{depositedRecoveries}</div>
            </div>

            <div style={{ background: "var(--color-bg-secondary)", padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>مواعيد مجدولة</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "hsl(215,90%,35%)" }}>{scheduledRecoveries}</div>
            </div>

            <div style={{ background: "var(--color-bg-secondary)", padding: "var(--space-3)", borderRadius: "var(--radius-md)" }}>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>استرجاعات مكتملة</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "hsl(142,60%,25%)" }}>{completedRecoveries}</div>
            </div>
          </div>
        </div>

        {/* Panel 4: Users & Access Overview */}
        <div className="card" style={{ padding: "var(--space-6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontSize: "var(--font-size-base)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconUser size={18} /> الحسابات والمستخدمين
            </h2>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
              {totalUsers} مستخدم مسجل
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)" }}>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>إجمالي المستخدمين:</span>
              <strong style={{ fontSize: "var(--font-size-base)" }}>{totalUsers}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0", borderBottom: "1px solid var(--color-border)" }}>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>حسابات موثقة بالبريد (Email OTP):</span>
              <strong style={{ color: "hsl(142,60%,25%)" }}>{totalVerifiedUsers}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) 0" }}>
              <span style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>المشرفون (Administrators):</span>
              <strong style={{ color: "var(--color-primary)" }}>{totalAdmins}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Live Recent Activity Feed Table */}
      <section className="card" style={{ padding: "var(--space-6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-5)", flexWrap: "wrap", gap: "var(--space-2)" }}>
          <div>
            <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <IconActivity size={20} /> أحدث البلاغات والعمليات على المنصة
            </h2>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", margin: "var(--space-1) 0 0 0" }}>
              سجل فوري بآخر التحديثات والإجراءات المتخذة من المستخدمين
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-5)" }}>
          {/* Column 1: Recent Lost Reports */}
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "hsl(0,70%,40%)", marginBottom: "var(--space-3)", paddingBottom: "var(--space-1)", borderBottom: "2px solid hsl(0,70%,40%)33" }}>
              أحدث بلاغات المفقودات
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {recentLost.length === 0 ? (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", padding: "var(--space-3) 0" }}>لا توجد بلاغات مفقودة</div>
              ) : (
                recentLost.map((item) => {
                  const s = statusLabels[item.status] ?? statusLabels.open;
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)" }}>
                      <div style={{ minWidth: 0, flex: 1, paddingLeft: "var(--space-2)" }}>
                        <Link href={`/items/lost/${item.id}`} className="hover:underline" style={{ fontWeight: 600, color: "var(--color-text)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {item.title}
                        </Link>
                        <span style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>{item.userName ?? "مستخدم"} • {formatTime(item.createdAt)}</span>
                      </div>
                      <span style={{ padding: "1px 6px", borderRadius: "var(--radius-full)", background: s.bg, color: s.color, fontWeight: 700, fontSize: "10px", flexShrink: 0 }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 2: Recent Found Reports */}
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "hsl(142,60%,25%)", marginBottom: "var(--space-3)", paddingBottom: "var(--space-1)", borderBottom: "2px solid hsl(142,60%,25%)33" }}>
              أحدث بلاغات المعثورات
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {recentFound.length === 0 ? (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", padding: "var(--space-3) 0" }}>لا توجد بلاغات معثورات</div>
              ) : (
                recentFound.map((item) => {
                  const s = statusLabels[item.status] ?? statusLabels.open;
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)" }}>
                      <div style={{ minWidth: 0, flex: 1, paddingLeft: "var(--space-2)" }}>
                        <Link href={`/items/found/${item.id}`} className="hover:underline" style={{ fontWeight: 600, color: "var(--color-text)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {item.title}
                        </Link>
                        <span style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>{item.userName ?? "مستخدم"} • {formatTime(item.createdAt)}</span>
                      </div>
                      <span style={{ padding: "1px 6px", borderRadius: "var(--radius-full)", background: s.bg, color: s.color, fontWeight: 700, fontSize: "10px", flexShrink: 0 }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 3: Recent Claims */}
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "hsl(38,90%,35%)", marginBottom: "var(--space-3)", paddingBottom: "var(--space-1)", borderBottom: "2px solid hsl(38,90%,35%)33" }}>
              أحدث مطالبات الملكية
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {recentClaims.length === 0 ? (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", padding: "var(--space-3) 0" }}>لا توجد مطالبات مسجلة</div>
              ) : (
                recentClaims.map((claim) => {
                  const s = statusLabels[claim.status] ?? statusLabels.pending;
                  return (
                    <div key={claim.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)" }}>
                      <div style={{ minWidth: 0, flex: 1, paddingLeft: "var(--space-2)" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-text)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          مطالبة: {claim.claimantName ?? "مستخدم"}
                        </span>
                        <span style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>{formatTime(claim.createdAt)}</span>
                      </div>
                      <span style={{ padding: "1px 6px", borderRadius: "var(--radius-full)", background: s.bg, color: s.color, fontWeight: 700, fontSize: "10px", flexShrink: 0 }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Column 4: Recent Handover Recoveries */}
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, color: "hsl(215,90%,35%)", marginBottom: "var(--space-3)", paddingBottom: "var(--space-1)", borderBottom: "2px solid hsl(215,90%,35%)33" }}>
              أحدث عمليات الاستلام والتسليم
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {recentRecoveries.length === 0 ? (
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", padding: "var(--space-3) 0" }}>لا توجد عمليات استلام مسجلة</div>
              ) : (
                recentRecoveries.map((rec) => {
                  const s = statusLabels[rec.status] ?? statusLabels.scheduled;
                  return (
                    <div key={rec.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-2) var(--space-3)", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-sm)", fontSize: "var(--font-size-xs)" }}>
                      <div style={{ minWidth: 0, flex: 1, paddingLeft: "var(--space-2)" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-text)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {rec.pickupPointName ? `نقطة: ${rec.pickupPointName}` : "استلام مباشر بين الطرفين"}
                        </span>
                        <span style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>{formatTime(rec.scheduledAt || rec.createdAt)}</span>
                      </div>
                      <span style={{ padding: "1px 6px", borderRadius: "var(--radius-full)", background: s.bg, color: s.color, fontWeight: 700, fontSize: "10px", flexShrink: 0 }}>
                        {s.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
