import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://cascadelens.limingrui2.chatgpt.site/sitemap.xml",
  };
}
