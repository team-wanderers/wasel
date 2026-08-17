/**
 * npm run match:run
 * -----------------
 * سكريبت تشغيل محرك المطابقة من سطر الأوامر.
 * يستخدم DATABASE_URL من .env
 */

import "dotenv/config";
import { runMatchingEngine } from "../lib/matching";

async function main() {
  console.log("[Matching] بدء تشغيل محرك المطابقة...");

  try {
    const result = await runMatchingEngine();
    console.log("[Matching] النتائج:", result);
    process.exit(0);
  } catch (err) {
    console.error("[Matching] خطأ:", err);
    process.exit(1);
  }
}

main();
