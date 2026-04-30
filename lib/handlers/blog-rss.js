import { siteUrl } from "../site-url.js";
import { BLOG_POSTS } from "../blog-data.js";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rfc822(dateStr) {
  const d = new Date(dateStr || Date.now());
  return Number.isFinite(d.getTime()) ? d.toUTCString() : new Date().toUTCString();
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }
  const base = siteUrl();
  const feedUrl = `${base}/blog/rss.xml`;
  const channelTitle = "Clip Services Blog";
  const channelDesc = "Stories from African, Caribbean & Asian independent retail in the UK.";
  const lastBuild = rfc822(
    BLOG_POSTS.reduce((latest, p) => {
      const t = new Date(p.datePublished || 0).getTime();
      return t > latest ? t : latest;
    }, 0) || Date.now()
  );

  const items = BLOG_POSTS.map((p) => {
    const link = `${base}/blog/${encodeURIComponent(p.slug)}`;
    const description = p.metaDescription || "";
    const author = p.author || "Sonia Otikpa";
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${rfc822(p.datePublished)}</pubDate>
      <description>${esc(description)}</description>
      <dc:creator>${esc(author)}</dc:creator>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(channelTitle)}</title>
    <link>${esc(`${base}/blog`)}</link>
    <description>${esc(channelDesc)}</description>
    <language>en-gb</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${esc(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  res.statusCode = 200;
  res.setHeader("content-type", "application/rss+xml; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=600, s-maxage=1800");
  res.end(xml);
}
