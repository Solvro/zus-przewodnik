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
  // Osobny katalog dla `next dev` — `next build` nie nadpisuje plików działającego serwera deweloperskiego
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  // Poza wyszukiwarkami: nagłówek obejmuje też API, pliki i obrazy (nie tylko strony HTML)
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" }] }];
  },
};

export default nextConfig;
