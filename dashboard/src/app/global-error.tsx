"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#eef6f2", color: "#0f2a22", fontFamily: "system-ui, sans-serif", display: "grid", minHeight: "100dvh", placeItems: "center", padding: "1rem", textAlign: "center" }}>
        <div role="alert" style={{ background: "#fff", border: "1px solid #e3ece8", borderRadius: 20, padding: "2.5rem 2rem", maxWidth: 440, boxShadow: "0 8px 24px rgba(15,42,34,.06)" }}>
          <h1 style={{ fontSize: "1.7rem", margin: 0 }}>Koelakan hit a snag.</h1>
          <p style={{ color: "#55665f" }}>Nothing on-chain was changed. Please try again.</p>
          <button type="button" onClick={reset} style={{ marginTop: "1rem", minHeight: 44, padding: "0 1.25rem", background: "#0a7f61", color: "#fff", border: 0, borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
