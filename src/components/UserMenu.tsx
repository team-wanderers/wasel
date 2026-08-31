"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconLogout, IconUser } from "@/components/icons";

export default function UserMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image: string | null;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName = name.trim() || "حسابي";

  useEffect(() => {
    function handlePointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handlePointer);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="portal-user" ref={rootRef}>
      <button
        type="button"
        className="portal-user-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`قائمة الحساب، ${displayName}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="portal-user-avatar" />
        ) : (
          <IconUser size={21} />
        )}
        <span className="portal-user-name">{displayName}</span>
      </button>
      {open && (
        <div className="portal-user-panel" role="menu">
          <div className="portal-user-meta">
            <b>{displayName}</b>
            <small>{email}</small>
          </div>
          <Link href="/dashboard/profile" role="menuitem" onClick={() => setOpen(false)}>
            <IconUser size={18} />
            الملف الشخصي
          </Link>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="is-logout" role="menuitem">
              <IconLogout size={18} />
              تسجيل الخروج
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
