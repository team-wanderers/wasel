export function normalizeArabic(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      // normalize whitespace
      .replace(/\s+/g, " ")
      // normalize alef variants → bare alef
      .replace(/[أإآٱ]/g, "ا")
      // normalize teh marbuta → heh
      .replace(/ة/g, "ه")
      // normalize alef maqsura → yeh
      .replace(/ى/g, "ي")
      // strip tanwin (nunation)
      .replace(/[ًٌٍ]/g, "")
      // strip harakat (diacritics)
      .replace(/[َُِّْ]/g, "")
      // strip tatweel (kashida)
      .replace(/ـ/g, "")
      // strip waw superscript alef
      .replace(/ٰ/g, "")
      // normalize waw with hamza
      .replace(/ؤ/g, "و")
      // normalize yeh with hamza
      .replace(/ئ/g, "ي")
      // normalize hamza alone
      .replace(/ء/g, "")
  );
}

export function tokenize(text: string): string[] {
  return normalizeArabic(text)
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function matchScore(candidate: string, secret: string): number {
  const cTokens = new Set(tokenize(candidate));
  const sTokens = tokenize(secret);
  if (sTokens.length === 0) return 0;
  const hits = sTokens.filter((t) => cTokens.has(t)).length;
  return hits / sTokens.length;
}

export function verifyProof(
  proofDescription: string,
  secretDetails: string,
  threshold = 0.5,
): { passed: boolean; score: number } {
  const score = matchScore(proofDescription, secretDetails);
  return { passed: score >= threshold, score };
}

export function getArabicSearchVariants(query: string): string[] {
  const variants = new Set<string>();
  const q = query.trim();
  if (!q) return [];
  variants.add(q);
  const norm = normalizeArabic(q);
  variants.add(norm);

  const typo1 = q.replace(/ض/g, "ظ");
  const typo2 = q.replace(/ظ/g, "ض");
  const typo3 = q.replace(/ذ/g, "ز");
  const typo4 = q.replace(/ز/g, "ذ");
  variants.add(typo1);
  variants.add(typo2);
  variants.add(typo3);
  variants.add(typo4);

  if (q.length >= 3 && q.length <= 15) {
    for (let i = 1; i < q.length - 1; i++) {
      const wildcard = q.substring(0, i) + "_" + q.substring(i + 1);
      variants.add(wildcard);
    }
  }

  return Array.from(variants);
}
