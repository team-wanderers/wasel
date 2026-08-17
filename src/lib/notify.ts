/**
 * notify() helper
 * ---------------
 * يُنشئ سجل إشعار داخلي في جدول notifications.
 * يُستدعى عند: مطابقة جديدة، تغيير حالة مطالبة، تأكيد استرداد.
 */

import { db } from "@/db";
import { notifications } from "@/db/schema";

export type NotificationType =
  | "match_suggested"
  | "match_accepted"
  | "match_rejected"
  | "claim_pending"
  | "claim_verified"
  | "claim_rejected"
  | "recovery_scheduled"
  | "recovery_completed";

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
): Promise<void> {
  await db.insert(notifications).values({ userId, type, title, body });
}
