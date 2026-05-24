import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prevent Next.js from trying to bundle native modules — they must stay as-is
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
