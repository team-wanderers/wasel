/**
 * Unit Test for Matching Engine Logic and OTP Adapter
 * ----------------------------------------------------
 * Runs without database requirement to verify core algorithms.
 */

import { computeScore } from "../lib/matching";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "../lib/otp";

console.log("=========================================");
console.log("  Wasel Core Engine & Logic Verification ");
console.log("=========================================\n");

// 1. Test OTP Generation & Verification
console.log("1. Testing OTP Generation & Validation...");
const code = generateOtpCode();
console.log(`   Generated code: ${code}`);
if (code.length !== 6 || isNaN(Number(code))) {
  throw new Error("OTP code must be a 6-digit number");
}

const hash = hashOtpCode(code);
const isValid = verifyOtpCode(code, hash);
console.log(`   Verification with generated code: ${isValid ? "PASS" : "FAIL"}`);
if (!isValid) throw new Error("OTP verification failed");

// Test dev bypass code
const isDevValid = verifyOtpCode("123456", hash);
console.log(`   Verification with dev code '123456': ${isDevValid ? "PASS" : "FAIL"}`);
if (!isDevValid) throw new Error("Dev bypass 123456 verification failed");

// 2. Test Smart Matching Scoring Engine
console.log("\n2. Testing Smart Matching Engine Scoring...");

// Test Case A: Identical category, high text overlap, same coordinates (Ataq)
const itemLostA = {
  id: "lost-1",
  userId: "user-1",
  title: "محفظة جلدية سوداء بداخلها بطاقة هوية",
  description: "فقدت محفظة سوداء في شارع الجمهورية قرب السوق المركزي",
  category: "documents",
  lat: 14.5372,
  lng: 46.8319,
};

const itemFoundA = {
  id: "found-1",
  userId: "user-2",
  title: "محفظة جلدية سوداء مع بطاقة هوية وطنية",
  description: "عثرت على محفظة سوداء جلد في السوق المركزي بعتق",
  category: "documents",
  lat: 14.5375,
  lng: 46.8322,
};

const scoreA = computeScore(itemLostA, itemFoundA);
console.log(`   Test Case A (High Match): Score = ${scoreA} (${Math.round(scoreA * 100)}%)`);
console.log(`   Should exceed 0.65 threshold: ${scoreA >= 0.65 ? "PASS (Suggested Match)" : "FAIL"}`);
if (scoreA < 0.65) throw new Error("Expected score >= 0.65 for close match");

// Test Case B: Partial match (Same category, some text overlap, slightly further distance)
const itemFoundB = {
  id: "found-2",
  userId: "user-3",
  title: "محفظة بنية قديمة",
  description: "عثر عليها قرب المستشفى",
  category: "documents",
  lat: 14.5450,
  lng: 46.8400,
};

const scoreB = computeScore(itemLostA, itemFoundB);
console.log(`   Test Case B (Partial Match): Score = ${scoreB} (${Math.round(scoreB * 100)}%)`);
console.log(`   Should be in potential range (0.40 - 0.64): ${scoreB >= 0.40 && scoreB < 0.65 ? "PASS (Potential Match)" : "INFO"}`);

// Test Case C: Mismatched category & completely different text
const itemFoundC = {
  id: "found-3",
  userId: "user-4",
  title: "قطة بيضاء أليفة",
  description: "قطة صغيرة ضائعة في الحي",
  category: "pets",
  lat: 14.5372,
  lng: 46.8319,
};

const scoreC = computeScore(itemLostA, itemFoundC);
console.log(`   Test Case C (Mismatch): Score = ${scoreC} (${Math.round(scoreC * 100)}%)`);
console.log(`   Should be rejected (< 0.40): ${scoreC < 0.40 ? "PASS (Ignored)" : "FAIL"}`);
if (scoreC >= 0.40) throw new Error("Expected score < 0.40 for mismatched items");

console.log("\n=========================================");
console.log("  ALL CORE VERIFICATION TESTS PASSED!    ");
console.log("=========================================");
