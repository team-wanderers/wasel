import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import AdminUsersManager, { AdminUser } from "./AdminUsersManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "إدارة المستخدمين والأدوار | واصل الإدارة",
  description: "استعراض حسابات المستخدمين المسجلين وتعديل أدوارهم وصلاحياتهم",
};

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const usersData: AdminUser[] = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));

  return (
    <AdminUsersManager
      initialUsers={usersData}
      currentAdminId={admin.id}
    />
  );
}
