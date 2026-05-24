import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Prevent Next.js from trying to bundle native modules — they must stay as-is
  // No native modules needed — Supabase is pure JS
};

export default nextConfig;
