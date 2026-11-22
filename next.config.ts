import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las pruebas E2E usan su propia carpeta para convivir con un `next dev` abierto.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // Abajo a la izquierda tapaba "Inicio" en la barra inferior móvil.
  devIndicators: { position: "top-right" },
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
