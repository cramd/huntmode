import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling pdf-parse — it must run as a native Node.js module
  serverExternalPackages: ["pdf-parse"],
  async rewrites() {
    return [
      { source: "/blog", destination: "/blog/index.html" },
      { source: "/blog/", destination: "/blog/index.html" },
      { source: "/blog/category/:category/", destination: "/blog/category/:category/index.html" },
      { source: "/blog/category/:category", destination: "/blog/category/:category/index.html" },
      { source: "/blog/:slug/", destination: "/blog/:slug/index.html" },
      { source: "/blog/:slug", destination: "/blog/:slug/index.html" },
    ];
  },
  async headers() {
    return [
      {
        // Allow Firebase Auth popups to communicate with the parent window
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
