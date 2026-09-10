import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly. Without this, Next walks up
  // looking for a lockfile and can lock onto an unrelated one it finds in
  // a parent folder (e.g. a stray package-lock.json sitting next to where
  // this repo was cloned), then tries to build against that folder's
  // files instead of this project's.
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      // A real monthly Ashed export (1,000+ rows) runs well past the 1MB
      // default - see src/app/upload/actions.ts, which is the only place
      // that body is read.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
