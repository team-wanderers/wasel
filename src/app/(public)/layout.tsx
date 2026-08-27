import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";
import { NotificationProvider } from "@/context/NotificationContext";
import PortalChrome from "@/components/PortalChrome";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  let unread = 0;
  if (user) {
    const [unreadRes] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    unread = Number(unreadRes?.count ?? 0);
  }

  const shell = <PortalChrome>{children}</PortalChrome>;

  if (!user) return shell;

  return (
    <NotificationProvider initialUnreadCount={unread}>
      {shell}
    </NotificationProvider>
  );
}
