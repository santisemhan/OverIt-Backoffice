import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // The dev badge sits bottom-left, right on top of the account button of the rail.
  devIndicators: false,
  async redirects() {
    return [{ source: "/", destination: "/tracking/overview", permanent: false }];
  },
};

export default nextConfig;
