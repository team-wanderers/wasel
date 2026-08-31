import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  PlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
} from "@/types/settings";

export * from "@/types/settings";

const SETTINGS_KEY = "platform_settings";

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEY))
      .limit(1);

    if (!row || !row.value || typeof row.value !== "object") {
      return DEFAULT_PLATFORM_SETTINGS;
    }

    const val = row.value as Partial<PlatformSettings>;

    return {
      matching: {
        ...DEFAULT_PLATFORM_SETTINGS.matching,
        ...(val.matching || {}),
      },
      support: {
        ...DEFAULT_PLATFORM_SETTINGS.support,
        ...(val.support || {}),
      },
      recovery: {
        ...DEFAULT_PLATFORM_SETTINGS.recovery,
        ...(val.recovery || {}),
      },
      features: {
        ...DEFAULT_PLATFORM_SETTINGS.features,
        ...(val.features || {}),
      },
    };
  } catch (error) {
    console.error("[GET_PLATFORM_SETTINGS_ERROR]", error);
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

export async function updatePlatformSettings(
  partial: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  const current = await getPlatformSettings();

  const merged: PlatformSettings = {
    matching: {
      ...current.matching,
      ...(partial.matching || {}),
    },
    support: {
      ...current.support,
      ...(partial.support || {}),
    },
    recovery: {
      ...current.recovery,
      ...(partial.recovery || {}),
    },
    features: {
      ...current.features,
      ...(partial.features || {}),
    },
  };

  await db
    .insert(settings)
    .values({
      key: SETTINGS_KEY,
      value: merged,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: merged,
        updatedAt: new Date(),
      },
    });

  return merged;
}
