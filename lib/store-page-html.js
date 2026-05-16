/**
 * Full /stores/[slug] experience — conversion-focused layout (SSR + client cart/checkout).
 */
import { esc, jsonLdScript, slugify, publicStoreSlug } from "./seo-html.js";
import { inferPrimaryCommunity } from "./seo-data.js";
import { siteUrl } from "./site-url.js";
import { catalogPriceRowsForListing } from "./catalog-price-rows.js";

const CAT_LABELS = {
  all: "All",
  "fresh-produce": "Fresh Produce",
  "meat-fish": "Meat & Fish",
  groceries: "Groceries",
  snacks: "Snacks",
  drinks: "Drinks",
  "hair-beauty": "Hair & Beauty",
  fashion: "Fashion",
  halal: "Halal",
  spices: "Spices",
  frozen: "Frozen",
  default: "Groceries",
};

function labelForCategory(slug) {
  const k = String(slug || "")
    .toLowerCase()
    .trim();
  return CAT_LABELS[k] || k.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Other";
}

function normCatKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "groceries";
}

function waDigits(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "44" + d.slice(1);
  else if (d.length >= 10 && !d.startsWith("44")) d = "44" + d;
  return d.length >= 10 ? d : "";
}

/** Display + tel: href from stored WhatsApp digits (UK-focused). */
function ukPhoneDisplay(digits) {
  const d = String(digits || "").replace(/\D/g, "");
  if (!d.startsWith("44") || d.length < 12) return null;
  const r = d.slice(2).slice(0, 11);
  const display = "+44 " + r.slice(0, 4) + " " + r.slice(4, 7) + " " + r.slice(7);
  return { display: display.trim(), tel: "+" + d };
}

