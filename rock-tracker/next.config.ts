import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - Next.js type definitions sometimes lag behind Turbopack config options
  allowedDevOrigins: ['192.168.0.89', '192-168-0-89.nip.io', 'intended-flow-estimated-prospects.trycloudflare.com'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
