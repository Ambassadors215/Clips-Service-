import { siteUrl } from "../site-url.js";
import { BLOG_POSTS, getPostBySlug } from "../blog-data.js";
import { esc, jsonLdScript } from "../seo-html.js";

const OG = () => `${siteUrl()}/icons/og-cover.svg`;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const slug = String(url.searchParams.get("slug") || "").trim();

  if (!slug) {
    return indexPage(req, res);
  }

  const post = getPostBySlug(slug);
  if (!post) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html><html><head><title>Not found</title></head><body><p>Article not found.</p><p><a href="/blog">Blog</a></p></body></html>`);
    return;
  }

  const base = siteUrl();
  const pageUrl = `${base}/blog/${encodeURIComponent(post.slug)}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.datePublished,
    author: { "@type": "Person", name: post.author || "Sonia Otikpa" },
    publisher: {
      "@type": "Organization",
      name: "Clip Services",
      logo: { "@type": "ImageObject", url: `${base}/icons/og-cover.svg` },
    },
    mainEntityOfPage: pageUrl,
    image: OG(),
  };

  const body = post.sections
    .map((sec) => `<h2>${esc(sec.h2)}</h2>\n${sec.html}`)
    .join("\n");

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  const relatedHtml = related.length
    ? `<aside style="margin-top:48px;padding-top:24px;border-top:1px solid #E8DFD4">
<h2 style="font-size:1.2rem">Related articles</h2>
<ul style="list-style:none;padding:0;margin:14px 0 0">
${related
  .map(
    (p) => `<li style="margin-bottom:14px;padding:14px;background:#fff;border-radius:10px;border:1px solid #E8DFD4"><a href="/blog/${encodeURIComponent(p.slug)}" style="font-weight:700">${esc(p.title)}</a><br><span style="color:#5C4033;font-size:14px">${esc((p.metaDescription || "").slice(0, 140))}…</span></li>`
  )
  .join("")}
</ul>
</aside>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(post.title)} | Clip Services Blog</title>
<meta name="description" content="${esc(post.metaDescription)}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(post.metaDescription)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
<link rel="alternate" type="application/rss+xml" title="Clip Services Blog" href="${base}/blog/rss.xml">
${jsonLdScript(articleLd)}
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/global-search.css">
<style>body{font-family:Inter,system-ui,sans-serif;margin:0;color:#2C1810;background:#F5F0E8;line-height:1.7}main{max-width:720px;margin:0 auto;padding:24px}h1{font-family:"Playfair Display",Georgia,serif;color:#8B3A3A}h2{font-size:1.15rem;margin-top:28px;color:#5C4033}a{color:#8B3A3A;font-weight:600}</style>
</head>
<body>
<div id="global-search-mount"></div>
<main>
<p><a href="/">← Home</a> · <a href="/blog">Blog</a> · <a href="/stores">Stores</a> · <a href="/blog/rss.xml">RSS</a></p>
<article>
<h1>${esc(post.title)}</h1>
<p style="color:#5C4033;font-size:14px">${esc(post.datePublished)} · By ${esc(post.author || "Sonia Otikpa")}, Founder of Clip Services</p>
${body}
</article>
${relatedHtml}
</main>
<script src="/js/global-search.js" defer></script>
<script src="/js/clip-cookie.js" defer></script>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=300, s-maxage=600");
  res.end(html);
}

function indexPage(req, res) {
  const base = siteUrl();
  const pageUrl = `${base}/blog`;

  const list = BLOG_POSTS.map(
    (p) =>
      `<li style="margin-bottom:16px;padding:14px;background:#fff;border-radius:10px;border:1px solid #E8DFD4"><a href="/blog/${encodeURIComponent(p.slug)}" style="font-weight:700;font-size:1.1rem">${esc(p.title)}</a><br><span style="color:#5C4033;font-size:13px;display:block;margin:6px 0">${esc(p.datePublished)} · By ${esc(p.author || "Sonia Otikpa")}, Founder of Clip Services</span><span style="color:#5C4033;font-size:14px">${esc((p.metaDescription || "").slice(0, 160))}…</span></li>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clip Services Blog — Stories from African, Caribbean & Asian Independent Retail in the UK</title>
<meta name="description" content="Guides to African, Caribbean and Asian grocery shopping in the UK: cities, ingredients, halal, and independents on Clip Services.">
<link rel="canonical" href="${pageUrl}">
<link rel="alternate" type="application/rss+xml" title="Clip Services Blog" href="${base}/blog/rss.xml">
<meta property="og:type" content="website">
<meta property="og:title" content="Clip Services Blog">
<meta property="og:description" content="Food guides, city shopping tips, and community retail on Clip Services.">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG()}">
<meta name="theme-color" content="#8B3A3A">
<link rel="stylesheet" href="/css/global-search.css">
</head>
<body style="font-family:Inter,system-ui,sans-serif;margin:0;color:#2C1810;background:#F5F0E8;line-height:1.65">
<div id="global-search-mount"></div>
<main style="max-width:720px;margin:0 auto;padding:24px">
<p><a href="/">← Home</a> · <a href="/stores">Stores</a> · <a href="/blog/rss.xml">RSS</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A">Clip Services Blog — Stories from African, Caribbean &amp; Asian Independent Retail in the UK</h1>
<p>Practical guides for shopping African, Caribbean and Asian groceries online and in your city — with links to independents on Clip Services.</p>
<ul style="list-style:none;padding:0">${list}</ul>
</main>
<script src="/js/global-search.js" defer></script>
<script src="/js/clip-cookie.js" defer></script>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=300, s-maxage=600");
  res.end(html);
}
