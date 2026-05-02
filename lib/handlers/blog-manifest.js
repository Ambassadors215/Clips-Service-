import { categoriesUsedInPosts, getSortedPosts } from "../blog-data.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return;
  }

  const posts = getSortedPosts().map((p) => ({
    slug: p.slug,
    title: p.title,
    category: p.category,
    readMinutes: p.readMinutes,
    datePublished: p.datePublished,
    dateModified: p.dateModified || p.datePublished,
    featured: Boolean(p.featured),
    url: `/blog/${p.slug}`,
    excerpt: (p.excerpt || p.metaDescription || "").slice(0, 200),
  }));

  const body = JSON.stringify({
    ok: true,
    categories: categoriesUsedInPosts(),
    posts,
  });

  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=60, s-maxage=120");
  res.end(body);
}
