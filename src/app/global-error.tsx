"use client";

import { useEffect } from "react";

// global-error.tsx replaces the root layout when the layout itself throws, so it
// must render its own <html>/<body> and can't rely on globals.css/Tailwind.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#13131F",
          color: "#F8F8FA",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "32rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "0.875rem", opacity: 0.7, marginBottom: "1rem" }}>
            The application hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "0.375rem",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
