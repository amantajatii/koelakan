import { ImageResponse } from "next/og";

export const alt = "Koelakan: small warung, wholesale prices";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#ecdfc5", color: "#2a2118", fontFamily: "Georgia, serif" }}>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, color: "#a82f1b", textTransform: "uppercase", fontWeight: 700 }}>kulakan = restocking from a wholesaler</div>
        <div style={{ display: "flex", flexWrap: "wrap", fontSize: 108, fontWeight: 700, lineHeight: 1.05, marginTop: 24 }}>
          <span>Small warung,&nbsp;</span><span style={{ color: "#a82f1b" }}>wholesale</span><span>&nbsp;prices.</span>
        </div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 36, color: "#5a4a38" }}>Pooled orders, sealed-bid auctions and escrow on NEAR testnet.</div>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, marginTop: 48 }}>Koelakan</div>
      </div>
    ),
    size,
  );
}
