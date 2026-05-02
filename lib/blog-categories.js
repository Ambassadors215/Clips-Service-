/** Category slugs aligned with URLs /blog/category/[slug]. */
export const BLOG_CATEGORY_DEFS = [
  { slug: "shopping-guides", label: "Shopping Guides" },
  { slug: "recipes", label: "Recipes" },
  { slug: "cultural-calendar", label: "Cultural Calendar" },
  { slug: "store-spotlights", label: "Store Spotlights" },
  { slug: "founder-stories", label: "Founder Stories" },
  { slug: "community-news", label: "Community News" },
];

/** @returns {typeof BLOG_CATEGORY_DEFS[0] | undefined} */
export function getCategoryDef(slug) {
  const s = String(slug || "").toLowerCase().trim();
  return BLOG_CATEGORY_DEFS.find((c) => c.slug === s);
}
