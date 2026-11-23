import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mis Finanzas",
    short_name: "Mis Finanzas",
    description: "Tus cuentas, gastos, ahorros y presupuestos en un solo lugar.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#B91C1C",
    theme_color: "#B91C1C",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