function prettyCommKey(k) {
  if (!k) return "African, Caribbean & Asian";
  return k
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function capPhoto(s, max = 120000) {
  if (typeof s !== "string" || !s.startsWith("data:")) return "";
  return s.length <= max ? s : "";
}

function productThumbUrl(sp) {
  const u = String(sp?.thumbUrl || sp?.imageUrl || "").trim();
  return /^https:\/\//i.test(u) ? u.slice(0, 800) : "";
}

function parsePriceNum(row) {
  if (typeof row?.priceNum === "number" && Number.isFinite(row.priceNum)) return row.priceNum;
  const n = parseFloat(String(row?.price ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function rowCompareAt(row) {
  if (typeof row?.compareAtNum === "number" && Number.isFinite(row.compareAtNum)) return row.compareAtNum;
  return 0;
}

function starRow(n) {
  const r = Math.min(5, Math.max(0, Math.round(Number(n) || 0)));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

export function buildStorePageHtml(listing, opts) {
  const base = opts.base || siteUrl();
  const mapsApiKey = String(opts?.mapsApiKey || "").trim();
  const similarStores = Array.isArray(opts.similarStores) ? opts.similarStores : [];
  const slug = publicStoreSlug(listing);
  const pageUrl = `${base}/stores/${encodeURIComponent(slug)}`;
  const name = listing.role || "Independent store";
  const city = typeof listing.city === "string" ? listing.city.trim() : "";
  const pc = inferPrimaryCommunity(listing);
  const commLabel = prettyCommKey(pc);
  const storeOpen = listing.storeOpen !== false;
  const priceList = catalogPriceRowsForListing(listing);
  const storeProducts = Array.isArray(listing.storeProducts) ? listing.storeProducts : [];
  const reviewsArr = Array.isArray(listing.reviews) ? listing.reviews : [];
  const bio = String(listing.bio || "").trim();
  const hours =
    typeof listing.openingHours === "string" && listing.openingHours.trim()
      ? listing.openingHours.trim()
      : "Hours confirmed when you order";
  const coverRaw = typeof listing.coverImageUrl === "string" ? listing.coverImageUrl.trim() : "";
  const heroImg =
    typeof listing.storePhotoData === "string" && listing.storePhotoData.startsWith("data:")
      ? listing.storePhotoData
      : coverRaw.startsWith("/")
        ? `${base}${coverRaw}`
        : /^https:\/\//i.test(coverRaw)
          ? coverRaw
          : "";
  const verified =
    listing.applicationStatus === "approved" ||
    listing.applicationStatus === "active" ||
    listing.applicationStatus === undefined ||
    listing.applicationStatus === null ||
    listing.applicationStatus === "";
  const wa = waDigits(listing.whatsappPhone);
  const waStoreUrl = wa ? `https://wa.me/${wa}?text=${encodeURIComponent("Hi — I'm browsing your Clip Services store and have a question.")}` : "";

  let sum = 0;
  let count = 0;
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviewsArr) {
    const rv = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
    sum += rv;
    count += 1;
    dist[rv] = (dist[rv] || 0) + 1;
  }
  const avgRating = count ? Math.round((sum / count) * 10) / 10 : 0;
  let mostHelpful = null;
  for (const r of reviewsArr) {
    if (!mostHelpful || String(r.text || "").length > String(mostHelpful.text || "").length) mostHelpful = r;
  }

  const products = priceList.map((row, i) => {
    const sp = storeProducts[i] || {};
    const cat = normCatKey(sp.category || row?.category || "groceries");
    const priceNum = parsePriceNum(row);
    const compareAtNum = rowCompareAt(row);
    const onSale = compareAtNum > priceNum + 1e-6;
    return {
      idx: i,
      item: String(row?.item || sp?.name || "").slice(0, 120),
      priceStr: String(row?.price || "").slice(0, 56),
      priceNum,
      compareAtNum: onSale ? compareAtNum : 0,
      onSale,
      inStock: sp.inStock !== false,
      featured: Boolean(sp.featured),
      lowStock: sp.lowStock === true,
      category: cat,
      description: String(sp.description || "").slice(0, 160),
      photoData: capPhoto(sp.photoData),
      thumbUrl: productThumbUrl(sp),
    };
  });

  const catSet = new Set(["all"]);
  products.forEach((p) => catSet.add(p.category));
  const filterCats = Array.from(catSet).filter((c) => c !== "all");
  filterCats.sort((a, b) => labelForCategory(a).localeCompare(labelForCategory(b)));
  const filterOrder = [
    "all",
    "fresh-produce",
    "meat-fish",
    "groceries",
    "snacks",
    "drinks",
    "hair-beauty",
    "fashion",
    "halal",
  ];
  const orderedFilters = ["all"];
  for (const k of filterOrder) {
    if (k !== "all" && catSet.has(k)) orderedFilters.push(k);
  }
  for (const k of filterCats) {
    if (!orderedFilters.includes(k)) orderedFilters.push(k);
  }

  const popularIdx = [];
  const seen = new Set();
  for (const p of products) {
    if (p.featured && p.inStock && popularIdx.length < 4 && !seen.has(p.idx)) {
      popularIdx.push(p.idx);
      seen.add(p.idx);
    }
  }
  for (const p of products) {
    if (popularIdx.length >= 4) break;
    if (p.inStock && !seen.has(p.idx)) {
      popularIdx.push(p.idx);
      seen.add(p.idx);
    }
  }

  const titleSeo = city
    ? `${esc(name)} — ${esc(city)} African, Caribbean & Asian Store | Order Online | Clip Services`
    : `${esc(name)} — Order Online | African, Caribbean & Asian Store | Clip Services`;
  const desc =
    `Order authentic ${commLabel.toLowerCase()} products from ${name}${city ? ` in ${city}` : ""}. ` +
    `Fresh groceries, halal, hair and beauty and more. Secure Stripe payments. Collect or get delivery.`;

  const ogImage = heroImg || `${base}/icons/clip-logo-full.svg`;
  const listingId = String(listing.id || "");

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${pageUrl}#business`,
        name,
        description: bio || desc,
        url: pageUrl,
        image: ogImage,
        address: { "@type": "PostalAddress", addressCountry: "GB", addressLocality: city || undefined },
        ...(count
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: String(avgRating),
                reviewCount: String(count),
              },
            }
          : {}),
      },
      ...products.slice(0, 5).map((p) => {
        const pslug = slugify(p.item);
        const productUrl = `${base}/store/${encodeURIComponent(listingId)}/p/${p.idx}/${pslug}`;
        return {
          "@type": "Product",
          name: p.item,
          url: productUrl,
          offers: {
            "@type": "Offer",
            priceCurrency: "GBP",
            price: String(p.priceNum || 0),
            availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: productUrl,
          },
        };
      }),
    ],
  };

  const closedBanner = storeOpen
    ? ""
    : `<div class="closed-strip" role="status">Orders are paused — this store is closed right now.</div>`;

  const openBadge = storeOpen
    ? `<span class="open-badge ok">🟢 Open now</span>`
    : `<span class="open-badge no">🔴 Closed — ${esc(hours.split(",")[0] || "see hours below")}</span>`;

  const ratingBlock =
    count > 0
      ? `<span class="rating-line" aria-label="Average ${avgRating} of 5">${starRow(avgRating)} <strong>${avgRating}</strong> · ${count} review${count === 1 ? "" : "s"}</span>`
      : `<span class="muted">New on Clip — reviews appear after orders</span>`;

  const heroImgTag = heroImg
    ? `<img class="hero-bg" src="${heroImg.replace(/"/g, "&quot;")}" alt="${esc(name)} — store photo" fetchpriority="high" />`
    : `<div class="hero-fallback" aria-hidden="true"></div>`;

  const descShort = bio.length > 220 ? `${esc(bio.slice(0, 220))}…` : esc(bio);
  const descFull = esc(bio);

  function cardHtml(p, popular) {
    const oos = !p.inStock;
    const pslug = slugify(p.item);
    const productHref = `/store/${encodeURIComponent(listingId)}/p/${p.idx}/${pslug}`;
    const searchBlob = esc(`${String(p.item)} ${String(p.description)}`.toLowerCase());
    const safeRemote = (p.thumbUrl || "").replace(/"/g, "&quot;").replace(/</g, "");
    const ph = p.photoData
      ? `<img class="pimg" src="${p.photoData.replace(/"/g, "&quot;")}" alt="${esc(p.item)}" loading="lazy" width="400" height="400" />`
      : p.thumbUrl
        ? `<img class="pimg" src="${safeRemote}" alt="${esc(p.item)}" loading="lazy" width="400" height="400" referrerpolicy="no-referrer"/>`
        : `<div class="pimg pholder" aria-hidden="true"></div>`;
    const urg =
      popular && p.featured
        ? `<span class="urg hot">🔥 Popular item</span>`
        : p.lowStock
          ? `<span class="urg low">⚠️ Low stock</span>`
          : "";
    const sale = p.compareAtNum > p.priceNum + 1e-6;
    const priceHtml = sale
      ? `<span class="pprice-was">£${p.compareAtNum.toFixed(2)}</span> <span class="pprice-hot">£${p.priceNum.toFixed(2)}</span> <span class="sale-chip" aria-label="Sale">SALE</span>`
      : esc(p.priceStr || `£${p.priceNum.toFixed(2)}`);
    return `<article class="pcard ${oos ? "oos" : ""}" data-idx="${p.idx}" data-cat="${esc(p.category)}" data-search="${searchBlob}">
  ${urg}
  ${oos ? `<span class="oos-badge">Out of stock</span>` : ""}
  <div class="pimg-wrap ${oos ? "dim" : ""}">${ph}</div>
  <h3 class="pname"><a class="pname-link" href="${esc(productHref)}">${esc(p.item)}</a></h3>
  <p class="pdetail-row"><a class="plink" href="${esc(productHref)}">Details &amp; larger photo →</a></p>
  <p class="pprice">${priceHtml}</p>
  <p class="pdesc">${esc(p.description)}</p>
  <div class="pactions">
    ${
      oos || !storeOpen
        ? `<button type="button" class="btn-add" disabled>Unavailable</button>`
        : `<div class="add-row" data-add-wrap="${p.idx}">
      <button type="button" class="btn-add" data-add="${p.idx}">+ Add</button>
      <div class="qty hidden" data-qty-row="${p.idx}">
        <button type="button" class="qbtn" data-dec="${p.idx}" aria-label="Decrease">−</button>
        <span class="qv" data-qty="${p.idx}">1</span>
        <button type="button" class="qbtn" data-inc="${p.idx}" aria-label="Increase">+</button>
      </div>
      <span class="added hidden" data-added="${p.idx}">Added ✓</span>
    </div>`
    }
  </div>
</article>`;
  }

  const popularHtml = popularIdx.length
    ? `<section class="pop-sec" aria-labelledby="pop-h"><h2 id="pop-h">Popular at this store</h2><div class="pgrid pop">${popularIdx
        .map((ix) => {
          const p = products.find((x) => x.idx === ix);
          return p ? cardHtml(p, true) : "";
        })
        .join("")}</div></section>`
    : "";

  const mainProducts = products.filter((p) => !popularIdx.includes(p.idx));
  const mainGrid = `<div class="pgrid main" id="catalogue">${mainProducts.map((p) => cardHtml(p, false)).join("")}</div>`;

  const filterPills = orderedFilters
    .map((k) => `<button type="button" class="fil-pill ${k === "all" ? "on" : ""}" data-filter="${esc(k)}">${esc(labelForCategory(k === "all" ? "all" : k))}</button>`)
    .join("");

  const reviewsSummary =
    count > 0
      ? `<div class="rev-sum">
  <div class="rev-big">${avgRating}<span class="muted small">/5</span></div>
  <div>${starRow(avgRating)}<div class="muted">${count} reviews</div></div>
  <div class="bars">${[5, 4, 3, 2, 1]
    .map((n) => {
      const c = dist[n] || 0;
      const pct = count ? Math.round((c / count) * 100) : 0;
      return `<div class="bar-row"><span>${n}★</span><div class="bar"><i style="width:${pct}%"></i></div><span>${c}</span></div>`;
    })
    .join("")}</div>
</div>`
      : "";

  const goldReview =
    mostHelpful && String(mostHelpful.text || "").trim()
      ? `<div class="gold-rev"><p class="stars">${starRow(mostHelpful.rating)}</p><p>${esc(String(mostHelpful.text))}</p><p class="muted">${esc(String(mostHelpful.customerFirstName || "Customer"))} · ${esc(String(mostHelpful.productName || ""))}</p></div>`
      : "";

  const reviewsList = reviewsArr.length
    ? reviewsArr
        .map((r) => {
          const reply =
            r.reply && String(r.reply).trim()
              ? `<p class="reply"><strong>Store:</strong> ${esc(String(r.reply))}</p>`
              : "";
          return `<div class="rev-item">
  <p class="stars">${starRow(r.rating)}</p>
  <p>${esc(String(r.text || ""))}</p>
  <p class="muted">${esc(String(r.customerFirstName || "Customer"))} · ${esc(String(r.productName || ""))} · ${esc(String(r.date || "").slice(0, 10))}</p>
  ${reply}
</div>`;
        })
        .join("")
    : `<p class="muted">Reviews appear here after customers order — thank you for supporting independents.</p>`;

  const similarHtml = similarStores.length
    ? `<section class="sim-sec"><h2>You might also like</h2><div class="sim-grid">${similarStores
        .map((s) => {
          const ss = publicStoreSlug(s);
          const sn = esc(s.role || "Store");
          const sc = esc(String(s.city || ""));
          const surl = `/stores/${encodeURIComponent(ss)}`;
          return `<article class="sim-card"><a href="${surl}"><div class="sim-ph"></div><h3>${sn}</h3><p class="muted">${sc}</p><span class="btn-mini">Shop now</span></a></article>`;
        })
        .join("")}</div></section>`
    : "";

  const tagLinks = [
    commLabel !== "African, Caribbean & Asian"
      ? `<a href="/community/${esc(pc || "african")}">${esc(commLabel)}</a>`
      : `<a href="/community/african">Community stores</a>`,
    city && opts.citySlug ? `<a href="/cities/${esc(opts.citySlug)}">${esc(city)}</a>` : "",
    `<a href="/categories/fresh-produce">Fresh produce</a>`,
    verified ? `<a href="/stores">Verified store</a>` : "",
    listing.deliveryEnabled !== false ? `<a href="/stores">Delivery available</a>` : "",
  ]
    .filter(Boolean)
    .slice(0, 12);

  const tagRow = tagLinks.length
    ? `<div class="tag-scroll">${tagLinks.map((t) => `<span class="tag-pill">${t}</span>`).join("")}</div>`
    : "";

  const announceText = storeOpen
    ? "Store updates & offers appear here — check opening hours below before you order."
    : "This store is not taking orders right now — you can still browse the shelf.";

  const phoneHelp = wa ? ukPhoneDisplay(wa) : null;
  const utilNeedHelpHtml = phoneHelp
    ? `<span class="mp-call"><span class="mp-hide-xs">Need help? Call </span><a href="tel:${esc(phoneHelp.tel)}">${esc(phoneHelp.display)}</a></span>`
    : waStoreUrl
      ? `<span class="mp-call"><a class="mp-wa" href="${esc(waStoreUrl)}" target="_blank" rel="noopener">WhatsApp the store</a></span>`
      : `<span class="mp-call mp-muted-help">Need help? Use the store buttons below.</span>`;

  const shopHashQr = `${pageUrl}#shop-h`;
  const footer5ColsHtml = [
    {
      t: "Fruit & vegetables",
      u: [
        ["/categories/fresh-produce", "Fresh produce"],
        ["/categories/meat-fish", "Meat & seafood"],
        [shopHashQr, "Shop this store"],
      ],
    },
    {
      t: "Bakery & pantry",
      u: [
        ["/categories/groceries", "Groceries"],
        ["/categories/spices", "Spices & seasonings"],
        ["/categories/snacks", "Snacks"],
      ],
    },
    {
      t: "Drinks & frozen",
      u: [
        ["/categories/drinks", "Drinks"],
        ["/categories/frozen", "Frozen foods"],
        ["/categories/halal", "Halal"],
      ],
    },
    {
      t: "Household & care",
      u: [
        ["/categories/hair-beauty", "Hair & beauty"],
        ["/categories/fashion", "Fashion"],
        ["/stores", "All stores"],
      ],
    },
    {
      t: "Your account",
      u: [
        ["/track-order", "Track an order"],
        ["/account", "My account"],
        ["/store-owner/dashboard", "Store dashboard"],
        ["/terms", "Return policy"],
        ["mailto:clipservices26@gmail.com", "Contact us"],
      ],
    },
  ]
    .map(
      (col) => `<div class="mp-foot-col">
  <h3 class="mp-foot-h">${esc(col.t)}</h3>
  ${col.u.map(([href, lab]) => `<a href="${esc(href)}">${esc(lab)}</a>`).join("")}
</div>`
    )
    .join("");

  const payStripHtml = `<div class="mp-foot-payments" aria-label="Payment processor">
  <span class="mp-foot-paylab">Payments by</span>
  <div class="mp-pay-badges">
    <span class="mp-pay-badge mp-pay-stripe">
      <svg width="44" height="18" viewBox="0 0 60 25" aria-hidden="true" focusable="false"><path d="M59.5 14.4c0-4.3-2.1-7.6-6-7.6-4 0-6.4 3.4-6.4 7.6 0 5 2.8 7.5 6.9 7.5 2 0 3.5-.5 4.7-1.1v-3.3c-1.2.6-2.5.9-4.2.9-1.7 0-3.2-.6-3.4-2.7h8.5c-.1-.1-.1-1-.1-1.3zm-8.5-1.6c0-2 1.2-2.8 2.4-2.8 1.1 0 2.3.8 2.3 2.8h-4.7zm-10.9-6c-1.7 0-2.7.8-3.3 1.4l-.2-1.1h-3.7v19.4l4.2-.9V21c.6.5 1.6 1 3.1 1 3.2 0 6-2.5 6-7.7 0-4.7-2.9-7.5-6.1-7.5zm-1 11.4c-1 0-1.6-.4-2-.8l0-6.5c.4-.5 1.1-.8 2-.8 1.6 0 2.6 1.7 2.6 4 0 2.4-1.1 4.1-2.6 4.1zM23 5.7l4.2-.9V1.4l-4.2.9v3.4zm0 1.3h4.2v14.4H23V7zm-4.5 1.2L18.2 7h-3.6v14.4h4.2v-9.7c1-1.3 2.7-1 3.2-.9V7c-.5-.2-2.5-.5-3.5 1.2zm-8.3-4.8L6.1 4.3l0 13.4c0 2.4 1.8 4.2 4.3 4.2 1.4 0 2.4-.3 3-.6V18c-.5.2-3.1.9-3.1-1.4v-5.6h3.1V7H10.2l0-3.6zM4.2 11c0-.7.6-1 1.5-1 1.4 0 3.1.4 4.4 1.1V7.2c-1.5-.6-3-.8-4.4-.8-3.6 0-6 1.9-6 5.1 0 4.9 6.8 4.1 6.8 6.2 0 .8-.7 1.1-1.7 1.1-1.5 0-3.5-.6-5-1.5v4c1.6.7 3.3 1 5 1 3.7 0 6.2-1.8 6.2-5.1 0-5.2-6.8-4.3-6.8-6.2z" fill="#635bff"/></svg>
    </span>
  </div>
  <span class="mp-foot-paynote">Card, Apple Pay &amp; Google Pay all handled on Stripe’s secure checkout.</span>
</div>`;

  const storeJson = JSON.stringify({
    id: listingId,
    slug,
    storeOpen,
    mapsApiKey,
    whatsappPhone: listing.whatsappPhone || "",
    deliveryChargeGbp: Number(listing.deliveryChargeGbp) || 0,
    deliveryRadiusMiles: Number(listing.deliveryRadiusMiles) || 0,
    deliveryEnabled: listing.deliveryEnabled !== false,
    collectionEnabled: listing.collectionEnabled !== false,
    minimumOrderGbp: Number(listing.minimumOrderGbp) || 0,
    priceList: products.map((p) => ({
      item: p.item,
      price:
        p.priceStr && String(p.priceStr).trim()
          ? p.priceStr
          : `£${(Number(p.priceNum) || 0).toFixed(2)}`,
      priceNum: Number(p.priceNum) || 0,
      compareAtNum: p.compareAtNum > p.priceNum ? p.compareAtNum : undefined,
      inStock: p.inStock,
    })),
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleSeo}</title>
<meta name="description" content="${esc(desc.slice(0, 320))}">
<link rel="canonical" href="${pageUrl}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(name.slice(0, 90))}">
<meta property="og:description" content="${esc(desc.slice(0, 300))}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="theme-color" content="#0f2744">
<link rel="manifest" href="/manifest.webmanifest">
<script>window.__CLIP_CHAT_CTX=${JSON.stringify({ page: "store", storeName: name })};try{if(/[?&]src=wa(?:&|$)/.test(location.search))sessionStorage.setItem("clipOrderSource","wa")}catch(_e){}</script>
<script src="/js/pwa-core.js" defer></script>
<script src="/js/clip-whatsapp-float.js" defer></script>
${jsonLdScript(structured)}
<style>
:root{--terracotta:#8B3A3A;--gold:#D4A017;--cream:#F5F0E8;--brown:#2C1810;--card:#fffdf8;--mp-navy:#0f2744;--oja-blue:#2563eb;--mp-border:#e5e7eb;--page-bg:#ffffff;--text-dark:#111827}
*{box-sizing:border-box}
.vh{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
body{margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;color:var(--brown);background:var(--page-bg);line-height:1.45;min-height:100vh}
.pname-link{text-decoration:none;color:inherit}
.pname-link:hover{color:var(--terracotta)}
.pdetail-row{margin:-6px 0 8px;font-size:.8rem;font-weight:500}
.plink{color:var(--terracotta);font-weight:600;text-decoration:none}
.plink:hover{text-decoration:underline}
a{color:var(--terracotta);font-weight:600;text-underline-offset:3px}
.mp-head{position:sticky;top:0;z-index:60;background:#fff;box-shadow:0 1px 0 var(--mp-border)}
.mp-announce{background:var(--mp-navy);color:#fff;text-align:center;padding:10px 20px;font-size:.8rem;font-weight:500;line-height:1.4}
.mp-announce p{margin:0 auto;max-width:960px}
.mp-util{font-size:.78rem;border-bottom:1px solid var(--mp-border);background:#fff;color:#374151}
.mp-util-inner{max-width:1240px;margin:0 auto;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.mp-util-nav{display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center}
.mp-util-nav a{color:#1f2937;font-weight:500;text-decoration:none;font-size:.8rem}
.mp-util-nav a:hover{color:var(--oja-blue);text-decoration:underline}
.mp-util-right{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;justify-content:flex-end;flex:1;min-width:0;font-size:.75rem;color:#6b7280}
.mp-shield{display:inline-flex;align-items:center;gap:8px;max-width:min(360px,100%)}
.mp-shield svg{flex-shrink:0;opacity:.85}
.mp-wa{color:var(--terracotta)!important;font-weight:700;white-space:nowrap}
.mp-muted-help{color:#9ca3af!important;font-weight:500!important}
.mp-locale{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:#374151;white-space:nowrap}
.mp-locale-sep{opacity:.35}
.mp-call a{color:var(--terracotta);font-weight:700;text-decoration:none}
.mp-call a:hover{text-decoration:underline}
@media(max-width:900px){.mp-hide-sm{display:none!important}}
@media(max-width:720px){.mp-hide-xs{display:none!important}}
@media(max-width:560px){.mp-hide-narrow{display:none!important}.mp-util-nav{gap:8px 12px}}
.mp-main{background:#fff;border-bottom:1px solid var(--mp-border)}
.mp-main-inner{max-width:1240px;margin:0 auto;padding:18px 20px 16px;display:grid;grid-template-columns:1fr;gap:14px;align-items:center}
@media(min-width:900px){.mp-main-inner{grid-template-columns:minmax(160px,260px) minmax(0,1fr) auto;gap:24px;align-items:center}}
.mp-brand{display:flex;align-items:flex-start;gap:12px;text-decoration:none;color:inherit;min-width:0}
.mp-logo-mark{flex-shrink:0;margin-top:2px}
.mp-brand-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.mp-brand-name{font-family:"Playfair Display",Georgia,serif;font-weight:800;font-size:clamp(1.2rem,2.6vw,1.45rem);color:var(--terracotta);line-height:1.15}
.mp-brand-tag{font-size:.72rem;color:#6b7280;font-weight:500;line-height:1.3}
.mp-search input{width:100%;padding:12px 16px 12px 44px;border:1px solid var(--mp-border);border-radius:10px;font:inherit;font-size:.95rem;background:#f3f4f6 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-4-4'/%3E%3C/svg%3E") no-repeat 14px center;background-size:18px}
.mp-search input:focus{outline:2px solid rgba(37,99,235,.25);border-color:var(--oja-blue);background-color:#fff}
.mp-actions{display:flex;align-items:center;gap:10px;flex-shrink:0;justify-content:flex-end;flex-wrap:wrap}
.mp-user{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;border:1px solid var(--mp-border);color:#4b5563;text-decoration:none;background:#fafafa}
.mp-user:hover{border-color:var(--oja-blue);color:var(--oja-blue)}
.mp-user svg{display:block}
.mp-acc-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:999px;border:1.5px solid var(--mp-navy);color:var(--mp-navy);background:#fff;font-weight:700;font-size:.85rem;text-decoration:none;line-height:1;white-space:nowrap}
.mp-acc-btn:hover{background:var(--mp-navy);color:#fff;text-decoration:none}
.mp-acc-btn svg{width:18px;height:18px;flex-shrink:0}
.mp-store-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:999px;background:var(--terracotta);color:#fff;font-weight:700;font-size:.85rem;text-decoration:none;line-height:1;white-space:nowrap}
.mp-store-btn:hover{background:#6B2E2E;color:#fff;text-decoration:none}
@media(max-width:560px){.mp-acc-label{display:none}.mp-acc-btn{padding:9px 11px}.mp-acc-btn svg{width:20px;height:20px}}
@media(max-width:480px){.mp-store-btn-label-full{display:none}.mp-store-btn-label-short{display:inline}}
.mp-store-btn-label-short{display:none}
.mp-all-stores{font-size:.82rem;color:#4b5563;text-decoration:none;font-weight:600}
.mp-all-stores:hover{color:var(--terracotta)}
.mp-basket-total{font-weight:800;font-size:1.05rem;color:var(--text-dark);min-width:3.5ch;text-align:right}
.mp-cart-btn.nav-cart{padding:8px 12px;border-radius:10px;border-color:#e5e7eb}
.mp-cart-icon{font-size:1.15rem}
.mp-cat-nav{background:#fff;border-bottom:1px solid var(--mp-border)}
.mp-cat-nav-inner{max-width:1240px;margin:0 auto;padding:8px 20px 14px;display:flex;flex-direction:column;gap:12px}
@media(min-width:960px){.mp-cat-nav-inner{flex-direction:row;align-items:center;gap:20px}}
.mp-all-cat-block{display:flex;flex-direction:column;align-items:flex-start;gap:6px;flex-shrink:0}
.mp-all-cat-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:var(--oja-blue);color:#fff;border:none;border-radius:8px;padding:11px 16px;font-weight:800;font-size:.68rem;letter-spacing:.05em;cursor:pointer;text-transform:uppercase;font-family:inherit;box-shadow:0 2px 6px rgba(37,99,235,.35)}
.mp-all-cat-btn:hover{filter:brightness(1.06)}
.mp-all-cat-btn .mp-ham{font-size:1rem;line-height:1;opacity:.95}
.mp-all-cat-btn .mp-chev{font-size:.65rem;opacity:.9}
.mp-prod-total{font-size:.62rem;font-weight:800;letter-spacing:.06em;color:#9ca3af;text-transform:uppercase;white-space:nowrap;padding-left:4px}
.mp-cat-links{flex:1;min-width:0;display:flex;gap:4px 0;overflow-x:auto;padding:4px 0;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.mp-cat-links .fil-pill{flex-shrink:0;border:none;background:transparent;border-radius:0;padding:10px 12px;font-size:.68rem;font-weight:800;cursor:pointer;color:#111827;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.mp-cat-links .fil-pill:hover{color:var(--oja-blue)}
.mp-cat-links .fil-pill.on{color:var(--oja-blue);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:6px}
.layout{display:grid;grid-template-columns:1fr;gap:0;max-width:1180px;margin:0 auto;padding:0 16px 100px}
@media(min-width:960px){.layout{padding-bottom:40px}}
.nav-cart{position:relative;border:2px solid var(--terracotta);background:#fff;color:var(--terracotta);border-radius:12px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:.95rem;display:inline-flex;align-items:center;gap:6px;font-family:inherit}
.nav-cart .nb{position:absolute;top:-7px;right:-7px;min-width:20px;height:20px;border-radius:999px;background:#e11d48;color:#fff;font-size:.68rem;display:flex;align-items:center;justify-content:center;font-weight:800;border:2px solid #fff}
.return-ban{background:linear-gradient(90deg,rgba(212,160,23,.35),rgba(139,58,58,.12));border-bottom:1px solid rgba(139,58,58,.2);padding:10px 16px;font-size:.9rem;display:none;align-items:center;justify-content:space-between;gap:12px;max-width:1180px;margin:0 auto}
.return-ban.show{display:flex}
.drawer-scrim{position:fixed;inset:0;background:rgba(44,24,16,.45);z-index:150;display:none}
.drawer-scrim.open{display:block}
.basket-drawer{position:fixed;top:0;right:0;width:100%;max-width:420px;height:100%;background:var(--card);z-index:160;box-shadow:-8px 0 40px rgba(0,0,0,.15);transform:translateX(105%);transition:transform .28s ease;display:flex;flex-direction:column}
.basket-drawer.open{transform:translateX(0)}@media(max-width:540px){.basket-drawer{max-width:100%}}
.basket-drawer-h{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid rgba(139,58,58,.15);font-family:"Playfair Display",serif;font-size:1.2rem;color:var(--terracotta)}
.basket-drawer-body{flex:1;overflow-y:auto;padding:12px 18px 24px}
.min-bar{height:8px;background:#ede6dc;border-radius:6px;overflow:hidden;margin:8px 0}
.min-bar i{display:block;height:100%;background:var(--terracotta);width:0;transition:width .2s}
.trust-cta{margin:12px 0;padding:10px;text-align:center;font-size:.88rem;color:#5c4033}
.btn-add.added-flash{background:#15803d!important;color:#fff!important}
.dlg-b .pac-container{z-index:300}
.hero-full{position:relative;min-height:min(52vh,420px);border-radius:0 0 24px 24px;overflow:hidden;background:#5c2626}
.hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.hero-fallback{position:absolute;inset:0;background:linear-gradient(135deg,#8B3A3A 0%,#5c2626 100%)}
.hero-full .veil{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(44,24,16,.4) 0%,rgba(44,24,16,.78) 100%)}
.hero-inner{position:relative;z-index:2;max-width:1180px;margin:0 auto;padding:28px 20px 36px;display:flex;align-items:flex-end;min-height:min(52vh,420px)}
.hero-card{background:rgba(255,253,248,.94);border-radius:18px;padding:20px 22px;max-width:560px;box-shadow:0 12px 40px rgba(44,24,16,.18);border:1px solid rgba(139,58,58,.2)}
.hero-card h1{font-family:"Playfair Display",Georgia,serif;font-size:clamp(1.5rem,4vw,2rem);margin:0 0 8px;color:var(--terracotta);line-height:1.15}
.badge-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 12px;font-size:.88rem}
.chip{display:inline-flex;align-items:center;gap:4px;background:var(--cream);border:1px solid rgba(139,58,58,.25);padding:4px 10px;border-radius:999px;font-size:.78rem;font-weight:600}
.chip.ver{background:rgba(212,160,23,.2);border-color:var(--gold);color:var(--brown)}
.open-badge.ok{color:#15803d;font-weight:700}
.open-badge.no{color:#b91c1c;font-weight:700}
.rating-line{font-size:.95rem}
.sticky-fil{display:none}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.btn-pr{background:var(--terracotta);color:#fff;border:none;padding:12px 20px;border-radius:12px;font-weight:700;cursor:pointer;font-size:1rem}
.btn-pr:hover{filter:brightness(1.05)}
.btn-sec{background:transparent;color:var(--terracotta);border:2px solid var(--terracotta);padding:10px 18px;border-radius:12px;font-weight:700;cursor:pointer;font-size:1rem;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.save-store-btn{transition:background .15s,color .15s,border-color .15s}
.save-store-btn[aria-pressed="true"]{background:var(--terracotta);color:#fff}
.save-store-btn[aria-pressed="true"] .ss-heart{color:#fff}
.save-store-btn .ss-heart{font-size:1.2rem;line-height:1}
.save-store-btn[aria-pressed="true"] .ss-heart::before{content:"♥";position:absolute}
.save-store-btn[disabled]{opacity:.65;cursor:wait}
.closed-strip{background:#7f1d1d;color:#fff;text-align:center;padding:12px;font-weight:600}
.desc-card{background:var(--card);border-radius:16px;padding:18px 20px;margin:20px 0;border:1px solid rgba(139,58,58,.15)}
.story-h{font-family:"Playfair Display",Georgia,serif;color:var(--terracotta);font-size:1.18rem;margin:0 0 12px;line-height:1.2}
.desc-card p{margin:0;white-space:pre-wrap}
.read-tog{background:none;border:none;color:var(--terracotta);font-weight:700;cursor:pointer;padding:8px 0;font-size:.95rem}
.ful-bar{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0;padding:14px;background:var(--card);border-radius:14px;border:1px solid rgba(139,58,58,.15)}
.ful-opt{flex:1;min-width:140px;border:2px solid rgba(139,58,58,.2);border-radius:12px;padding:12px;cursor:pointer;background:#fff;text-align:left;font:inherit}
.ful-opt.on{border-color:var(--terracotta);background:rgba(139,58,58,.06)}
.ful-opt strong{display:block;color:var(--terracotta)}
.sticky-fil{display:none}
h2{font-family:"Playfair Display",Georgia,serif;color:var(--terracotta);font-size:1.35rem;margin:24px 0 12px}
.pop-sec h2{margin-top:8px}
.pgrid{display:grid;gap:14px;grid-template-columns:1fr}
@media(min-width:600px){.pgrid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.pgrid.main{grid-template-columns:repeat(3,1fr)}}
.pcard{background:var(--card);border-radius:14px;padding:12px;border:1px solid rgba(139,58,58,.12);position:relative;display:flex;flex-direction:column}
.pcard.oos{opacity:.92}
.pimg-wrap{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1;background:#ede6dc}
.pimg{width:100%;height:100%;object-fit:cover;display:block}
.pholder{width:100%;height:100%;background:linear-gradient(135deg,#e8dfd4,#ddd2c4)}
.pname{font-size:1rem;margin:10px 0 4px;line-height:1.25}
.pprice{font-weight:800;color:var(--terracotta);margin:0 0 6px;font-size:1.1rem;display:flex;flex-wrap:wrap;align-items:center;gap:8px;line-height:1.3}
.pprice-was{text-decoration:line-through;color:#78716c;font-weight:700;font-size:.92rem}
.pprice-hot{font-size:1.15rem;color:var(--terracotta);font-weight:800}
.sale-chip{display:inline-flex;align-items:center;background:#fde047;color:#713f12;font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:3px 8px;border-radius:6px}
.pdesc{font-size:.86rem;color:#5c4033;margin:0 0 10px;min-height:2.4em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.oos-badge{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.65);color:#fff;font-size:.72rem;padding:4px 8px;border-radius:6px;z-index:2}
.urg{position:absolute;top:10px;right:10px;font-size:.72rem;font-weight:700;z-index:2;padding:4px 8px;border-radius:6px}
.urg.hot{background:rgba(212,160,23,.95);color:var(--brown)}
.urg.low{background:rgba(185,28,28,.9);color:#fff}
.pimg.dim{filter:grayscale(.4) brightness(.92)}
.btn-add{width:100%;background:var(--terracotta);color:#fff;border:none;padding:11px;border-radius:10px;font-weight:700;cursor:pointer;font-size:.95rem}
.btn-add:disabled{opacity:.45;cursor:not-allowed}
.add-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%}
.qty{display:flex;align-items:center;gap:6px;border:2px solid var(--terracotta);border-radius:10px;padding:4px 8px;background:#fff}
.qty.hidden,.added.hidden{display:none!important}
.qbtn{width:32px;height:32px;border:none;background:var(--cream);border-radius:8px;font-size:1.1rem;cursor:pointer;font-weight:700;color:var(--terracotta)}
.qv{min-width:24px;text-align:center;font-weight:700}
.added{font-size:.82rem;color:#15803d;font-weight:700}
.basket-panel{background:var(--card);border:1px solid rgba(139,58,58,.2);border-radius:16px;padding:16px;position:sticky;top:16px}
.basket-panel h3{margin:0 0 12px;font-family:"Playfair Display",Georgia,serif;color:var(--terracotta);font-size:1.15rem}
.bline{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid rgba(139,58,58,.1);font-size:.88rem}
.bline img{width:48px;height:48px;object-fit:cover;border-radius:8px;background:#ede6dc}
.basket-empty{text-align:center;padding:24px 12px;color:#5c4033;font-size:.95rem}
.mob-dock{display:none;position:fixed;left:0;right:0;bottom:0;z-index:100;background:linear-gradient(180deg,#fffdf8,var(--cream));border-top:2px solid var(--gold);padding:10px 14px 16px;box-shadow:0 -8px 28px rgba(44,24,16,.12)}
@media(max-width:959px){.mob-dock{display:block}.desk-basket{display:none}}
.mob-dock-inner{max-width:1180px;margin:0 auto;display:flex;gap:10px;align-items:center;justify-content:space-between}
.mob-dock .btn-pr{flex:1;text-align:center;padding:14px;border-radius:12px;text-decoration:none}
.checkout-steps{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.checkout-steps i{font-style:normal;font-size:.72rem;background:var(--cream);padding:4px 8px;border-radius:6px;font-weight:600}
.checkout-steps i.on{background:var(--terracotta);color:#fff}
dialog{border:none;border-radius:18px;padding:0;width:min(440px,calc(100vw - 20px));max-width:calc(100% - 20px);background:var(--card);color:var(--brown);box-shadow:0 20px 60px rgba(0,0,0,.25);margin:auto}
dialog::backdrop{background:rgba(44,24,16,.5)}
.dlg-h{background:var(--terracotta);color:#fff;padding:16px 18px;font-family:"Playfair Display",Georgia,serif;font-size:1.2rem}
.dlg-b{padding:16px 18px 22px;max-height:min(74vh,calc(100dvh - 120px));overflow-y:auto}
.pay-copy{font-size:1rem;line-height:1.5;color:var(--brown)}
#chk-next,#chk-pay,#chk-back,.proceed-full{min-height:48px}
.dlg-b label{display:block;font-size:.78rem;font-weight:600;margin-bottom:4px;color:#5c4033}
.dlg-b input,.dlg-b textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(139,58,58,.35);font:inherit;margin-bottom:10px}
.dlg-b .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.err{color:#b91c1c;font-size:.88rem;min-height:1.2em;margin-top:6px}
.rev-sum{display:grid;gap:16px;margin-bottom:16px}
@media(min-width:600px){.rev-sum{grid-template-columns:120px 1fr 1fr;align-items:start}}
.rev-big{font-size:2.5rem;font-weight:800;color:var(--terracotta);font-family:"Playfair Display",serif}
.bars{font-size:.82rem}
.bar-row{display:flex;align-items:center;gap:8px;margin:4px 0}
.bar-row .bar{flex:1;height:8px;background:#ede6dc;border-radius:4px;overflow:hidden}
.bar-row .bar i{display:block;height:100%;background:var(--gold)}
.gold-rev{background:linear-gradient(135deg,rgba(212,160,23,.25),rgba(212,160,23,.08));border:1px solid rgba(212,160,23,.5);border-radius:14px;padding:16px;margin-bottom:16px}
.rev-item{border-bottom:1px solid rgba(139,58,58,.15);padding:14px 0}
.rev-item .stars{letter-spacing:2px;color:var(--gold);margin:0 0 6px}
.reply{margin-top:10px;padding:10px;background:rgba(139,58,58,.06);border-radius:8px;font-size:.9rem}
.sim-grid{display:grid;gap:12px;grid-template-columns:1fr}
@media(min-width:520px){.sim-grid{grid-template-columns:repeat(3,1fr)}}
.sim-card a{text-decoration:none;color:inherit;display:block;background:var(--card);border-radius:12px;padding:12px;border:1px solid rgba(139,58,58,.12);height:100%}
.sim-ph{aspect-ratio:4/3;background:linear-gradient(135deg,#e8dfd4,#d4c4b0);border-radius:8px;margin-bottom:8px}
.sim-card h3{margin:8px 0 4px;font-size:1rem}
.btn-mini{display:inline-block;margin-top:8px;font-size:.82rem;font-weight:700;color:var(--terracotta)}
.tag-scroll{display:flex;gap:8px;overflow-x:auto;padding:12px 0 24px;scrollbar-width:thin}
.tag-pill{flex-shrink:0}
.tag-pill a{white-space:nowrap;display:inline-block;padding:6px 12px;background:#fff;border:1px solid rgba(139,58,58,.2);border-radius:999px;font-size:.82rem;text-decoration:none}
.mp-foot{background:#fafafa;border-top:1px solid var(--mp-border);margin-top:56px;color:#4b5563;font-size:.88rem}
.mp-foot-grid{max-width:1240px;margin:0 auto;padding:44px 20px 32px;display:grid;grid-template-columns:1fr;gap:32px}
@media(min-width:640px){.mp-foot-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.mp-foot-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
.mp-foot-col{min-width:0}
.mp-foot-h{font-size:.69rem;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--text-dark);margin:0 0 14px}
.mp-foot a{display:block;color:#4b5563;font-weight:500;text-decoration:none;margin-bottom:10px;font-size:.84rem;padding:0}
.mp-foot a:hover{color:var(--oja-blue)}
.mp-foot-payments{max-width:1240px;margin:0 auto;padding:0 20px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;justify-content:center;border-bottom:1px solid var(--mp-border)}
.mp-foot-paylab{font-size:.75rem;color:#9ca3af;font-weight:600}
.mp-foot-paynote{font-size:.72rem;color:#9ca3af;font-weight:500;max-width:520px;text-align:center}
.mp-pay-badges{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center}
.mp-pay-badge{font-size:.65rem;font-weight:700;color:#9ca3af;border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;letter-spacing:.04em;background:#fff;display:inline-flex;align-items:center;gap:6px}
.mp-pay-stripe{padding:5px 12px}
.mp-pay-stripe svg{display:block}
.mp-foot-bar{max-width:1240px;margin:0 auto;padding:18px 20px;display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;font-size:.76rem;color:#9ca3af}
.mp-foot-legal{display:flex;flex-wrap:wrap;gap:14px 18px;align-items:center}
.mp-foot-legal a{color:#6b7280;font-weight:600}
.mp-back-top{position:fixed;right:18px;bottom:88px;z-index:55;width:44px;height:44px;border-radius:999px;border:1px solid var(--mp-border);background:#fff;color:#374151;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.12);font-size:1.1rem;line-height:1;display:flex;align-items:center;justify-content:center}
.mp-back-top:hover{background:var(--oja-blue);color:#fff;border-color:var(--oja-blue)}
@media(min-width:960px){.mp-back-top{bottom:28px}}
.ft-banner{display:none}
.muted{color:#5c4033}
.small{font-size:.85rem}
.nav-top{padding:12px 16px;font-size:.9rem;max-width:1180px;margin:0 auto}
#main-col{min-width:0}
.hidden{display:none!important}
.btn-add.hidden{display:none!important}
.qty.hidden,.added.hidden{display:none!important}
/* Dim only — do not pointer-events:none: taps never reach JS, so carts look “dead” when navigator fires offline falsely. Alerts still gate add/pay. */
html.clip-offline .btn-add,html.clip-offline #proceed-checkout-drawer,html.clip-offline #open-basket-mob,html.clip-offline #nav-basket{opacity:.55}
</style>
</head>
<body>
<div class="mp-head">
<div class="mp-announce" role="region" aria-label="Store notice">
  <p>${esc(announceText)}</p>
</div>
<div class="mp-util">
  <div class="mp-util-inner">
    <nav class="mp-util-nav" aria-label="Quick links">
      <a href="/terms">Return policy</a>
      <a href="/track-order">Order tracking</a>
      <a href="/account#signin">Sign in</a>
      <a href="/account#register">Create account</a>
      <a href="/account">My account</a>
      <a href="mailto:clipservices26@gmail.com">Contact</a>
    </nav>
    <div class="mp-util-right">
      <span class="mp-shield mp-hide-xs">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V7l8-4z" stroke="#6b7280" stroke-width="1.5"/></svg>
        <span>100% secure checkout — you pay on Stripe; the store packs your order.</span>
      </span>
      ${utilNeedHelpHtml}
      <span class="mp-locale"><span>English</span><span class="mp-locale-sep">|</span><span>GBP</span></span>
    </div>
  </div>
</div>
<header class="mp-main" role="banner">
  <div class="mp-main-inner">
    <a class="mp-brand" href="${esc(pageUrl)}">
      <span class="mp-logo-mark" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="10" width="32" height="22" rx="3" fill="#F5F0E8" stroke="#8B3A3A" stroke-width="1.5"/>
          <path d="M8 18h24M12 26h8" stroke="#8B3A3A" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M20 4v7" stroke="#D4A017" stroke-width="2" stroke-linecap="round"/>
          <circle cx="20" cy="4" r="2" fill="#D4A017"/>
        </svg>
      </span>
      <span class="mp-brand-text">
        <span class="mp-brand-name">${esc(name)}</span>
        <span class="mp-brand-tag">${esc(commLabel)} · Order for collection or delivery</span>
      </span>
    </a>
    <div class="mp-search" role="search">
      <label class="vh" for="store-search">Search products</label>
      <input type="search" id="store-search" name="q" autocomplete="off" enterkeyhint="search" placeholder="Search for products..." />
    </div>
    <div class="mp-actions">
      <a class="mp-acc-btn" href="/account" id="mp-acc-btn" aria-label="My account">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M6 20v-1a6 6 0 0112 0v1"/></svg>
        <span class="mp-acc-label" id="mp-acc-label">Account</span>
      </a>
      <a class="mp-store-btn" href="/store-owner/dashboard/" aria-label="Store-owner dashboard">
        <span aria-hidden="true">🏪</span>
        <span class="mp-store-btn-label-full">For stores</span>
        <span class="mp-store-btn-label-short">Store</span>
      </a>
      <span class="mp-basket-total" id="nav-total" aria-live="polite">£0.00</span>
      <button type="button" class="nav-cart mp-cart-btn" id="nav-basket" aria-label="Open basket"><span class="mp-cart-icon" aria-hidden="true">🛒</span><span class="nb" id="nav-badge">0</span></button>
    </div>
  </div>
</header>
<nav class="mp-cat-nav" aria-label="Product categories">
  <div class="mp-cat-nav-inner">
    <div class="mp-all-cat-block">
      <button type="button" class="mp-all-cat-btn" id="mp-all-cat-btn">
        <span class="mp-ham" aria-hidden="true">☰</span>
        <span>All categories</span>
        <span class="mp-chev" aria-hidden="true">▾</span>
      </button>
      <span class="mp-prod-total">Total ${products.length} products</span>
    </div>
    <div class="fil-scroll mp-cat-links" id="fil-bar">${filterPills}</div>
  </div>
</nav>
</div>
<div id="return-ban" class="return-ban" role="status"><span id="return-txt">You left something behind — your basket is saved.</span><button type="button" class="btn-sec" id="return-open" style="padding:6px 12px;font-size:.85rem">View basket</button></div>
${closedBanner}
<div class="hero-full">
  ${heroImgTag}
  <div class="veil"></div>
  <div class="hero-inner">
    <div class="hero-card">
      <h1>${esc(name)}</h1>
      <div class="badge-row">
        <span class="chip">${city ? `${esc(city)} · ` : ""}${esc(commLabel)}</span>
        ${verified ? `<span class="chip ver">✓ Verified</span>` : ""}
        ${openBadge}
      </div>
      <div class="rating-line">${ratingBlock}</div>
      <p class="muted" style="margin:8px 0 0;font-size:.9rem"><strong>Opening</strong> — ${esc(hours)}</p>
      <div class="cta-row">
        <button type="button" class="btn-pr" id="cta-catalogue">Add items to basket</button>
        ${waStoreUrl ? `<a class="btn-sec" href="${esc(waStoreUrl)}" target="_blank" rel="noopener">Message store</a>` : `<span class="muted" style="align-self:center;font-size:.88rem">WhatsApp not listed</span>`}
        <button type="button" class="btn-sec save-store-btn" id="save-store-btn" data-listing-id="${esc(listing.id || "")}" aria-pressed="false" aria-label="Save this store to your account">
          <span class="ss-heart" aria-hidden="true">♡</span>
          <span class="ss-label">Save store</span>
        </button>
      </div>
    </div>
  </div>
</div>
<div class="layout">
  <div id="main-col">
    ${
      bio
        ? `<div class="desc-card">
  <h2 class="story-h">Our story</h2>
  <div id="desc-short">${descShort}</div>
  <div id="desc-full" class="hidden" style="display:none">${descFull}</div>
  ${bio.length > 220 ? `<button type="button" class="read-tog" id="read-more">Read more</button>` : ""}
</div>`
        : ""
    }
    <div class="ful-bar" role="group" aria-label="Fulfilment">
      <button type="button" class="ful-opt on" data-ful="collection" id="ful-col">
        <strong>🏪 Collection</strong>
        <span class="muted small">Ready in ~2 hours</span>
      </button>
      <button type="button" class="ful-opt" data-ful="delivery" id="ful-del" ${listing.deliveryEnabled === false ? "disabled" : ""}>
        <strong>🚚 Delivery</strong>
        <span class="muted small">£${(Number(listing.deliveryChargeGbp) || 0).toFixed(2)} · within ${Number(listing.deliveryRadiusMiles) || 5} mi</span>
      </button>
    </div>
    <div id="store-shop-zone">
    ${popularHtml}
    <section id="catalogue-section">
      <h2 id="shop-h">Shop</h2>
      ${mainGrid}
    </section>
    </div>
    <section>
      <h2>Reviews</h2>
      ${reviewsSummary}
      ${goldReview}
      <div class="desc-card">${reviewsList}</div>
    </section>
    ${similarHtml}
    ${tagRow}
  </div>
</div>
<footer class="mp-foot" role="contentinfo">
  <div class="mp-foot-grid">
    ${footer5ColsHtml}
  </div>
  ${payStripHtml}
  <div class="mp-foot-bar">
    <span>Copyright ${new Date().getFullYear()} © ${esc(name)} on Clip Services. All rights reserved.</span>
    <div class="mp-foot-legal">
      <a href="/privacy-policy">Privacy policy</a>
      <a href="/terms">Terms &amp; conditions</a>
      <a href="/disclaimer">Disclaimer</a>
      <a href="/privacy-policy">Cookie notice</a>
    </div>
  </div>
</footer>
<button type="button" class="mp-back-top" id="mp-back-top" aria-label="Back to top">↑</button>
<div id="drawer-scrim" class="drawer-scrim"></div>
<aside id="basket-drawer" class="basket-drawer" aria-label="Your basket">
  <div class="basket-drawer-h"><span>Your basket</span><button type="button" class="read-tog" id="drawer-close" style="font-size:1.2rem;padding:4px 8px" aria-label="Close">✕</button></div>
  <div class="basket-drawer-body" id="drawer-body">
    <div id="basket-lines"></div>
    <div id="basket-empty" class="basket-empty">Start adding items from this store.</div>
    <div id="minwrap" style="display:none">
      <p class="muted small" id="min-tit"></p>
      <div class="min-bar"><i id="min-fill"></i></div>
    </div>
    <div id="basket-totals" class="hidden" style="display:none">
      <p class="muted" id="sub-line"></p>
      <p class="muted" id="del-line"></p>
      <p class="muted small" id="eta-line">Estimated: collection ~2 h · delivery 30–60 min (store confirms on WhatsApp).</p>
      <p><strong id="grand-line"></strong></p>
      <p class="muted small" id="min-line" style="display:none"></p>
      <p class="trust-cta">🔒 Secure checkout via Stripe</p>
      <button type="button" class="btn-pr proceed-full" id="proceed-checkout-drawer">Proceed to Payment →</button>
    </div>
  </div>
</aside>
<div class="mob-dock">
  <div class="mob-dock-inner">
    <span id="mob-sum" class="muted" style="font-size:.88rem">🛒 View basket (0) — £0.00</span>
    <button type="button" class="btn-pr" id="open-basket-mob">Basket</button>
  </div>
</div>
<dialog id="chk">
  <form method="dialog" id="chk-form" novalidate>
    <div class="dlg-h">Checkout</div>
    <div class="dlg-b">
      <div class="checkout-steps" id="steps">
        <i class="on" data-s="1">1 Review</i>
        <i data-s="2">2 Fulfilment</i>
        <i data-s="3">3 Your details</i>
        <i data-s="4">4 Pay</i>
      </div>
      <div id="step-1">
        <div id="dlg-review"></div>
      </div>
      <div id="step-2" class="hidden" style="display:none">
        <p class="muted" id="ful-summary"></p>
        <div id="addr-box" class="hidden" style="display:none">
          <label>Address line 1</label>
          <input type="text" id="addr1" autocomplete="street-address" />
          <div class="row2">
            <div><label>City</label><input type="text" id="addr-city" autocomplete="address-level2" /></div>
            <div><label>Postcode</label><input type="text" id="addr-pc" autocomplete="postal-code" /></div>
          </div>
        </div>
      </div>
      <div id="step-3" class="hidden" style="display:none">
        <div class="row2">
          <div><label>First name</label><input type="text" id="fn" required autocomplete="given-name" /></div>
          <div><label>Last name</label><input type="text" id="ln" required autocomplete="family-name" /></div>
        </div>
        <label>Email</label>
        <input type="email" id="em" required autocomplete="email" />
        <label>WhatsApp / mobile</label>
        <input type="tel" id="ph" required autocomplete="tel" />
        <label><input type="checkbox" id="consent" required /> I agree to the <a href="/terms.html" target="_blank" rel="noopener">terms</a> and processing of my data for this order.</label>
      </div>
      <div id="step-4" class="hidden" style="display:none">
        <p class="pay-copy">You’ll pay on Stripe’s secure page — <strong>card, Apple Pay and Google Pay</strong> show automatically when your device supports them.</p>
        <p><strong id="pay-amt"></strong></p>
      </div>
      <div class="err" id="pay-err"></div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button type="button" class="btn-sec" id="chk-back" style="display:none">Back</button>
        <button type="button" class="btn-pr" id="chk-next">Continue</button>
        <button type="submit" class="btn-pr hidden" id="chk-pay" style="display:none">Pay securely</button>
      </div>
    </div>
  </form>
</dialog>
<script type="application/json" id="store-json">${storeJson}</script>
<script>
(function(){
  var rawJson = document.getElementById("store-json") && document.getElementById("store-json").textContent;
  var STORE;
  try {
    STORE = JSON.parse(rawJson || "{}");
  } catch (err) {
    console.error("store-json parse", err);
    alert("This store page could not load fully. Please refresh the page.");
    return;
  }
  if (!STORE || !STORE.id) {
    alert("Store data is incomplete. Please refresh or try again later.");
    return;
  }
  if (!Array.isArray(STORE.priceList)) STORE.priceList = [];
  if (STORE.mapsApiKey) {
    var _ms = document.createElement("script");
    _ms.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(STORE.mapsApiKey) + "&libraries=places";
    _ms.async = true;
    _ms.defer = true;
    document.head.appendChild(_ms);
  }
  var CART_KEY = "clipCart:" + STORE.id;
  var step = 1;
  var cartSyncT = null;
  var cartSyncHold = false;
  function scheduleCartSync() {
    if (cartSyncHold) return;
    clearTimeout(cartSyncT);
    cartSyncT = setTimeout(function () {
      try {
        var c = getCart();
        fetch("/api/customer-api", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "put-marketplace-cart",
            listingId: STORE.id,
            cart: c,
          }),
        }).catch(function () {});
      } catch (e) {}
    }, 450);
  }
  function getCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); } catch(e){ return {}; } }
  function setCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); scheduleCartSync(); }
  function countItems(c){ var n = 0; for (var k in c) n += (c[k]|0); return n; }
  function parsePrice(i){ var r = STORE.priceList[i]; if (!r) return 0; if (typeof r.priceNum === "number" && isFinite(r.priceNum)) return r.priceNum; return parseFloat(String(r.price||"").replace(/[^0-9.]/g,""))||0; }
  function subtotal(){ var c=getCart(), s=0; for (var k in c){ var q=c[k]|0; if(q<1)continue; s+=parsePrice(k|0)*q;} return Math.round(s*100)/100; }
  function deliveryFee(){ var el=document.querySelector(".ful-opt.on"); return el&&el.getAttribute("data-ful")==="delivery" ? (Number(STORE.deliveryChargeGbp)||0) : 0; }
  function platformFee(s){ return Math.round(s*0.15*100)/100; }
  function total(){ var s=subtotal(); var d=deliveryFee(); return Math.round((s+d+platformFee(s))*100)/100; }
  var fulfil = "collection";

  function track(ev, idx){
    fetch("/api/store-analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({listingId:STORE.id,event:ev,productIdx:idx})}).catch(function(){});
  }
  track("view");
  setTimeout(function () {
    try {
      if (window.ClipPwa) {
        var segs2 = location.pathname.replace(/\/+$/,"").split("/");
        var slug2 = segs2[segs2.length-1] || "";
        window.ClipPwa.addRecentStore({ id: STORE.id, slug: slug2, name: STORE.role || "Store" });
      }
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CLIP_CACHE_URL", url: location.href });
      }
    } catch (e) {}
  }, 300);
  try {
    var rn = sessionStorage.getItem("clip_reorder_note");
    if (rn) { sessionStorage.removeItem("clip_reorder_note"); alert(rn); }
  } catch (e) {}

  fetch("/api/track-visit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:location.pathname,ref:document.referrer||""})}).catch(function(){});

  document.getElementById("cta-catalogue").onclick=function(){ document.getElementById("shop-h").scrollIntoView({behavior:"smooth"}); };

  function setFul(f){
    fulfil=f;
    var col=document.getElementById("ful-col"), del=document.getElementById("ful-del");
    if(f==="delivery"){ col.classList.remove("on"); del.classList.add("on"); }
    else { del.classList.remove("on"); col.classList.add("on"); }
    renderBasket();
  }
  document.getElementById("ful-col").onclick=function(){ if(STORE.collectionEnabled===false)return; setFul("collection"); };
  document.getElementById("ful-del").onclick=function(){ if(STORE.deliveryEnabled===false)return; setFul("delivery"); };
  if (STORE.collectionEnabled===false) setFul("delivery");
  else setFul("collection");

  function applyFilters(){
    var pillOn = document.querySelector(".fil-pill.on");
    var f = pillOn ? pillOn.getAttribute("data-filter") : "all";
    var si = document.getElementById("store-search");
    var q = si ? String(si.value || "").trim().toLowerCase() : "";
    document.querySelectorAll(".pcard").forEach(function(card){
      var c = card.getAttribute("data-cat");
      var blob = (card.getAttribute("data-search") || "").toLowerCase();
      var catOk = (f === "all" || c === f);
      var searchOk = !q || blob.indexOf(q) !== -1;
      card.style.display = (catOk && searchOk) ? "" : "none";
    });
  }

  var pills=document.querySelectorAll(".fil-pill");
  pills.forEach(function(p){
    p.onclick=function(){
      var f=p.getAttribute("data-filter");
      pills.forEach(function(x){ x.classList.toggle("on", x.getAttribute("data-filter")===f); });
      applyFilters();
    };
  });
  var searchIn=document.getElementById("store-search");
  if(searchIn){
    searchIn.addEventListener("input",applyFilters);
    searchIn.addEventListener("search",applyFilters);
  }

  var allCatBtn=document.getElementById("mp-all-cat-btn");
  if(allCatBtn){
    allCatBtn.onclick=function(){
      var si=document.getElementById("store-search");
      if(si) si.value="";
      pills.forEach(function(x){ x.classList.toggle("on", x.getAttribute("data-filter")==="all"); });
      applyFilters();
      var sh=document.getElementById("shop-h");
      if(sh){ sh.scrollIntoView({behavior:"smooth",block:"start"}); }
    };
  }
  var topBtn=document.getElementById("mp-back-top");
  if(topBtn){
    topBtn.onclick=function(){
      try { window.scrollTo({top:0,behavior:"smooth"}); } catch(e1){ window.scrollTo(0,0); }
    };
  }

  var rm=document.getElementById("read-more");
  if(rm){ rm.onclick=function(){
    var s=document.getElementById("desc-short"), fu=document.getElementById("desc-full");
    if(fu.style.display==="none"){ fu.style.display="block"; s.style.display="none"; rm.textContent="Read less"; }
    else { fu.style.display="none"; s.style.display="block"; rm.textContent="Read more"; }
  }; }

  function flashAdded(idx){
    try {
      if (!sessionStorage.getItem("clip_first_bask_evt")) {
        sessionStorage.setItem("clip_first_bask_evt", "1");
        document.dispatchEvent(new Event("clip-first-basket"));
      }
    } catch (e) {}
    var el=document.querySelector("[data-added=\""+idx+"\"]");
    if(el){ el.classList.remove("hidden"); setTimeout(function(){ el.classList.add("hidden"); },1400); }
    var btn=document.querySelector("[data-add=\""+idx+"\"]");
    if(btn){ btn.classList.add("added-flash"); setTimeout(function(){ btn.classList.remove("added-flash"); },1200); }
  }
  /** Only block adds when the PWA marked the page offline — navigator.onLine is often wrong on mobile networks. */
  function isOnline() {
    try {
      if (document.documentElement.classList.contains("clip-offline")) return false;
    } catch (e) {}
    return true;
  }

  var drawerOpen=false;
  function openDrawer(){
    document.getElementById("basket-drawer").classList.add("open");
    document.getElementById("drawer-scrim").classList.add("open");
    document.getElementById("drawer-scrim").style.display="block";
    drawerOpen=true;
    track("basket_open");
  }
  function closeDrawer(){
    document.getElementById("basket-drawer").classList.remove("open");
    document.getElementById("drawer-scrim").classList.remove("open");
    document.getElementById("drawer-scrim").style.display="none";
    drawerOpen=false;
  }
  document.getElementById("drawer-scrim").onclick=closeDrawer;
  document.getElementById("drawer-close").onclick=closeDrawer;
  document.getElementById("nav-basket").onclick=openDrawer;
  document.getElementById("open-basket-mob").onclick=openDrawer;
  document.getElementById("return-open").onclick=function(){ openDrawer(); };

  function renderBasket(){
    var c=getCart();
    var lines=document.getElementById("basket-lines");
    var empty=document.getElementById("basket-empty");
    var tot=document.getElementById("basket-totals");
    var nb=document.getElementById("nav-badge");
    lines.innerHTML="";
    var n=countItems(c);
    var s=subtotal();
    var d=deliveryFee();
    var pf=platformFee(s);
    var t=Math.round((s+d+pf)*100)/100;
    if(nb) nb.textContent=String(n);
    if(n<1){
      empty.style.display="block";
      tot.style.display="none";
      document.getElementById("mob-sum").textContent="🛒 View basket (0) — £0.00";
      var nt0=document.getElementById("nav-total");
      if(nt0) nt0.textContent="£0.00";
      return;
    }
    empty.style.display="none";
    tot.style.display="block";
    for(var k in c){
      var q=c[k]|0; if(q<1)continue;
      var i=k|0;
      var row=STORE.priceList[i]; if(!row)continue;
      var img=document.querySelector(".pcard[data-idx=\""+i+"\"] .pimg");
      var src=img&&img.getAttribute("src")?img.getAttribute("src"):"";
      var div=document.createElement("div");
      div.className="bline";
      div.innerHTML=(src?'<img src="'+src.replace(/"/g,"&quot;")+'" alt="" loading="lazy" width="48" height="48"/>':'<div style="width:48px;height:48px;background:#ede6dc;border-radius:8px"></div>')+
        '<div style="flex:1;min-width:0"><strong>'+String(row.item).replace(/</g,"&lt;")+'</strong><br/>'+
        (row.compareAtNum && row.compareAtNum > parsePrice(i) ? '<span style="text-decoration:line-through;color:#78716c;margin-right:6px;font-size:.82rem">£'+Number(row.compareAtNum).toFixed(2)+'</span>' : '')+
        '<span>£'+parsePrice(i).toFixed(2)+' each</span></div>'+
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+
        '<button type="button" class="qbtn" data-bdec="'+i+'" aria-label="Decrease">−</button>'+
        '<span style="min-width:22px;text-align:center;font-weight:700">'+q+'</span>'+
        '<button type="button" class="qbtn" data-binc="'+i+'" aria-label="Increase">+</button>'+
        '<button type="button" class="qbtn" data-brem="'+i+'" title="Remove" aria-label="Remove">×</button></div>';
      lines.appendChild(div);
    }
    document.getElementById("sub-line").textContent="Subtotal £"+s.toFixed(2);
    document.getElementById("del-line").textContent=d>0?("Delivery fee £"+d.toFixed(2)):"Collection — no delivery fee";
    var et=document.getElementById("eta-line");
    if(et) et.textContent=fulfil==="delivery"?"Estimated delivery: 30–60 min (store confirms).":"Estimated: ready in approximately 2 hours (collection).";
    document.getElementById("grand-line").textContent="Total £"+t.toFixed(2)+" (incl. service charge)";
    document.getElementById("mob-sum").textContent="🛒 View basket ("+n+") — £"+t.toFixed(2);
    var nt=document.getElementById("nav-total");
    if(nt) nt.textContent="£"+t.toFixed(2);
    var min=Number(STORE.minimumOrderGbp)||0;
    var ml=document.getElementById("min-line");
    var mw=document.getElementById("minwrap");
    var mf=document.getElementById("min-fill");
    if(min>0){
      if(mw){ mw.style.display="block"; }
      var tit=document.getElementById("min-tit");
      if(tit) tit.textContent="Minimum order £"+min.toFixed(2)+" for this store";
      if(mf) mf.style.width=Math.min(100, Math.round((s/min)*100))+"%";
      if(min>0 && s<min){ ml.style.display="block"; ml.textContent="Add £"+(min-s).toFixed(2)+" to reach the minimum."; }
      else { ml.style.display="none"; }
    } else { if(mw) mw.style.display="none"; ml.style.display="none"; }
    var proc=document.getElementById("proceed-checkout-drawer");
    if(proc) proc.disabled=n<1||(min>0&&s<min);
    lines.querySelectorAll("[data-bdec]").forEach(function(b){
      b.onclick=function(){ var ix=b.getAttribute("data-bdec"); var cc=getCart(); cc[ix]=(cc[ix]|0)-1; if(cc[ix]<1)delete cc[ix]; setCart(cc); syncQtyUI(); renderBasket(); };
    });
    lines.querySelectorAll("[data-binc]").forEach(function(b){
      b.onclick=function(){ var ix=b.getAttribute("data-binc"); var cc=getCart(); cc[ix]=(cc[ix]|0)+1; setCart(cc); syncQtyUI(); renderBasket(); };
    });
    lines.querySelectorAll("[data-brem]").forEach(function(b){
      b.onclick=function(){ var ix=b.getAttribute("data-brem"); var cc=getCart(); delete cc[ix]; setCart(cc); syncQtyUI(); renderBasket(); };
    });
  }

  function syncQtyUI(){
    var c=getCart();
    document.querySelectorAll(".add-row").forEach(function(row){
      var ix=row.getAttribute("data-add-wrap");
      var q=c[ix]|0;
      var btn=row.querySelector("[data-add]");
      var qr=row.querySelector("[data-qty-row]");
      var qn=row.querySelector("[data-qty]");
      if(q>0){ btn.classList.add("hidden"); qr.classList.remove("hidden"); if(qn)qn.textContent=String(q); }
      else { btn.classList.remove("hidden"); qr.classList.add("hidden"); }
    });
  }

  var shopZone = document.getElementById("store-shop-zone");
  if (!shopZone) shopZone = document.getElementById("catalogue-section");
  shopZone.addEventListener("click",function(ev){
    var t = ev.target;
    if (!t || !t.closest) return;
    if(!STORE.storeOpen){
      if (t.closest("[data-add], [data-inc], [data-dec]")) {
        alert("This store is closed for orders right now.");
      }
      return;
    }
    var addEl = t.closest("[data-add]");
    if(addEl){
      if(!isOnline()){ alert("You're offline — go back online to add to basket and order."); return; }
      var ix = parseInt(addEl.getAttribute("data-add"), 10);
      if (Number.isNaN(ix)) return;
      var row=STORE.priceList[ix]; if(!row||row.inStock===false)return;
      var c=getCart(); c[ix]=(c[ix]|0)+1; setCart(c);
      track("add_basket", ix);
      syncQtyUI(); renderBasket(); flashAdded(ix);
      if(countItems(c)===1){ try{ openDrawer(); }catch(e2){} }
      return;
    }
    var incEl = t.closest("[data-inc]");
    if(incEl){
      var i2 = parseInt(incEl.getAttribute("data-inc"), 10);
      if (Number.isNaN(i2)) return;
      var c2=getCart(); c2[i2]=(c2[i2]|0)+1; setCart(c2); syncQtyUI(); renderBasket(); return;
    }
    var decEl = t.closest("[data-dec]");
    if(decEl){
      var i3 = parseInt(decEl.getAttribute("data-dec"), 10);
      if (Number.isNaN(i3)) return;
      var c3=getCart(); c3[i3]=(c3[i3]|0)-1; if(c3[i3]<1)delete c3[i3]; setCart(c3); syncQtyUI(); renderBasket(); return;
    }
  });

  cartSyncHold = true;
  fetch("/api/customer-api?action=profile", { credentials: "include" })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (d) {
      try {
        if (!d || !d.ok || !d.profile || !d.profile.marketplaceCarts) return;
        var mc = d.profile.marketplaceCarts[String(STORE.id)];
        if (!mc || typeof mc !== "object") return;
        var loc = getCart();
        var out = {};
        var keys = {};
        for (var a in loc) keys[a] = 1;
        for (var b in mc) keys[b] = 1;
        for (var k in keys) {
          var L = parseInt(String(loc[k] || 0), 10) || 0;
          var S = parseInt(String(mc[k] || 0), 10) || 0;
          var n = Math.max(L, S);
          if (n > 0) out[k] = n;
        }
        localStorage.setItem(CART_KEY, JSON.stringify(out));
      } catch (e) {}
    })
    .catch(function () {})
    .finally(function () {
      cartSyncHold = false;
      syncQtyUI();
      renderBasket();
    });

  try {
    var h = (location.hash || "").toLowerCase();
    if (h === "#basket" || h === "#checkout") {
      setTimeout(function () {
        openDrawer();
      }, 350);
    }
  } catch (_hh) {}

  (function retBan(){
    if(countItems(getCart())>0 && !sessionStorage.getItem("clip_basket_nag")){
      var rb=document.getElementById("return-ban");
      if(rb) rb.classList.add("show");
    }
  })();
  document.getElementById("return-ban").addEventListener("click", function(e){
    if(e.target&&e.target.id==="return-open"){ sessionStorage.setItem("clip_basket_nag","1"); }
  }, true);

  var dlg=document.getElementById("chk");
  function goStep(s){
    step=s;
    for(var i=1;i<=4;i++){
      var p=document.getElementById("step-"+i);
      if(p) p.style.display=i===s?"block":"none";
      var si=document.querySelector("#steps i[data-s=\""+i+"\"]");
      if(si) si.classList.toggle("on", i===s);
    }
    document.getElementById("chk-back").style.display=s>1?"inline-block":"none";
    document.getElementById("chk-next").style.display=s<4?"inline-block":"none";
    document.getElementById("chk-pay").style.display=s===4?"inline-block":"none";
    if(s===4){
      var pa=document.getElementById("pay-amt");
      if(pa) pa.innerHTML='Total <strong style="white-space:nowrap">£'+total().toFixed(2)+'</strong> — wallets appear on the next secure screen.';
    }
  }

  function openChk(){
    if(!STORE.storeOpen){ alert("This store is closed for orders."); return; }
    var s=subtotal();
    var min=Number(STORE.minimumOrderGbp)||0;
    if(min>0 && s<min){ alert("Minimum order is £"+min.toFixed(2)); return; }
    track("checkout_start");
    closeDrawer();
    var c=getCart(), rlines=[];
    for(var k in c){ var q=c[k]|0; if(q<1)continue; var row=STORE.priceList[k|0]; if(row) rlines.push(q+"× "+row.item); }
    var fulTxt=fulfil==="delivery"?"🚚 Delivery (fee shown in total)":"🏪 Collection — ready in ~2 hours (store confirms)";
    document.getElementById("dlg-review").innerHTML='<p class="muted">Order summary (guest checkout — no account required)</p><p>'+rlines.join("<br/>")+'</p><p><strong>Total £'+total().toFixed(2)+'</strong></p><p class="muted">'+fulTxt+"</p>";
    document.getElementById("ful-summary").textContent=fulfil==="delivery"?"We’ll ask for your delivery address in the next step.":"You’ll collect from the store when it’s ready.";
    document.getElementById("addr-box").style.display=fulfil==="delivery"?"block":"none";
    if(fulfil==="delivery" && typeof google!=="undefined" && google.maps&&google.maps.places&&document.getElementById("addr1")&&!document.getElementById("addr1").dataset.pac){
      try{
        var ac=new google.maps.places.Autocomplete(document.getElementById("addr1"),{types:["address"],componentRestrictions:{country:"uk"}});
        ac.addListener("place_changed",function(){
          var p=ac.getPlace(); if(!p.address_components) return;
          var city="", pc="";
          p.address_components.forEach(function(c){
            if(c.types.indexOf("postal_town")>=0||c.types.indexOf("locality")>=0) city=c.long_name;
            if(c.types.indexOf("postal_code")>=0) pc=c.long_name;
          });
          if(city) document.getElementById("addr-city").value=city;
          if(pc) document.getElementById("addr-pc").value=pc;
        });
        document.getElementById("addr1").dataset.pac="1";
      }catch(e){}
    }
    document.getElementById("pay-err").textContent="";
    goStep(1);
    dlg.showModal();
  }
  document.getElementById("proceed-checkout-drawer").onclick=openChk;

  document.getElementById("chk-next").onclick=function(){
    document.getElementById("pay-err").textContent="";
    if(step===1){ goStep(2); return; }
    if(step===2){
      if(fulfil==="delivery"){
        var a=document.getElementById("addr1").value.trim(), c=document.getElementById("addr-city").value.trim(), p=document.getElementById("addr-pc").value.trim();
        if(!a||!c||!p){ document.getElementById("pay-err").textContent="Enter your delivery address."; return; }
      }
      goStep(3); return;
    }
    if(step===3){
      var fn=document.getElementById("fn").value.trim(), ln=document.getElementById("ln").value.trim(), em=document.getElementById("em").value.trim(), ph=document.getElementById("ph").value.trim(), cs=document.getElementById("consent").checked;
      if(!fn||!ln||!em||!ph||!cs){ document.getElementById("pay-err").textContent="Fill all fields and accept terms."; return; }
      goStep(4); return;
    }
  };
  document.getElementById("chk-back").onclick=function(){ if(step>1) goStep(step-1); };

  document.getElementById("chk-form").onsubmit=function(ev){
    ev.preventDefault();
    var c=getCart(), cartLines=[];
    for(var k in c){ var q=c[k]|0; if(q<1)continue; cartLines.push({idx:k|0,qty:q}); }
    var body={
      listingId:STORE.id,
      cartLines:cartLines,
      firstName:document.getElementById("fn").value.trim(),
      lastName:document.getElementById("ln").value.trim(),
      email:document.getElementById("em").value.trim(),
      phone:document.getElementById("ph").value.trim(),
      consent:document.getElementById("consent").checked,
      fulfillment:fulfil
    };
    if(fulfil==="delivery"){
      body.deliveryAddress={
        line1:document.getElementById("addr1").value.trim(),
        city:document.getElementById("addr-city").value.trim(),
        postcode:document.getElementById("addr-pc").value.trim()
      };
    }
    body.orderSource="web";
    try{ if(sessionStorage.getItem("clipOrderSource")==="wa") body.orderSource="wa"; }catch(_e2){}
    if(body.orderSource==="web" && ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone)) body.orderSource="pwa";
    if(!isOnline()){ document.getElementById("pay-err").textContent="You\\'re offline. Reconnect to pay."; return; }
    var btn=document.getElementById("chk-pay"); btn.disabled=true;
    fetch("/api/stripe-checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data.url){ window.location.href=data.url; return; }
        document.getElementById("pay-err").textContent=data.error||"Payment could not start.";
        btn.disabled=false;
      }).catch(function(){ document.getElementById("pay-err").textContent="Network error."; btn.disabled=false; });
  };

  document.getElementById("chk-pay").onclick=function(){ document.getElementById("chk-form").requestSubmit(); };

  goStep(1);
})();
</script>
<script>
(function () {
  /* Save-store heart on the storefront. Calls /api/customer-api when signed in,
     bounces to /account?next=… when not. Reflects state at boot via whoami + overview. */
  var btn = document.getElementById("save-store-btn");
  if (!btn) return;
  var listingId = btn.getAttribute("data-listing-id") || "";
  if (!listingId) return;
  var here = location.pathname + (location.hash || "");
  var loginUrl = "/account?return=" + encodeURIComponent(here) + "#signin";

  function setSaved(saved) {
    btn.setAttribute("aria-pressed", saved ? "true" : "false");
    btn.querySelector(".ss-label").textContent = saved ? "Saved" : "Save store";
    btn.querySelector(".ss-heart").textContent = saved ? "♥" : "♡";
  }

  function bootHeart() {
    fetch("/api/customer-api?action=saved-stores", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.ok) return;
        var ids = (j.savedStores || []).map(function (s) { return String(s.id); });
        setSaved(ids.indexOf(listingId) >= 0);
      })
      .catch(function () { /* ignore — heart stays in "save" state */ });
  }
  bootHeart();

  btn.addEventListener("click", function () {
    if (btn.disabled) return;
    var wasSaved = btn.getAttribute("aria-pressed") === "true";
    btn.disabled = true;
    setSaved(!wasSaved);
    fetch("/api/customer-api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action: wasSaved ? "unsave-store" : "save-store",
        listingId: listingId
      })
    }).then(function (r) {
      btn.disabled = false;
      if (r.status === 401) {
        setSaved(wasSaved);
        location.href = loginUrl;
        return;
      }
      if (!r.ok) {
        setSaved(wasSaved);
      }
    }).catch(function () {
      btn.disabled = false;
      setSaved(wasSaved);
    });
  });
})();

/* Personalise the account button in the storefront header. */
(function () {
  var lbl = document.getElementById("mp-acc-label");
  var btn = document.getElementById("mp-acc-btn");
  if (!lbl || !btn) return;
  fetch("/api/customer-auth?action=whoami", { credentials: "same-origin" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (j && j.ok && j.email) {
        lbl.textContent = "My account";
        btn.setAttribute("aria-label", "My account (" + j.email + ")");
      }
    })
    .catch(function () { /* offline: keep label */ });
})();
</script>
<script src="/js/clip-cookie.js" defer></script>
</body>
</html>`;
}
