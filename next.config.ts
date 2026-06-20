import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Netlify deployment
  output: "export",
  // Netlify serves from /out — no trailing slash needed
  trailingSlash: false,
};

export default nextConfig;
