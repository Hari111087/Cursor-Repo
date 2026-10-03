import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hari's Assistant",
    short_name: "Jarvis",
    description: "Personal AI assistant for time, email and markets.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0E27",
    theme_color: "#0A0E27",
    categories: ["productivity", "finance"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512?maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Email", url: "/email" },
      { name: "Markets", url: "/markets" },
      { name: "Time", url: "/time" },
    ],
  };
}
