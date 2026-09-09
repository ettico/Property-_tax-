import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This project sits as a sibling folder inside the Geometrikal repo,
  // which has its own lockfile at the repo root. Without this, Next
  // infers the workspace root one level up and picks up that unrelated
  // app's files (e.g. its src/proxy.ts) during the build.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
