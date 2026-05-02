import { siteUrl } from "../site-url.js";
import {
  categoriesUsedInPosts,
  featuredPost,
  getCategoryDef,
  getPostBySlug,
  getSortedPosts,
  paginateSlice,
  BLOG_CATEGORY_DEFS,
} from "../blog-data.js";
import { esc, jsonLdScript } from "../seo-html.js";

const ORG_PUBLISHER = "Clip Services Ltd";
const SCHEMA_AUTHOR = "Sonia Chidinma Otikpa";

function abs(base, p) {
  const x = String(p || "").startsWith("/") ? p : `/${p}`;
  return `${base}${x}`;
}

function lab(slug) {
  const d = getCategoryDef(slug);
  return d ? d.label : String(slug || "").replace(/-/g, " ");
}

function slugId(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 88);
}

function pillStrip(activeSlug) {
  const used = new Set(categoriesUsedInPosts());
  const rows = [{ slug: "", label: "All" }];
  for (const def of BLOG_CATEGORY_DEFS) if (used.has(def.slug)) rows.push(def);
  for (const s of used)
    if (!rows.some((r) => r.slug === s)) rows.push({ slug: s, label: lab(s) });
  return `<div class="blog-pills" role="toolbar" aria-label="Categories">${rows
    .map((r) => {
      const href = r.slug ? `/blog/category/${encodeURIComponent(r.slug)}` : "/blog";
      const sel = (!activeSlug && !r.slug) || r.slug === activeSlug;
      return `<a href="${href}"${sel ? ' class="is-active" aria-current="true"' : ""}>${esc(r.label)}</a>`;
    })
    .join("")}</div>`;
}

function cardHtml(p, base) {
  const src = esc(abs(base, p.featuredImage || "/icons/og-cover.svg"));
  const alt = esc(p.imageAlt || p.title);
  return `<article class="blog-card"><a class="blog-card-thumb" href="/blog/${esc(p.slug)}" tabindex="-1"><img loading="lazy" decoding="async" src="${src}" width="640" height="360" alt="${alt}"></a><div class="blog-card-body"><span class="blog-badge">${esc(
    lab(p.category)
  )}</span><h3><a href="/blog/${esc(p.slug)}">${esc(p.title)}</a></h3><p class="blog-excerpt">${esc(p.excerpt || p.metaDescription)}</p><p class="blog-card-more"><a class="blog-read-more" href="/blog/${esc(p.slug)}">Read more</a></p><div class="blog-card-meta">${Number(p.readMinutes) || "?"} min read · ${esc(
    p.datePublished
  )} · ${esc(p.author)}</div></div></article>`;
}

function pageHref(pathBase, n) {
  if (n <= 1) return pathBase;
  return `${pathBase}${pathBase.includes("?") ? "&" : "?"}page=${n}`;
}

function paginator(cur, tot, pb) {
  if (tot <= 1) return "";
  let s = `<nav class="blog-pagination">`;
  if (cur > 1) s += `<a href="${esc(pageHref(pb, cur - 1))}" rel="prev">← Prev</a>`;
  for (let i = 1; i <= tot; i++)
    s += i === cur ? `<span class="current">${i}</span>` : `<a href="${esc(pageHref(pb, i))}">${i}</a>`;
  if (cur < tot) s += `<a href="${esc(pageHref(pb, cur + 1))}" rel="next">Next →</a>`;
  return s + "</nav>";
}

function nw(next) {
  return `<section class="blog-newsletter" id="newsletter"><h2>Weekly newsletter</h2><p>Get our weekly newsletter — new stores, recipes, and cultural guides delivered every Friday.</p>
<form method="POST" action="/api/newsletter-signup" class="blog-newsletter-form"><input type="hidden" name="next" value="${esc(next)}" /><input name="firstName" type="text" maxlength="120" placeholder="First name (optional)" autocomplete="given-name" /><input name="email" type="email" required placeholder="Email" autocomplete="email" /><button class="blog-cta" type="submit" style="margin-top:0">Subscribe</button></form></section>`;
}

function notices(n) {
  if (n === "ok") return `<p role="status" class="blog-banner ok">Thanks — subscription saved.</p>`;
  if (n === "invalid") return `<p role="alert" class="blog-banner bad">Check your email address.</p>`;
  return "";
}

function heroFeatured(post, base) {
  const src = esc(abs(base, post.featuredImage || "/icons/og-cover.svg"));
  const alt = esc(post.imageAlt || post.title);
  const ex = String(post.excerpt || post.metaDescription || "").slice(0, 260);
  return `<section class="blog-hero"><span class="blog-hero-kicker">Featured</span><div class="blog-hero-card"><div class="blog-card-thumb"><a href="/blog/${esc(post.slug)}"><img src="${src}" alt="${alt}" loading="lazy" /></a></div><div class="blog-hero-body"><h2><a href="/blog/${esc(post.slug)}">${esc(post.title)}</a></h2><p>${esc(ex)}${ex.length >= 260 ? "…" : ""}</p><p class="blog-hero-meta">${Number(post.readMinutes) || "?"} min · ${esc(post.author)} · ${esc(
    post.datePublished
  )}</p><a class="blog-cta" href="/blog/${esc(post.slug)}">Read more</a></div></div></section>`;
}

