"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#f4f4ef", color: "#1f1f2e", fontFamily: "system-ui, sans-serif", display: "grid", minHeight: "100dvh", placeItems: "center", padding: "1rem", textAlign: "center" }}>
        <div role="alert" style={{ background: "#fff", borderRadius: 20, padding: "2.5rem 2rem", maxWidth: 440, boxShadow: "0 1px 2px rgba(31,31,46,.04), 0 6px 18px rgba(31,31,46,.04)" }}>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: 0 }}>Koelakan hit a snag.</h1>
          <p style={{ color: "#686874" }}>This page failed to load. If you just sent a transaction, check your wallet or the rounds page before retrying.</p>
          <button type="button" onClick={reset} style={{ marginTop: "1rem", minHeight: 44, padding: "0 1.5rem", background: "#d6f26b", color: "#1f1f2e", border: 0, borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
