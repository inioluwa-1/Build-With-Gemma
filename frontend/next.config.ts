import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // An unrelated lockfile sits above this directory, which makes Turbopack
  // guess the wrong workspace root. Pin it.
  turbopack: { root: __dirname },
};

export default nextConfig;
