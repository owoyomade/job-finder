import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Job Finder – Canada",
    short_name: "Job Finder",
    description: "Swipe Canadian jobs, tailor your resume, write cover letters and prepare for interviews.",
    start_url: "/discover",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14283a",
    theme_color: "#14283a",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Discover jobs", url: "/discover" },
      { name: "My applications", url: "/applications" },
      { name: "Interview prep", url: "/interview" },
    ],
  };
}
