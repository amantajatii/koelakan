import { ImageResponse } from "next/og";
import { MARK_ARROW_PATH, MARK_TAG_PATH } from "@/components/layout/logo";

export const alt = "Koelakan: Warungs pool orders. Grosirs bid for them.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#1f1f2e", color: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>Warungs pool orders. Grosirs bid for them.</div>
        <div style={{ display: "flex", fontSize: 36, marginTop: 36, color: "#a3a3b5" }}>Group restocking for Indonesian warungs on NEAR testnet, priced against real PIHPS data.</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 56 }}>
          <svg width="88" height="88" viewBox="0 0 64 64" style={{ marginRight: 24 }}>
            <rect width="64" height="64" rx="16" fill="#2c2c3e" />
            <g transform="rotate(45 32 32)">
              <path d={MARK_TAG_PATH} fill="#d6f26b" stroke="#d6f26b" strokeWidth="2.5" strokeLinejoin="round" />
              <circle cx="32" cy="19.5" r="3" fill="#2c2c3e" />
            </g>
            <path d={MARK_ARROW_PATH} fill="#2c2c3e" stroke="#2c2c3e" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", background: "#d6f26b", color: "#1f1f2e", fontSize: 40, fontWeight: 800, padding: "12px 32px", borderRadius: 999 }}>Koelakan</div>
        </div>
      </div>
    ),
    size,
  );
}
