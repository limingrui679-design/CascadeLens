import type { MetadataRoute } from "next";
import caseCatalog from "@/content/cases/catalog.json";

const base = "https://cascadelens.limingrui2.chatgpt.site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["", "/workbench", "/worldgraph", "/cases", "/benchmark", "/data", "/methodology", "/docs"];
  return [
    ...staticPaths.map((path) => ({ url: `${base}${path}`, lastModified: "2026-08-12" })),
    ...caseCatalog.cases.map((item) => ({ url: `${base}/cases/${item.slug}`, lastModified: "2026-08-12" })),
  ];
}
