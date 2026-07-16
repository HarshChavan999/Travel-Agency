import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude Firebase Admin SDK from bundling
  serverExternalPackages: ['firebase-admin'],
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;
