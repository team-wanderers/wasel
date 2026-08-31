import { requireAdmin } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/settings";
import SettingsManager from "./SettingsManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "إعدادات المنصة | لوحة الإدارة",
  description: "التحكم في إعدادات المنصة، خوارزمية المطابقة، وسياسات الأمان والاسترجاع",
};

export default async function AdminSettingsPage() {
  await requireAdmin();
  const currentSettings = await getPlatformSettings();

  return <SettingsManager initialSettings={currentSettings} />;
}
