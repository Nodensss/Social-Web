import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@toyverse/core", "@toyverse/db", "@toyverse/ai", "@toyverse/ui"],
};

export default nextConfig;