function relatedMix(post, k) {
  const all = getSortedPosts().filter((p) => p.slug !== post.slug);
  const a = all.filter((p) => p.category === post.category);
  const b = all.filter((p) => p.category !== post.category);
  return [...a, ...b].slice(0, k);
}

function sendLanding(res, o) {
  const base = siteUrl();
  const banner = notices(o.newsletterFlag);
  const sorted = getSortedPosts();
  const feat = featuredPost(sorted);
  let list = sorted.filter((p) => (feat && !o.catSlug ? p.slug !== feat.slug : true));
  if (o.catSlug) list = list.filter((p) => String(p.category) === String(o.catSlug));

  const { slice: pageItems, totalPages, page } = paginateSlice(list, o.page);
  const pathBase = o.catSlug ? `/blog/category/${encodeURIComponent(o.catSlug)}` : "/blog";

  const hero = feat && !o.catSlug && page === 1 ? heroFeatured(feat, base) : "";

  const indexLd = jsonLdScript({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Clip Services Blog",
    url: `${base}${pathBase}`,
    publisher: {
      "@type": "Organization",
      name: ORG_PUBLISHER,
      logo: abs(base, "/icons/og-cover.svg"),
    },
  });

  const gridHtml = `<div class="blog-grid">${pageItems.map((p) => cardHtml(p, base)).join("")}</div>`;

  const html = `<!DOCTYPE html><html lang="en-GB" class="blog-page"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.titleTag)}</title><meta name="description" content="${esc(o.desc)}"><link rel="canonical" href="${base}${pathBase}">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/blog.css"><link rel="stylesheet" href="/css/global-search.css"><link rel="alternate" type="application/rss+xml" title="RSS" href="${base}/blog/rss.xml">
<meta property="og:title" content="${esc(o.titleTag)}"><meta property="og:description" content="${esc(o.desc)}"><meta property="og:url" content="${base}${pathBase}"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#8B3A3A">
${indexLd}</head><body><div id="global-search-mount"></div><div class="blog-max"><nav class="blog-nav"><a href="/" class="blog-logo">Clip Services</a><a href="/blog">Blog home</a><a href="/stores">Stores</a><a href="/search">Search</a><a href="/blog/feed">RSS feed</a></nav>
<h1 class="hero-index-h1">${esc(o.h1)}</h1><p class="blog-subhead-index">${esc(o.sub)}</p>${pillStrip(o.catSlug || "")}${banner}${hero}${gridHtml}${paginator(page, totalPages, pathBase)}${nw(pathBase)}</div>
<script src="/js/global-search.js" defer></script><script src="/js/clip-cookie.js" defer></script></body></html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}

function sendArticle(post, res) {
  const base = siteUrl();
  const canon = `${base}/blog/${encodeURIComponent(post.slug)}`;
  const imgAbs = abs(base, post.featuredImage || "/icons/og-cover.svg");

  const inner = post.sections
    .map((sec) => `<h2 id="${esc(slugId(sec.id || sec.h2))}">${esc(sec.h2)}</h2>${sec.html}`)
    .join("\n");

  const toc = `<nav class="blog-toc" aria-labelledby="tx"><h4 id="tx">On this page</h4><ul>${post.sections
    .map((s) => `<li><a href="#${esc(slugId(s.id || s.h2))}">${esc(s.h2)}</a></li>`)
    .join("")}</ul></nav>`;

  const stores =
    !(post.storesInArticle || []).length
      ? ""
      : `<div class="blog-sidebar-card"><h4>Stores &amp; pages</h4><ul>${(post.storesInArticle || [])
          .map((s) => `<li><a href="${esc(s.href)}">${esc(s.label)}</a></li>`)
          .join("")}</ul></div>`;

  const rel = relatedMix(post, 3).map((p) => cardHtml(p, base)).join("");
  const su = encodeURIComponent(canon);
  const st = encodeURIComponent(post.title);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.datePublished,
    dateModified: post.dateModified || post.datePublished,
    author: { "@type": "Person", name: SCHEMA_AUTHOR },
    publisher: {
      "@type": "Organization",
      name: ORG_PUBLISHER,
      logo: { "@type": "ImageObject", url: abs(base, "/icons/og-cover.svg") },
    },
    mainEntityOfPage: canon,
    image: imgAbs,
  };

  const html = `<!DOCTYPE html><html lang="en-GB" class="blog-page"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(post.title)} | Clip Services Blog</title><meta name="description" content="${esc(post.metaDescription)}"><link rel="canonical" href="${canon}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(post.title)}"><meta property="og:description" content="${esc(post.metaDescription)}"><meta property="og:url" content="${canon}"><meta property="og:image" content="${esc(imgAbs)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(post.title)}"><meta name="twitter:description" content="${esc(post.metaDescription)}"><meta name="twitter:image" content="${esc(imgAbs)}"><meta name="theme-color" content="#8B3A3A">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/blog.css"><link rel="stylesheet" href="/css/global-search.css"><link rel="alternate" type="application/rss+xml" href="${base}/blog/rss.xml">
