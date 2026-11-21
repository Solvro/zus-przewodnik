import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // vercel-react-best-practices: bundle-barrel-imports — przekształca importy z „beczek” na bezpośrednie
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@radix-ui/react-tabs",
      "@tanstack/react-query",
    ],
  },
  poweredByHeader: false,
  devIndicators: false,
};

export default nextConfig;
