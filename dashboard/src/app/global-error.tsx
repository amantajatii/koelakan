"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#ecdfc5", color: "#2a2118", fontFamily: "Georgia, serif", display: "grid", minHeight: "100dvh", placeItems: "center", padding: "1rem", textAlign: "center" }}>
        <div role="alert">
          <h1 style={{ fontSize: "2rem" }}>Koelakan hit a snag.</h1>
          <p>Nothing on-chain was changed. Please try again.</p>
          <button type="button" onClick={reset} style={{ marginTop: "1rem", minHeight: 44, padding: "0 1.25rem", background: "#2a2118", color: "#faf4e4", border: 0, borderRadius: 6, fontWeight: 600 }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