${jsonLdScript(ld)}</head><body><div id="global-search-mount"></div><div class="blog-max"><nav class="blog-nav"><a href="/" class="blog-logo">Clip Services</a><a href="/blog">Blog home</a><a href="/stores">Stores</a><a href="/search">Search</a><a href="/blog/feed">RSS feed</a></nav>
<article class="blog-article-shell"><header class="blog-article-top"><span class="blog-badge">${esc(lab(post.category))}</span><h1>${esc(post.title)}</h1><p class="blog-article-meta">${esc(SCHEMA_AUTHOR)} · ${esc(
    post.datePublished
  )} · ${Number(post.readMinutes) || "?"} min read</p></header>
<div class="blog-hero-wide"><img loading="eager" src="${esc(imgAbs)}" alt="${esc(post.imageAlt || post.title)}" width="920" /></div>
<div class="blog-article-layout"><aside class="blog-sidebar">${toc}<div class="blog-sidebar-card"><h4>Author</h4><p class="blog-author">${esc(SCHEMA_AUTHOR)}, founder · ${esc(ORG_PUBLISHER)}.</p></div>${stores}</aside><div class="blog-article-main-col"><div class="blog-article-body">${inner}</div>
<div class="blog-share-wrap"><p class="blog-share-lead">Found this useful? Share with friends.</p><div class="blog-share"><a href="https://wa.me/?text=${st}%20${su}" rel="noopener noreferrer" target="_blank">Share on WhatsApp</a><a class="sec" href="https://twitter.com/intent/tweet?url=${su}&text=${st}" target="_blank" rel="noopener noreferrer">Post on X</a></div></div>
${nw(`/blog/${post.slug}`)}
<section class="blog-related"><h2 style="font-family:'Playfair Display',Georgia,serif;color:var(--blog-terracotta)">Related articles</h2><div class="blog-grid" style="margin-top:14px">${rel}</div></section></div></div></article></div>
<script src="/js/global-search.js" defer></script><script src="/js/clip-cookie.js" defer></script></body></html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const u = new URL(req.url || "/", "http://localhost");
  const slug = String(u.searchParams.get("slug") || "").trim();
  const blogCategory = String(u.searchParams.get("blogCategory") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(String(u.searchParams.get("page") || "1"), 10) || 1);
  const newsletterFlag = String(u.searchParams.get("newsletter") || "").trim();

  if (slug) {
    if (slug === "feed" || slug === "rss") {
      res.statusCode = 307;
      res.setHeader("location", "/blog/feed");
      res.end();
      return;
    }
    const p = getPostBySlug(slug);
    if (!p) {
      res.statusCode = 404;
      res.setHeader("content-type", "text/html");
      res.end('<!DOCTYPE html><html><body><p>Not found.</p><a href="/blog">Blog</a></body></html>');
      return;
    }
    sendArticle(p, res);
    return;
  }

  if (blogCategory) {
    const def = getCategoryDef(blogCategory);
    const hasPosts = getSortedPosts().some((p) => p.category === blogCategory);
    if (!def || !hasPosts) {
      res.statusCode = 404;
      res.setHeader("content-type", "text/html");
      res.end('<!DOCTYPE html><body><p>Category unavailable.</p><a href="/blog">Blog</a></body></html>');
      return;
    }

    sendLanding(res, {
      catSlug: blogCategory,
      page,
      newsletterFlag,
      titleTag: `${def.label} | Clip Services Blog`,
      desc: `${def.label} — African, Caribbean & Asian groceries in the UK.`,
      sub: `${def.label} — editorials from Clip Services.`,
      h1: def.label,
    });
    return;
  }

  sendLanding(res, {
    page,
    newsletterFlag,
    titleTag: "The Clip Services Blog — groceries, culture & UK cities",
    desc:
      "Guides linking African, Caribbean & Asian independents across the UK: Nigerian groceries online, Manchester stores map, Caribbean pantry essentials—all on Clip Services.",
    h1: "The Clip Services Blog",
    sub:
      "Stories, guides and recipes from African, Caribbean and Asian communities across the UK.",
  });
}
