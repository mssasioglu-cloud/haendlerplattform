import type { NextConfig } from "next";

// Die Plattform ist durchgehend personalisiert (Login, RLS). Seiten werden deshalb
// pro Anfrage gerendert; Cache Components sind bewusst nicht aktiviert.
const nextConfig: NextConfig = {
  // Nur im Vorschau-/Entwicklungsmodus: Browser-Anfragen an Supabase über die Website leiten.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_SUPABASE_PROXY !== "1") return [];
    return [{ source: "/sb/:path*", destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
