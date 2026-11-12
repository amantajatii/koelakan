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
};

export default config;
