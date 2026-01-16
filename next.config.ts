import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude Firebase Admin SDK from bundling
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
