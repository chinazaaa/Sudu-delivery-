import type { MetadataRoute } from "next";

/** Admin and the promoter portal are nobody's business but ours. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/promoter", "/o/", "/checkout", "/cart"],
    },
    // Both: the built one with every dish in it, and the hand written file
    // that is served straight off disk and cannot time out.
    sitemap: [
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store"}/sitemap.xml`,
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://sudu.store"}/sitemap-pages.xml`,
    ],
  };
}
