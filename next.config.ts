import type { NextConfig } from "next";

// Die Plattform ist durchgehend personalisiert (Login, RLS). Seiten werden deshalb
// pro Anfrage gerendert; Cache Components sind bewusst nicht aktiviert.
const nextConfig: NextConfig = {
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
