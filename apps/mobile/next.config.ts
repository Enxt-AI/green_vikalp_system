import path from "path";
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const apiProxy = process.env.API_PROXY_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  async rewrites() {
    return [
        { source: "/api/proxy/:path*", destination: `${apiProxy}/:path*` },
    ];
  },
};

// Next.js version mismatch in monorepo causes type conflicts with Serwist
export default withSerwist(nextConfig as any);
