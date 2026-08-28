import type { NextConfig } from "next";

const configuredServerActionOrigins = (process.env.SERVER_ACTION_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        "localhost:3002",
        "app.github.dev",
        "*.app.github.dev",
        ...configuredServerActionOrigins,
      ],
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
