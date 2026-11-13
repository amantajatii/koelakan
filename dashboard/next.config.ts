import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // A stray lockfile above the repo would otherwise be picked as the workspace root.
  turbopack: { root: import.meta.dirname },
  // The owner flow used to live at /try (and before that /coba).
  redirects: async () => [
    { source: "/try", destination: "/warung", permanent: true },
    { source: "/coba", destination: "/warung", permanent: true },
  ],
  // Baseline hardening. No full CSP yet: the wallet selector loads scripts and connects to many wallet
  // and RPC origins, and a wrong policy would silently break sign-in. Vercel already sends HSTS.
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      ],
    },
  ],
};

export default config;
