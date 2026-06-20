import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Netlify deployment
  output: "export",
  // Netlify serves from /out — no trailing slash needed
  trailingSlash: false,
  // next/image requires unoptimized: true in static export mode
  // (the /_next/image optimization endpoint is not available in static builds)
  images: { unoptimized: true },
};

export default nextConfig;
