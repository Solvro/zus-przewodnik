import type { MetadataRoute } from "next";

/** Prototyp konkursowy — nie indeksujemy (bez mapy strony). */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
