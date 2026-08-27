export const categoryLabels: Record<string, string> = {
  documents: "وثائق",
  electronics: "إلكترونيات",
  keys: "مفاتيح",
  bags: "محافظ",
  jewelry: "مجوهرات",
  pets: "حيوانات",
  other: "أخرى",
};

export const statusLabels: Record<string, string> = {
  open: "مفتوح",
  matched: "مطابَق",
  claimed: "مطالَب",
  recovered: "مُسترجَع",
  closed: "مغلق",
};

export const searchCategories = [
  { value: "", label: "الكل" },
  { value: "electronics", label: "إلكترونيات" },
  { value: "documents", label: "وثائق" },
  { value: "keys", label: "مفاتيح" },
  { value: "bags", label: "محافظ" },
  { value: "jewelry", label: "مجوهرات" },
  { value: "pets", label: "حيوانات" },
  { value: "other", label: "أخرى" },
];

export function mediaSrc(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function formatRelativeAr(date: Date | string): string {
  const d = new Date(date);
  const diff = Math.max(0, Date.now() - d.getTime());
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return "الآن";
  if (mins === 1) return "قبل دقيقة";
  if (mins === 2) return "قبل دقيقتين";
  if (mins < 60) return `قبل ${mins} دقائق`;
  if (hours === 1) return "قبل ساعة";
  if (hours === 2) return "قبل ساعتين";
  if (hours < 24) return `قبل ${hours} ساعات`;
  if (days === 1) return "قبل يوم";
  if (days === 2) return "منذ يومين";
  if (days < 11) return `منذ ${days} أيام`;
  return d.toLocaleDateString("ar-YE");
}
