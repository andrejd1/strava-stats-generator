import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // This helps with hydration errors by suppressing during development
  experimental: {
    // Suppress hydration errors during development
    suppressHydrationWarning: true,
  },
};

export default nextConfig;
