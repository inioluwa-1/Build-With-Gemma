import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // An unrelated lockfile sits above this directory, which makes Turbopack
  // guess the wrong workspace root. Pin it.
  turbopack: { root: __dirname },
  // The pitch deck / landing is a self-contained static page in public/. Give
  // it a clean URL so the demo can be shown at /deck.
  async rewrites() {
    return [{ source: "/deck", destination: "/deck.html" }];
  },
};

export default nextConfig;
