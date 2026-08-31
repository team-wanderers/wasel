import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export interface LogAuditParams {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId: params.actorId || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      meta: params.meta || null,
    });
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}
