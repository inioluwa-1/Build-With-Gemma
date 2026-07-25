import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vernac — Official documents, in your true tongue",
    short_name: "Vernac",
    description:
      "Photograph any official document and read it in your own language. Where published rules exist, Vernac checks the numbers and shows the math.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF7F0",
    theme_color: "#F2C230",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
