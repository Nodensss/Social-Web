/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@toyverse/ui", "@toyverse/core", "@toyverse/ai", "@toyverse/db"],
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  experimental: { typedRoutes: true },
};
export default nextConfig;
