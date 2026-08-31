import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { db } from "@/db";
import { itemMedia } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { MAX_UPLOAD_BYTES } from "@/lib/image-limits";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول لرفع الملفات" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const lostItemId = formData.get("lostItemId") as string | null;
    const foundItemId = formData.get("foundItemId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم تحديد أي ملف" }, { status: 400 });
    }

    const ext = ALLOWED_IMAGE_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "نوع الملف غير مدعوم. الصيغ المسموحة: JPG، PNG، WebP، GIF" },
        { status: 415 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "حجم الصورة يتجاوز الحد الأقصى (5 ميغابايت)" },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // المسار المباشر داخل مجلد public لخدمته كملف ثابت
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const relativePath = `/uploads/${filename}`;
    const mimeType = file.type || "image/jpeg";

    let mediaId: string = filename;

    // حفظ في قاعدة البيانات إذا تم تحديد معرف البلاغ
    if (lostItemId || foundItemId) {
      const [mediaRecord] = await db
        .insert(itemMedia)
        .values({
          lostItemId: lostItemId && lostItemId.trim().length > 0 ? lostItemId.trim() : null,
          foundItemId: foundItemId && foundItemId.trim().length > 0 ? foundItemId.trim() : null,
          path: relativePath,
          mime: mimeType,
        })
        .returning();

      if (mediaRecord) {
        mediaId = mediaRecord.id;
      }
    }

    return NextResponse.json({
      id: mediaId,
      path: relativePath,
      mime: mimeType,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
  }
}