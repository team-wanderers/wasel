import { db } from "@/db";
import { notifications } from "@/db/schema";

export type NotificationType =
  | "match.created"
  | "claim.created"
  | "claim.verified"
  | "claim.rejected"
  | "recovery.scheduled"
  | "recovery.rescheduled"
  | "recovery.deposited"
  | "recovery.completed"
  | "system";

export interface NotifyParams {
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  link?: string | null;
}

/**
 * دالة مركزية لإدراج إشعار لمستخدم في جدول notifications
 */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    if (!params.userId || !params.title || !params.body) return;

    await db.insert(notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link ?? null,
    });
  } catch (error) {
    console.error("[NOTIFY_ERROR]", error);
  }
}

/**
 * دالة مركزية لإدراج مجموعة إشعارات دفعة واحدة
 */
export async function notifyMany(list: NotifyParams[]): Promise<void> {
  try {
    const valid = list.filter((p) => p.userId && p.title && p.body);
    if (valid.length === 0) return;

    await db.insert(notifications).values(
      valid.map((p) => ({
        userId: p.userId,
        type: p.type,
        title: p.title,
        body: p.body,
        link: p.link ?? null,
      }))
    );
  } catch (error) {
    console.error("[NOTIFY_MANY_ERROR]", error);
  }
}
