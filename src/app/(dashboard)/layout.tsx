import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { NotificationProvider } from "@/context/NotificationContext";
import UnauthorizedAdminAlert from "@/components/dashboard/UnauthorizedAdminAlert";
import PortalChrome from "@/components/PortalChrome";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const [unreadRes] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  const initialUnreadCount = Number(unreadRes?.count ?? 0);

  return (
    <NotificationProvider initialUnreadCount={initialUnreadCount}>
      <PortalChrome>
        <UnauthorizedAdminAlert />
        {children}
      </PortalChrome>
    </NotificationProvider>
  );
}
