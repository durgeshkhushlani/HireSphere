import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This worktree checkout has its own package-lock.json, separate from the
  // main checkout's — Turbopack otherwise guesses the wrong workspace root
  // when both are visible on disk.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
