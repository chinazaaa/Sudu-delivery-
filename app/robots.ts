import type { MetadataRoute } from "next";

/** Admin and the promoter portal are nobody's business but ours. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/promoter", "/o/", "/checkout", "/cart"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store"}/sitemap.xml`,
  };
}
