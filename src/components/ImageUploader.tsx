"use client";

import { useState, useRef } from "react";

export interface UploadedFile {
  id: string;
  path: string;
  previewUrl: string;
}

interface ImageUploaderProps {
  lostItemId?: string;
  foundItemId?: string;
  initialFiles?: { id: string; path: string; previewUrl?: string }[];
  onUpload?: (files: UploadedFile[]) => void;
}

function normalizeFile(f: { id: string; path: string; previewUrl?: string }): UploadedFile {
  const preview = f.previewUrl || (f.path.startsWith("/") ? f.path : `/${f.path}`);
  return {
    id: f.id,
    path: f.path,
    previewUrl: preview,
  };
}

export default function ImageUploader({
  lostItemId,
  foundItemId,
  initialFiles,
  onUpload,
}: ImageUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(() =>
    (initialFiles || []).map(normalizeFile)
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    setUploading(true);
    setError("");

    const results: UploadedFile[] = [];

    for (const file of selected) {
      const formData = new FormData();
      formData.append("file", file);
      if (lostItemId)  formData.append("lostItemId",  lostItemId);
      if (foundItemId) formData.append("foundItemId", foundItemId);

      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "فشل رفع الصورة");
        setUploading(false);
        return;
      }

      results.push({
        id: data.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`),
        path: data.path,
        previewUrl: URL.createObjectURL(file),
      });
    }

    const updated = [...files, ...results];
    setFiles(updated);
    onUpload?.(updated);
    setUploading(false);

    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(id: string) {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    onUpload?.(updated);
  }

  return (
    <div>
      {/* Thumbnails */}
      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          {files.map((f, index) => (
            <div key={f.id || f.previewUrl || index} style={{ position: "relative", display: "inline-block" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.previewUrl}
                alt="صورة"
                style={{
                  width: "100px", height: "100px", objectFit: "cover",
                  borderRadius: "var(--radius-md)", border: "2px solid var(--color-border)",
                }}
              />
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                aria-label="حذف الصورة"
                style={{
                  position: "absolute", top: "4px", insetInlineEnd: "4px",
                  width: "22px", height: "22px", borderRadius: "50%",
                  background: "rgba(0,0,0,0.6)", color: "#fff",
                  border: "none", cursor: "pointer", fontSize: "12px",
                  lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <label
        style={{
          display: "inline-flex", alignItems: "center", gap: "var(--space-2)",
          padding: "var(--space-3) var(--space-5)",
          border: "2px dashed var(--color-border)", borderRadius: "var(--radius-md)",
          cursor: uploading ? "not-allowed" : "pointer",
          color: uploading ? "var(--color-text-muted)" : "var(--color-text-secondary)",
          fontSize: "var(--font-size-sm)", transition: "all 150ms",
          background: "var(--color-bg-secondary)",
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>📷</span>
        <span>{uploading ? "جارٍ الرفع..." : "إضافة صور (اختياري)"}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={uploading}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </label>

      {error && (
        <p style={{ color: "var(--color-danger)", fontSize: "var(--font-size-sm)", marginTop: "var(--space-2)" }}>
          {error}
        </p>
      )}
      <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-2)" }}>
        JPG, PNG, WebP — بحد أقصى 5 ميغابايت لكل صورة
      </p>
    </div>
  );
}
