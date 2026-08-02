import type { NextConfig } from "next";

// Note: Turbopack prints a workspace-root warning on startup because this
// worktree checkout has its own package-lock.json alongside the main
// checkout's — cosmetic only, module resolution works correctly either way.
// An explicit `turbopack.root` override was tried and made things worse
// (broke resolution entirely), so leaving this alone.
const nextConfig: NextConfig = {};

export default nextConfig;
