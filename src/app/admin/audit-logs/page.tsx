import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import AuditLogsManager, { AuditLogEntry } from "./AuditLogsManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "سجلات التدقيق الإداري | لوحة الإدارة",
  description: "استعراض سجلات التدقيق الإدارية والتغييرات التشغيلية على مستوى المنصة",
};

export default async function AdminAuditLogsPage() {
  await requireAdmin();

  const logs = await db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      actorName: users.name,
      actorEmail: users.email,
      actorRole: users.role,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      meta: auditLogs.meta,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return <AuditLogsManager initialLogs={logs as AuditLogEntry[]} />;
}
