import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // não recriar AGENTS.md/CLAUDE.md automaticamente no `next dev`
  agentRules: false,
};

export default nextConfig;
