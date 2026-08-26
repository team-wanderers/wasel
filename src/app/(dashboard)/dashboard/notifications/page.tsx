import { requireUser } from "@/lib/auth";
import NotificationsManager from "./NotificationsManager";

export const metadata = {
  title: "مركز الإشعارات | واصل",
  description: "عرض ومتابعة كافة الإشعارات والتنبيهات",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requireUser();

  return (
    <div style={{ maxWidth: "800px" }}>
      <NotificationsManager />
    </div>
  );
}
