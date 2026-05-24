import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // pdf-parse uses require() internally and must not be bundled by webpack
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
