import { siteUrl } from "../site-url.js";
import { esc, jsonLdScript } from "../seo-html.js";
import { getSortedPosts } from "../blog-data.js";

/**
 * Friendly HTML landing for subscriptions. Raw feed stays at `/blog/rss.xml`
 * for readers; browsers show XML as “source code”, which confuses shoppers.
 */
export default function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const base = siteUrl();
  const xmlUrl = `${base}/blog/rss.xml`;
  const title = "Subscribe to blog updates — RSS";

  const ld = jsonLdScript({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: `${base}/blog/feed`,
    isPartOf: { "@type": "WebSite", name: "Clip Services", url: base },
    about: {
      "@type": "Blog",
      name: "Clip Services Blog",
      url: `${base}/blog`,
      blogPost: getSortedPosts()
        .slice(0, 8)
        .map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${base}/blog/${p.slug}` })),
    },
  });

  const html = `<!DOCTYPE html><html lang="en-GB" class="blog-page"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="Copy the Clip Services blog RSS URL into Apple News, Feedly, WhatsApp-compatible readers, or your browser bookmarks."><link rel="canonical" href="${base}/blog/feed">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/blog.css"><link rel="stylesheet" href="/css/global-search.css">
<link rel="alternate" type="application/rss+xml" title="Clip Services Blog" href="${esc(xmlUrl)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:url" content="${base}/blog/feed"><meta name="theme-color" content="#8B3A3A">
${ld}</head><body><div id="global-search-mount"></div><div class="blog-max">
<nav class="blog-nav"><a href="/" class="blog-logo">Clip Services</a><a href="/blog">Blog home</a><a href="/stores">Stores</a><a href="/search">Search</a><strong aria-current="page">RSS</strong></nav>
<section class="blog-feed-landing" aria-labelledby="feed-h"><h1 id="feed-h">Subscribe via RSS</h1>
<p class="blog-feed-lead">The link below is a <strong>machine-readable feed</strong> (RSS). Open it in Apple News, Feedly, Thunderbird, or paste the URL into any feed reader.</p>
<p class="blog-feed-note">If you opened <code>/blog/rss.xml</code> in Chrome or Edge, the page looks like “code” — that is normal for RSS. Use this page to copy the address, or open the feed in a reader app.</p>
<div class="blog-feed-card"><p class="blog-feed-label">Feed URL</p>
<div class="blog-feed-url-row"><code id="feed-url" class="blog-feed-url">${esc(xmlUrl)}</code><button type="button" class="blog-cta" id="copy-feed" aria-label="Copy feed URL">Copy link</button></div>
<p class="blog-feed-hint" id="copy-status" aria-live="polite" hidden></p>
<p class="blog-feed-actions"><a class="blog-cta" href="${esc(xmlUrl)}" target="_blank" rel="noopener">Open XML in new tab</a><a href="/blog">Back to blog</a></p></div></section></div>
<script>
(function(){var b=document.getElementById('copy-feed'),u=document.getElementById('feed-url'),s=document.getElementById('copy-status');
if(!b||!u)return;b.onclick=function(){var t=u.textContent;function ok(){if(s){s.hidden=false;s.textContent='Copied — paste into your feed reader';}}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(ok).catch(function(){fallback();});return;}
fallback();function fallback(){try{var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.left='-9999px';document.body.appendChild(a);a.select();document.execCommand('copy');document.body.removeChild(a);ok();}catch(e){if(s){s.hidden=false;s.textContent='Select the URL above and copy manually (Ctrl+C).';}}}}
})();
</script>
<script src="/js/global-search.js" defer></script><script src="/js/clip-cookie.js" defer></script></body></html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=300, s-maxage=900");
  res.end(html);
}
