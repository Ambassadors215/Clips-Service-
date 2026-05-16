/**
 * Rows for store catalogue + basket/checkout. Prefer `storeProducts` when present
 * so sale prices, weights and metadata stay authoritative.
 */

function parseNumMaybe(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function formatGbp(n) {
  if (!Number.isFinite(n)) return "";
  return `£${n.toFixed(2)}`;
}

/**
 * Effective line price for checkout: uses sale/discount when below RRP.
 * @returns {{ item: string; price: string; priceNum: number; compareAtNum?: number; pricingUnit?: string }}
 */
function rowFromProduct(p) {
  const item = String(p?.name || p?.item || "").trim().slice(0, 120);
  const rrp = parseNumMaybe(p?.price);
  const rawSale = parseNumMaybe(p?.salePrice ?? p?.discountPrice);
  let effective = Number.isFinite(rrp) ? rrp : NaN;
  let compareAtNum;
  if (Number.isFinite(rawSale) && rawSale > 0 && Number.isFinite(rrp)) {
    if (rawSale < rrp - 1e-6) {
      effective = rawSale;
      compareAtNum = rrp;
    }
  }
  let priceStr =
    Number.isFinite(effective) && effective >= 0
      ? formatGbp(effective)
      : String(p?.price || "").trim().slice(0, 40);
  const unitRaw = String(p?.pricingUnit || "").toLowerCase().trim();
  const unit =
    unitRaw === "kg" ||
    unitRaw === "kilogram" ||
    unitRaw === "g" ||
    unitRaw === "gram" ||
    unitRaw === "l" ||
    unitRaw === "litre" ||
    unitRaw === "liter"
      ? unitRaw
      : "";
  if (unit && priceStr && !/\//i.test(priceStr)) {
    const map = {
      kg: "/ kg",
      kilogram: "/ kg",
      g: "/ 100g",
      gram: "/ 100g",
      l: "/ L",
      litre: "/ L",
      liter: "/ L",
    };
    const suf = map[unit] || "";
    if (suf) priceStr = `${priceStr}${suf}`;
  }
  const priceNum =
    Number.isFinite(effective) && effective >= 0
      ? effective
      : parseFloat(String(priceStr || "").replace(/[^0-9.]/g, "")) || 0;

  return {
    item,
    price: priceStr,
    priceNum,
    ...(typeof compareAtNum === "number" && compareAtNum > priceNum ? { compareAtNum } : {}),
    ...(unit ? { pricingUnit: unit } : {}),
  };
}

export function catalogPriceRowsForListing(listing) {
  const storeProducts = Array.isArray(listing?.storeProducts) ? listing.storeProducts : [];
  if (storeProducts.length > 0) {
    return storeProducts
      .map((p) => rowFromProduct(p))
      .filter((r) => r.item && r.price);
  }
  const priceList = Array.isArray(listing?.priceList) ? listing.priceList : [];
  return priceList
    .map((row) => {
      const item = String(row?.item || "").trim().slice(0, 120);
      const priceStr = String(row?.price || "").trim().slice(0, 40);
      const priceNum =
        typeof row.priceNum === "number" && Number.isFinite(row.priceNum)
          ? row.priceNum
          : parseFloat(String(priceStr).replace(/[^0-9.]/g, "")) || 0;
      return {
        item,
        price: priceStr,
        priceNum,
        ...(typeof row.compareAtNum === "number"
          ? { compareAtNum: row.compareAtNum }
          : {}),
      };
    })
    .filter((r) => r.item && r.price);
}
