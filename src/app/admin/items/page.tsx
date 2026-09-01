import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { lostItems, foundItems, users, itemMedia, auditLogs, matches } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import AdminItemsManager, { AdminItem, AdminAuditLog, AdminMatchCandidate } from "./AdminItemsManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "إدارة ومراجعة البلاغات | واصل الإدارة",
  description: "استعراض وتعديل حالات بلاغات المفقودات والمعثورات وتسجيل العمليات الرقابية",
};

export default async function AdminItemsPage() {
  await requireAdmin();

  // 1. استعلام بلاغات المفقودات مع بيانات المستخدمين
  const lostRows = await db
    .select({
      id: lostItems.id,
      userId: lostItems.userId,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
      title: lostItems.title,
      description: lostItems.description,
      category: lostItems.category,
      status: lostItems.status,
      lat: lostItems.lat,
      lng: lostItems.lng,
      secretDetails: lostItems.secretDetails,
      date: lostItems.lostAt,
      createdAt: lostItems.createdAt,
      updatedAt: lostItems.updatedAt,
    })
    .from(lostItems)
    .leftJoin(users, eq(lostItems.userId, users.id))
    .orderBy(desc(lostItems.createdAt));

  // 2. استعلام بلاغات المعثورات مع بيانات المستخدمين
  const foundRows = await db
    .select({
      id: foundItems.id,
      userId: foundItems.userId,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
      title: foundItems.title,
      description: foundItems.description,
      category: foundItems.category,
      status: foundItems.status,
      lat: foundItems.lat,
      lng: foundItems.lng,
      secretDetails: foundItems.secretDetails,
      date: foundItems.foundAt,
      createdAt: foundItems.createdAt,
      updatedAt: foundItems.updatedAt,
    })
    .from(foundItems)
    .leftJoin(users, eq(foundItems.userId, users.id))
    .orderBy(desc(foundItems.createdAt));

  // 3. جلب جميع الوسائط وربطها بالبلاغات
  const mediaRows = await db
    .select({
      id: itemMedia.id,
      lostItemId: itemMedia.lostItemId,
      foundItemId: itemMedia.foundItemId,
      path: itemMedia.path,
    })
    .from(itemMedia);

  const mediaByLostId = new Map<string, string[]>();
  const mediaByFoundId = new Map<string, string[]>();

  for (const m of mediaRows) {
    if (m.lostItemId) {
      const arr = mediaByLostId.get(m.lostItemId) ?? [];
      arr.push(m.path);
      mediaByLostId.set(m.lostItemId, arr);
    }
    if (m.foundItemId) {
      const arr = mediaByFoundId.get(m.foundItemId) ?? [];
      arr.push(m.path);
      mediaByFoundId.set(m.foundItemId, arr);
    }
  }

  // 4. دمج وتجهيز قائمة البلاغات
  const lostFormatted: AdminItem[] = lostRows.map((r) => ({
    id: r.id,
    type: "lost",
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    userPhone: r.userPhone,
    title: r.title,
    description: r.description,
    category: r.category,
    status: r.status,
    lat: r.lat,
    lng: r.lng,
    secretDetails: r.secretDetails,
    date: r.date,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    images: mediaByLostId.get(r.id) ?? [],
    matchCandidates: [],
  }));

  const foundFormatted: AdminItem[] = foundRows.map((r) => ({
    id: r.id,
    type: "found",
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    userPhone: r.userPhone,
    title: r.title,
    description: r.description,
    category: r.category,
    status: r.status,
    lat: r.lat,
    lng: r.lng,
    secretDetails: r.secretDetails,
    date: r.date,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    images: mediaByFoundId.get(r.id) ?? [],
    matchCandidates: [],
  }));

  const allItems = [...lostFormatted, ...foundFormatted].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const itemByKey = new Map(allItems.map((item) => [`${item.type}:${item.id}`, item]));
  const matchRows =
    allItems.length > 0
      ? await db
          .select({
            id: matches.id,
            lostItemId: matches.lostItemId,
            foundItemId: matches.foundItemId,
            score: matches.score,
            status: matches.status,
          })
          .from(matches)
          .orderBy(desc(matches.score))
      : [];

  const candidatesByItem = new Map<string, AdminMatchCandidate[]>();
  for (const match of matchRows) {
    const lostItem = itemByKey.get(`lost:${match.lostItemId}`);
    const foundItem = itemByKey.get(`found:${match.foundItemId}`);
    if (!lostItem || !foundItem) continue;

    const lostCandidate: AdminMatchCandidate = {
      matchId: match.id,
      matchStatus: match.status,
      id: lostItem.id,
      type: "lost",
      title: lostItem.title,
      description: lostItem.description,
      category: lostItem.category,
      status: lostItem.status,
      score: match.score,
      lat: lostItem.lat,
      lng: lostItem.lng,
      userName: lostItem.userName,
      userEmail: lostItem.userEmail,
      userPhone: lostItem.userPhone,
    };
    const foundCandidate: AdminMatchCandidate = {
      matchId: match.id,
      matchStatus: match.status,
      id: foundItem.id,
      type: "found",
      title: foundItem.title,
      description: foundItem.description,
      category: foundItem.category,
      status: foundItem.status,
      score: match.score,
      lat: foundItem.lat,
      lng: foundItem.lng,
      userName: foundItem.userName,
      userEmail: foundItem.userEmail,
      userPhone: foundItem.userPhone,
    };

    candidatesByItem.set(`lost:${lostItem.id}`, [
      ...(candidatesByItem.get(`lost:${lostItem.id}`) ?? []),
      foundCandidate,
    ]);
    candidatesByItem.set(`found:${foundItem.id}`, [
      ...(candidatesByItem.get(`found:${foundItem.id}`) ?? []),
      lostCandidate,
    ]);
  }

  const itemsWithCandidates = allItems.map((item) => ({
    ...item,
    matchCandidates: candidatesByItem.get(`${item.type}:${item.id}`) ?? [],
  }));

  // 5. استعلام سجلات الرقابة (Audit Logs) الخاصة بالإشراف
  const logRows = await db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      actorName: users.name,
      actorEmail: users.email,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      meta: auditLogs.meta,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(eq(auditLogs.action, "moderate_status"))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  const formattedAuditLogs: AdminAuditLog[] = logRows.map((l) => ({
    id: l.id,
    actorId: l.actorId,
    actorName: l.actorName,
    actorEmail: l.actorEmail,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    meta: (l.meta as AdminAuditLog["meta"]) || null,
    createdAt: l.createdAt,
  }));

  return (
      <AdminItemsManager
        initialItems={itemsWithCandidates}
        initialAuditLogs={formattedAuditLogs}
      />
  );
}
