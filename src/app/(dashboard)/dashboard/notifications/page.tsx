import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import NotificationsManager from "./NotificationsManager";

export const metadata = {
  title: "مركز الإشعارات | واصل",
  description: "عرض ومتابعة كافة الإشعارات والتنبيهات",
};

export default async function NotificationsPage() {
  const user = await requireUser();

  const list = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  return (
    <div style={{ maxWidth: "800px" }}>
      <NotificationsManager initialNotifications={list} />
    </div>
  );
}
