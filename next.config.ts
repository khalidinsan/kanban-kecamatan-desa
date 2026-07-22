import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow multi-file uploads (~10MB each) via Server Actions FormData
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
