import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { itemMedia } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const lostItemId = formData.get("lostItemId") as string | null;
    const foundItemId = formData.get("foundItemId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم تحديد أي ملف" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // المسار المباشر داخل مجلد public لخدمته كملف ثابت
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const relativePath = `uploads/${filename}`;
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