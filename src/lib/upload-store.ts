import { mkdir, writeFile } from "fs/promises";
import path from "path";

export function getUploadDirs(): string[] {
  const dirs = [
    path.join(process.cwd(), "public", "uploads"),
    path.join(process.cwd(), "uploads"),
  ];
  if (process.env.UPLOAD_DIR) {
    dirs.unshift(path.resolve(process.env.UPLOAD_DIR));
  }
  return [...new Set(dirs.map((dir) => path.resolve(dir)))];
}

export async function saveUpload(filename: string, buffer: Buffer): Promise<string> {
  for (const dir of getUploadDirs()) {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
  }
  return `/uploads/${filename}`;
}
