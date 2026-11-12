import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // A stray lockfile above the repo would otherwise be picked as the workspace root.
  turbopack: { root: import.meta.dirname },
};

export default config;
