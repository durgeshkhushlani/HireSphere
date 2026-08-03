import type { NextConfig } from "next";

// Note: Turbopack prints a workspace-root warning on startup because this
// worktree checkout has its own package-lock.json alongside the main
// checkout's — cosmetic only, module resolution works correctly either way.
// An explicit `turbopack.root` override was tried and made things worse
// (broke resolution entirely), so leaving this alone.
const nextConfig: NextConfig = {
  // Local dev is accessed via 127.0.0.1 (see PROGRESS.md — localhost:3000
  // hits an unrelated process on this machine). Without this, Next blocks
  // the HMR websocket as cross-origin, so the dev client falls back to
  // full-page reloads instead of hot updates — wiping any client-side
  // animation/timer state (like the landing page's typewriter effect)
  // before it can ever progress.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
