import type { NextConfig } from "next";

const rootDir = process.cwd();

const nextConfig: NextConfig = {
  outputFileTracingRoot: rootDir,
  turbopack: {
    root: rootDir,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
};

export default nextConfig;
