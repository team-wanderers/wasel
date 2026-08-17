import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/db";
import { itemMedia } from "@/db/schema";
import { getSession } from "@/lib/auth";

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرَّح" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const lostItemId = formData.get("lostItemId") as string | null;
  const foundItemId = formData.get("foundItemId") as string | null;

  if (!file) return NextResponse.json({ error: "الملف مطلوب" }, { status: 422 });
  if (!lostItemId && !foundItemId)
    return NextResponse.json({ error: "lostItemId أو foundItemId مطلوب" }, { status: 422 });

  if (!ALLOWED_MIMES.includes(file.type))
    return NextResponse.json({ error: "نوع الملف غير مدعوم (jpg, png, webp, gif فقط)" }, { status: 422 });

  if (file.size > MAX_SIZE_BYTES)
    return NextResponse.json({ error: "حجم الملف يتجاوز 5 ميغابايت" }, { status: 422 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // تنظيم مجلد التخزين
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = path.join(uploadDir, filename);

  await writeFile(filePath, buffer);

  const relativePath = `uploads/${filename}`;

  const [media] = await db
    .insert(itemMedia)
    .values({
      lostItemId: lostItemId ?? undefined,
      foundItemId: foundItemId ?? undefined,
      path: relativePath,
      mime: file.type,
    })
    .returning();

  return NextResponse.json({ id: media.id, path: relativePath }, { status: 201 });
}
