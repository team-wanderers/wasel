import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { getPlatformSettings, updatePlatformSettings } from "@/lib/settings";
import { updateSettingsSchema, PlatformSettings } from "@/types/settings";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const session = await getSession().catch(() => null);
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "غير مصرح — يتطلب صلاحيات الإدارة" },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
        }
      );
    }

    const currentSettings = await getPlatformSettings();

    return NextResponse.json(
      { settings: currentSettings },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  } catch (error) {
    console.error("[SETTINGS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب إعدادات المنصة" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession().catch(() => null);
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "غير مصرح — يتطلب صلاحيات الإدارة" },
        {
          status: 403,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
        }
      );
    }

    const body = await req.json();
    const parseResult = updateSettingsSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "البيانات المدخلة غير صالحة", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updatePlatformSettings(parseResult.data as Partial<PlatformSettings>);

    await logAudit({
      actorId: session.id,
      action: "settings.update",
      entityType: "settings",
      entityId: "00000000-0000-0000-0000-000000000000",
      meta: {
        updatedKeys: Object.keys(parseResult.data),
        settings: parseResult.data,
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/audit-logs");
    revalidatePath("/admin");

    return NextResponse.json(
      {
        success: true,
        message: "تم حفظ وتحديث إعدادات المنصة بنجاح",
        settings: updated,
      },
      {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  } catch (error) {
    console.error("[SETTINGS_PATCH_ERROR]", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث إعدادات المنصة" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
      }
    );
  }
}
