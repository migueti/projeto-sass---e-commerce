import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "app.github.dev", "*.app.github.dev"],
    },
  },
};

export default nextConfig;
