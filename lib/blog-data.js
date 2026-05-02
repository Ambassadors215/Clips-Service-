import { BLOG_POSTS as EXPORTED_POSTS } from "./blog-posts-export.js";

export { BLOG_CATEGORY_DEFS, getCategoryDef } from "./blog-categories.js";

/** @typedef {typeof EXPORTED_POSTS[number]} BlogPost */

export const BLOG_POSTS = EXPORTED_POSTS;
export const PAGE_SIZE = 12;

export function getSortedPosts() {
  return [...BLOG_POSTS].sort((a, b) =>
    String(b.datePublished || "").localeCompare(String(a.datePublished || ""))
  );
}

export function getPostBySlug(slug) {
  const s = String(slug || "").toLowerCase().trim();
  return BLOG_POSTS.find((p) => p.slug === s) || null;
}

/** @returns {BlogPost[]} */
export function postsInCategory(catSlug) {
  const c = String(catSlug || "").toLowerCase().trim();
  return getSortedPosts().filter((p) => String(p.category || "").toLowerCase() === c);
}

export function featuredPost(sorted) {
  return sorted.find((p) => p.featured) || sorted[0] || null;
}

export function paginateSlice(posts, page) {
  const p = Math.max(1, parseInt(String(page || "1"), 10) || 1);
  const start = (p - 1) * PAGE_SIZE;
  const slice = posts.slice(start, start + PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  return { page: p, slice, totalPages, total: posts.length };
}

export function categoriesUsedInPosts() {
  const out = [];
  const seen = new Set();
  for (const p of getSortedPosts()) {
    const c = String(p.category || "").toLowerCase().trim();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}
