/**
 * Rows for store catalogue + basket/checkout. Many listings carry products in `storeProducts`
 * while `priceList` stays empty until synced; hydrate so cart and Stripe checkout match UX.
 *
 * @param {object|null|undefined} listing
 * @returns {{ item: string; price: string }[]}
 */
export function catalogPriceRowsForListing(listing) {
  let priceList = Array.isArray(listing?.priceList) ? listing.priceList : [];
  if (priceList.length > 0) return priceList;
  const storeProducts = Array.isArray(listing?.storeProducts) ? listing.storeProducts : [];
  if (storeProducts.length === 0) return [];
  return storeProducts
    .map((p) => {
      const item = String(p?.name || p?.item || "").trim().slice(0, 120);
      const priceNum = Number(p?.price);
      const priceStr = Number.isFinite(priceNum)
        ? `£${priceNum.toFixed(2)}`
        : String(p?.price || "").trim().slice(0, 40);
      return { item, price: priceStr };
    })
    .filter((r) => r.item && r.price);
}
