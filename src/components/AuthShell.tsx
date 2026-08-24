import type { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6) var(--space-4)",
        background: "var(--color-bg)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="blob-field" aria-hidden="true">
        <div className="blob blob-blue" style={{ top: "-8rem", right: "-8rem", width: "20rem", height: "20rem" }} />
        <div className="blob blob-indigo" style={{ bottom: "-8rem", left: "-8rem", width: "22rem", height: "22rem" }} />
      </div>

      <div style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--color-text-primary)",
            }}
          >
            WASEL{" "}
            <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>| واصل</span>
          </div>
        </div>

        <div className="card" style={{ padding: "var(--space-8)" }}>
          <span className="eyebrow">{eyebrow}</span>

          <h1 style={{ fontSize: "var(--font-size-3xl)", fontWeight: 800, marginBottom: "var(--space-2)" }}>
            {title}
          </h1>

          <p
            style={{
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-6)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {subtitle}
          </p>

          {children}
        </div>
      </div>
    </div>
  );
}
