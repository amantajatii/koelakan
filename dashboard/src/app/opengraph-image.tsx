import { ImageResponse } from "next/og";

export const alt = "Koelakan: small warung, wholesale prices";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#08694f", color: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 112, fontWeight: 800, lineHeight: 1.05 }}>Small warung, wholesale prices.</div>
        <div style={{ display: "flex", fontSize: 36, marginTop: 36, color: "#eaf8f2" }}>Pooled orders, sealed-bid auctions and escrow on NEAR testnet.</div>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800, marginTop: 56 }}>Koelakan</div>
      </div>
    ),
    size,
  );
}
