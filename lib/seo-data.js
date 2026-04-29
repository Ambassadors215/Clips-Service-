/** City landing SEO: slug → display name + intro (UK-focused, organic search). */
export const CITY_SLUGS = [
  "manchester",
  "london",
  "birmingham",
  "leeds",
  "leicester",
  "bradford",
  "bristol",
  "liverpool",
  "sheffield",
  "nottingham",
];

export const CITY_COPY = {
  manchester: {
    display: "Manchester",
    title: "African, Caribbean & Asian Stores in Manchester UK | Clip Services",
    description:
      "Shop African, Caribbean and Asian independent stores in Greater Manchester. Groceries, hair & beauty, halal, fashion — secure checkout on Clip Services.",
    intro: `Manchester has one of the UK’s richest African, Caribbean and Asian high streets — from Longsight and Rusholme to Cheetham Hill and beyond. Clip Services helps you find independent grocers, salons, fabric sellers and market traders online: order for collection or delivery where sellers offer it, with Stripe-secure payments and WhatsApp updates.`,
  },
  london: {
    display: "London",
    title: "African, Caribbean & Asian Stores in London | Clip Services",
    description:
      "Discover African, Caribbean and Asian independent shops across London. Food, beauty, fashion and halal — order online on Clip Services.",
    intro: `London’s diaspora communities span every borough — from Brixton and Peckham to Southall, Green Street and Wembley. Clip Services brings together independent African, Caribbean and Asian stores and stalls so you can browse authentic products, support local traders, and checkout securely without hunting through dozens of apps.`,
  },
  birmingham: {
    display: "Birmingham",
    title: "African, Caribbean & Asian Stores in Birmingham | Clip Services",
    description:
      "Order from African, Caribbean and Asian shops in Birmingham. Spices, halal meat, hair and beauty — Clip Services UK marketplace.",
    intro: `Birmingham’s African Caribbean quarter and busy Asian retail streets make it a natural home for community-first shopping. Whether you’re in the Jewellery Quarter, Sparkbrook or the suburbs, Clip Services lists independent sellers you can trust — with clear product info and card payments.`,
  },
  leeds: {
    display: "Leeds",
    title: "African, Caribbean & Asian Stores in Leeds | Clip Services",
    description:
      "Find African, Caribbean and Asian independent stores serving Leeds and West Yorkshire. Shop online on Clip Services.",
    intro: `From Chapeltown to Harehills and the city centre, Leeds has long supported vibrant African Caribbean and South Asian retail. Clip Services helps locals and students discover grocers, takeaways-as-retail, and beauty suppliers — all in one marketplace.`,
  },
  leicester: {
    display: "Leicester",
    title: "African, Caribbean & Asian Stores in Leicester | Clip Services",
    description:
      "African, Caribbean and Asian groceries and goods in Leicester — independent stores on Clip Services UK.",
    intro: `Leicester’s Melton Road and surrounding areas are known for South Asian groceries, while African and Caribbean communities add depth across the city. Use Clip Services to find independent sellers, compare what’s in stock, and order online where available.`,
  },
  bradford: {
    display: "Bradford",
    title: "African, Caribbean & Asian Stores in Bradford | Clip Services",
    description:
      "Shop African, Caribbean and Asian independent stores in Bradford. Authentic ingredients and more on Clip Services.",
    intro: `Bradford’s Asian wholesale and retail heritage sits alongside growing African and Caribbean communities. Clip Services connects you with local independents — ideal for bulk spices, halal products, fabrics and community-trusted brands.`,
  },
  bristol: {
    display: "Bristol",
    title: "African, Caribbean & Asian Stores in Bristol | Clip Services",
    description:
      "African, Caribbean and Asian shops in Bristol — order from independents on Clip Services.",
    intro: `From St Pauls and Easton to Gloucester Road, Bristol’s independent scene is community-led. Clip Services helps you support African, Caribbean and Asian traders with a single checkout experience and clear store profiles.`,
  },
  liverpool: {
    display: "Liverpool",
    title: "African, Caribbean & Asian Stores in Liverpool | Clip Services",
    description:
      "Find African, Caribbean and Asian stores in Liverpool and Merseyside on Clip Services UK marketplace.",
    intro: `Liverpool’s diverse neighbourhoods include longstanding Caribbean and growing African and Asian retail. Browse Clip Services for independents listing groceries, beauty, fashion and more — with secure payments.`,
  },
  sheffield: {
    display: "Sheffield",
    title: "African, Caribbean & Asian Stores in Sheffield | Clip Services",
    description:
      "African, Caribbean and Asian independent shops in Sheffield — shop online via Clip Services.",
    intro: `Sheffield’s communities are spread across the city and campuses. Clip Services makes it easier to find African, Caribbean and Asian independents, whether you need weekly groceries, specialist ingredients or hair and beauty products.`,
  },
  nottingham: {
    display: "Nottingham",
    title: "African, Caribbean & Asian Stores in Nottingham | Clip Services",
    description:
      "Order from African, Caribbean and Asian stores in Nottingham — Clip Services UK marketplace.",
    intro: `Nottingham’s independent retailers serve students and families alike. Clip Services highlights African, Caribbean and Asian sellers so you can discover new stores, read what they offer, and order online in a few clicks.`,
  },
};

/** Canonical category URLs — programmatic SEO landing pages. */
export const CATEGORY_SLUGS = [
  "fresh-produce",
  "meat-fish",
  "staples-grains",
  "oils-condiments",
  "spices-ingredients",
  "ready-meals",
  "drinks-beverages",
  "hair-beauty",
  "fashion-fabrics",
  "halal-products",
  "snacks-sweets",
];

/** Old URLs → canonical (301 from category-html). */
export const CATEGORY_SLUG_ALIASES = {
  halal: "halal-products",
  "fashion-fabric": "fashion-fabrics",
  "spices-staples": "spices-ingredients",
  drinks: "drinks-beverages",
  "meat-and-fish": "meat-fish",
  "rice-grains-flour": "staples-grains",
};

/** Short labels for category nav / internal links */
export const CATEGORY_NAV_LABELS = {
  "fresh-produce": "Fresh produce",
  "meat-fish": "Meat & fish",
  "staples-grains": "Staples & grains",
  "oils-condiments": "Oils & condiments",
  "spices-ingredients": "Spices & ingredients",
  "ready-meals": "Ready meals",
  "drinks-beverages": "Drinks & beverages",
  "hair-beauty": "Hair & beauty",
  "fashion-fabrics": "Fashion & fabric",
  "halal-products": "Halal",
  "snacks-sweets": "Snacks & sweets",
};

export const CATEGORY_COPY = {
  "fresh-produce": {
    title: "Buy Fresh Produce Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Order plantain, yam, okra and diaspora groceries from UK African, Caribbean and Asian independents — secure checkout on Clip Services.",
    h1: "Buy Fresh Produce Online UK | African, Caribbean & Asian Stores",
    intro:
      `Independent African, Caribbean and Asian grocers and market traders across the UK stock plantain, yams, okra, scotch bonnets, callaloo, herbs and seasonal produce that mainstream supermarkets rarely carry in full range. Clip Services is the marketplace where these stores list online so you can see who serves your area, compare what they offer, and pay securely by card for collection or delivery where the seller provides it. Whether you are meal-prepping for the week, cooking for guests, or trying ingredients from home, buying through community-led businesses keeps spend with independents who understand your kitchen. We show clear store profiles and categories so you can plan a full shop; availability follows seasons and each trader sets their own cut-off times, so always confirm details on the seller’s page before you order.`,
    keywords: ["produce", "fresh", "vegetables", "fruit", "plantain", "yam", "greens", "okra"],
  },
  "meat-fish": {
    title: "Buy Meat & Fish Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Halal meat, poultry, goat, fish and seafood from UK independents — order on Clip Services with secure Stripe checkout.",
    h1: "Buy Meat & Fish Online UK | African, Caribbean & Asian Stores",
    intro:
      `From halal poultry and beef to goat, offal, fish and Caribbean-style cuts, community stores and butchers who serve African, Caribbean and Asian customers list on Clip Services so you can shop without guessing which high street still stocks what you need. Each seller sets their own range, pricing, and whether they offer delivery or counter collection — profiles make those expectations clear before you checkout. Supporting independents helps keep skilled butchers and fishmongers in our neighbourhoods while giving you transparency on provenance where the store publishes it. If you need speciality cuts for soups, grills or festivals, browsing by store lets you align orders with occasions; many traders also answer questions on WhatsApp when you contact them via their Clip Services listing.`,
    keywords: ["meat", "fish", "halal", "chicken", "goat", "seafood", "butcher"],
  },
  "staples-grains": {
    title: "Buy Staples & Grains Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Rice, flour, grains, pulses and pantry staples — fufu flour, basmati, gari — from UK independents on Clip Services.",
    h1: "Buy Staples & Grains Online UK | African, Caribbean & Asian Stores",
    intro:
      `Pantry staples such as rice, beans, lentils, flour, gari and atta sit at the heart of diaspora cooking, and specialist independents remain the reliable source for bulk bags, regional brands and niche lines. On Clip Services, African, Caribbean and Asian stores list these products alongside fresh and frozen ranges so you can build a trolley that matches how your household cooks week to week. Secure card checkout and Stripe-backed payments mean you are not juggling cash referrals across multiple chats unless you prefer to coordinate collection that way — many sellers publish hours and postcode coverage up front. Comparing traders on one marketplace saves time versus searching social networks for who still has Semolina or jasmine rice in stock, especially when routines are busy or transport is awkward.`,
    keywords: ["rice", "flour", "grains", "fufu", "semolina", "beans", "pulses"],
  },
  "oils-condiments": {
    title: "Buy Oils & Condiments Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Palm oil, coconut milk, sauces, pickles and bottled condiments from UK diaspora grocers — Clip Services marketplace.",
    h1: "Buy Oils & Condiments Online UK | African, Caribbean & Asian Stores",
    intro:
      `Cooking oils, vinegars, pepper sauces, seasonings-in-a-bottle, coconut milk and pickles give dishes their finishing depth — diaspora kitchens often rely on bottles you will not find in every supermarket aisle. Clip Services connects you with African, Caribbean and Asian independents who stock these lines for collection or delivery where they offer it, with storefronts written for clarity rather than burying allergens in captions. Responsible shopping still means checking labels on arrival for allergens, sulphites and suitability for fasting or dietary rules your household follows — we present store contact details so questions go straight to the seller. Consolidating sauces and oils alongside spices and staples helps you minimise delivery fees while supporting traders who specialise in culturally relevant FMCG ranges.`,
    keywords: ["oil", "palm oil", "condiment", "sauce", "vinegar", "coconut milk", "ghee"],
  },
  "spices-ingredients": {
    title: "Buy Spices & Ingredients Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Suya blends, jerk seasonings, dried fish, curry leaves — UK community grocers on Clip Services.",
    h1: "Buy Spices & Ingredients Online UK | African, Caribbean & Asian Stores",
    intro:
      `Smoked fish, crayfish, jerk blends, curry mixes, cassava leaves dried for soups — the middle aisle of diaspora groceries is anything but boring. Sellers on Clip Services list speciality ingredients sourced for West African, Caribbean and South Asian cooking so home cooks do not compromise on aroma or depth. Searching by Store lets loyal customers follow traders they trust; reading descriptions carefully avoids confusion between similar-named packages. Ordering online frees weekend trips across town when schedules are tight — just remember ambient goods still need proper storage once they arrive.`,
    keywords: ["spices", "seasoning", "sauce", "ingredients", "curry", "blend", "dry fish"],
  },
  "hair-beauty": {
    title: "Buy Hair & Beauty Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Texture-friendly haircare, cosmetics, braid hair and grooming from UK independent beauty stores — Clip Services.",
    h1: "Buy Hair & Beauty Online UK | African, Caribbean & Asian Stores",
    intro:
      `Independent beauty supply shops and salons that retail online stock lines for Afro and textured hair, protective styles, braid extensions and skin regimes trusted across diaspora communities. Clip Services lists these merchants next to groceries so shoppers can recognise names they already know from the high street, then click through for secure payment policies and opening hours before they buy. Each store selects its catalogue; always read ingredients and allergens on packaging when your order arrives, especially with leave-on treatments. Supporting local traders through the marketplace strengthens small businesses competing with mass-market multiples that rarely serve niche routines as thoughtfully.`,
    keywords: ["hair", "beauty", "cosmetics", "braids", "extensions", "afro", "beauty supply"],
  },
  "fashion-fabrics": {
    title: "Buy Fashion & Fabric Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Ankara, lace, ceremonial wear and textiles from African, Caribbean and Asian independents — shop Clip Services.",
    h1: "Buy Fashion & Fabric Online UK | African, Caribbean & Asian Stores",
    intro:
      `Community retailers stock fabrics for weddings, church, carnival and tailoring — ankara prints, gele materials, madras-inspired checks and shimmering lace often arrive in rotations linked to celebrations. Shopping these ranges through Clip Services gives families a digital window into inventories that historically lived behind shop counters or via appointment-only cutters. Measuring allowances, preorder deposits and alteration policies vary by merchant; store pages outline how each trader operates UK-wide postage or local fittings when they offer them. Purchasing from diaspora-led independents safeguards craft skills and wholesalers who specialise in palettes big brands do not reproduce season after season.`,
    keywords: ["fashion", "fabric", "ankara", "lace", "clothing", "textiles"],
  },
  "drinks-beverages": {
    title: "Buy Drinks & Beverages Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Juices, malt drinks, soft drinks and mixers — order from diaspora-led UK grocery stores via Clip Services.",
    h1: "Buy Drinks & Beverages Online UK | African, Caribbean & Asian Stores",
    intro:
      `From tropical juices and speciality soft drinks to malt beverages and teas that households already love, independent grocers bundle drinks alongside food so you can complete a basket in one checkout. Clip Services lists stores with payment-ready carts and delivery or collection rules stated transparently rather than negotiated case by case unless you extend the conversation privately. Serving sizes, dietary labelling such as sugars content, and refrigeration needs depend on SKU — shoppers should inspect labels delivered and keep chilled goods cold immediately. Exploring drinks through diaspora merchants surfaces brands that rarely receive shelf-space in nationals yet remain culturally central at gatherings or weeknight meals.`,
    keywords: ["drinks", "juice", "beverages", "malt", "soft drink", "mixer"],
  },
  "halal-products": {
    title: "Buy Halal Products Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Groceries, snacks and essentials from halal-certified or clearly labelled ranges — Clip Services UK marketplace.",
    h1: "Buy Halal Products Online UK | African, Caribbean & Asian Stores",
    intro:
      `Many African and Asian community stores carry halal-assured groceries, confectionery or household staples that families prefer to source from specialists they trust. Clip Services brings those retailers into one marketplace so you can filter by store, read how each seller describes certification or supplier diligence, and pay online before you travel. Requirements differ by household; when in doubt, ask the merchant through the contact detail on their profile or check packaging on delivery. Independent halal-led businesses often combine pantry lines with butchery or frozen — combine categories on Clip Services to plan larger shops while keeping spend with community entrepreneurs rather than faceless marketplaces without local accountability.`,
    keywords: ["halal", "meat", "groceries", "certified", "islamic", "hmc"],
  },
  "ready-meals": {
    title: "Buy Ready Meals Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Chilled, frozen and shelf-stable ready meals and snacks from UK independents — order via Clip Services.",
    h1: "Buy Ready Meals Online UK | African, Caribbean & Asian Stores",
    intro:
      `Busy weeks call for prepared foods that still taste like home — independents list frozen, chilled and shelf-stable meals alongside ingredients for nights when cooking from scratch is not realistic. Clip Services shows which stores stock these lines, their temperature requirements, and how quickly you should collect or refrigerate after drop-off. Allergen labelling remains the responsibility of each producer and seller; read packaging every time because recipes can change. Ordering through community retailers keeps spend inside networks that reinvest in local stockists and pop-up kitchens rather than anonymous central kitchens alone.`,
    keywords: ["ready", "meals", "frozen", "chilled", "prepared", "microwave"],
  },
  "snacks-sweets": {
    title: "Buy Snacks & Sweets Online UK | African, Caribbean & Asian Stores | Clip Services",
    description:
      "Chin chin, plantain chips, mithai, biscuits — snacks from African, Caribbean and Asian UK stores on Clip Services.",
    h1: "Buy Snacks & Sweets Online UK | African, Caribbean & Asian Stores",
    intro:
      `Treat aisles in diaspora stores mix childhood favourites with new imports — crisps baked with plantain flour, spiced nuts, nostalgic sweets from South Asia or West Africa alongside limited-run imports. Clip Services connects sweet and savoury snack shoppers with traders who catalogue these impulse lines with the same Stripe security as big-ticket groceries. Checking use-by dates on arrival is good practice because snack SKUs rotate quickly; gifting or party bags may need allergen notices for schools and charities. Supporting independents keeps diverse brands on shelves when supermarket buyers would delist slower movers that still matter culturally to neighbourhoods online and offline.`,
    keywords: ["snacks", "sweets", "chin", "crisps", "biscuits", "mithai"],
  },
};

/** Community / diaspora SEO pages: /community/[slug] */
export const COMMUNITY_SLUGS = [
  "african",
  "caribbean",
  "asian",
  "nigerian",
  "ghanaian",
  "jamaican",
  "south-asian",
  "halal",
];

export const COMMUNITY_COPY = {
  african: {
    title: "African Grocery Stores & Shops Online UK | Clip Services",
    description:
      "Shop African groceries, beauty and fashion from UK independent stores — order online with secure payments.",
    h1: "African stores & groceries online in the UK",
    intro: `From West African staples to East African spices, independent African grocers and traders across the UK list on Clip Services. Discover stores in Manchester, London, Birmingham and beyond — browse catalogues, read profiles, and pay securely with Stripe. Whether you need fufu flour, suya spice or beauty products, community retailers are one click away.`,
    keywords: ["african", "nigeria", "ghana", "kenya", "west africa", "jollof", "fufu"],
  },
  caribbean: {
    title: "Caribbean Food Shops & Stores Online UK | Clip Services",
    description:
      "Caribbean groceries, jerk, plantain and more from UK independents — shop online on Clip Services.",
    h1: "Caribbean food shops online UK",
    intro: `Jerk seasoning, plantain, ackee, rice and peas — Caribbean independents across the UK bring island flavours to your kitchen. Clip Services lists trusted shops and market traders so you can order online, pay by card, and collect or get delivery where offered.`,
    keywords: ["caribbean", "jamaican", "jerk", "plantain", "ackee", "rum"],
  },
  asian: {
    title: "Asian Grocery Stores Online UK | Clip Services",
    description:
      "South Asian groceries, spices, rice and more — independent UK stores on Clip Services.",
    h1: "Asian grocery stores online UK",
    intro: `Basmati, spices, lentils, sauces and speciality ingredients from South Asian-led independents. Clip Services helps you find grocers listing online with secure checkout — supporting local traders from Bradford to London.`,
    keywords: ["asian", "indian", "pakistani", "bangladeshi", "bengali", "bazaar"],
  },
  nigerian: {
    title: "Nigerian Food & Groceries Online UK | Clip Services",
    description:
      "Buy Nigerian food online — egusi, jollof ingredients, snacks from UK independents. Clip Services.",
    h1: "Nigerian food & groceries online UK",
    intro: `Palm oil, garri, pepper mix, chin chin and ingredients for jollof and egusi — Nigerian independents list on Clip Services across London, Manchester and other cities. Order from verified stores with Stripe and WhatsApp order updates.`,
    keywords: ["nigerian", "nigeria", "jollof", "egusi", "suya", "garri"],
  },
  ghanaian: {
    title: "Ghanaian Food & Groceries Online UK | Clip Services",
    description:
      "Shito, kenkey ingredients, Ghanaian snacks from UK stores — Clip Services marketplace.",
    h1: "Ghanaian groceries online UK",
    intro: `Find gari, shito, plantain and Ghanaian staples from community retailers. Clip Services connects you with independents who understand what you’re cooking — with secure online payment.`,
    keywords: ["ghanaian", "ghana", "shito", "kenkey", "banku"],
  },
  jamaican: {
    title: "Jamaican Food & Ingredients Online UK | Clip Services",
    description:
      "Jerk, escovitch fish ingredients, Jamaican snacks — UK independents on Clip Services.",
    h1: "Jamaican food online UK",
    intro: `Scotch bonnet, allspice, escovitch seasonings and Caribbean cupboard essentials from Jamaican-led independents. Browse Clip Services for stores near you and checkout securely.`,
    keywords: ["jamaican", "jamaica", "jerk", "escovitch"],
  },
  "south-asian": {
    title: "South Asian Groceries Online UK | Clip Services",
    description:
      "Spices, atta, lentils and South Asian ingredients from UK independents — Clip Services.",
    h1: "South Asian grocery shopping online UK",
    intro: `Independent grocers serving South Asian communities list rice, flour, spices, snacks and household lines. Clip Services offers one marketplace with Stripe checkout and clear store profiles.`,
    keywords: ["south asian", "indian", "pakistani", "punjabi", "gujarati"],
  },
  halal: {
    title: "Halal Groceries & Meat Online UK | Clip Services",
    description:
      "Halal products from African & Asian independent UK stores — order on Clip Services.",
    h1: "Halal groceries online UK",
    intro: `Community stores listing halal-suitable and certified products use Clip Services to reach customers online. Browse independents, compare what’s in stock, and pay securely — with collection or delivery where the seller offers it.`,
    keywords: ["halal", "islamic", "certified", "meat"],
  },
};

/** High-converting city + community landing pages: /stores/[combo-slug] */
export const COMBO_PAGES = [
  { slug: "nigerian-london", community: "nigerian", citySlug: "london" },
  { slug: "nigerian-manchester", community: "nigerian", citySlug: "manchester" },
  { slug: "jamaican-london", community: "jamaican", citySlug: "london" },
  { slug: "jamaican-birmingham", community: "jamaican", citySlug: "birmingham" },
  { slug: "halal-manchester", community: "halal", citySlug: "manchester" },
  { slug: "caribbean-birmingham", community: "caribbean", citySlug: "birmingham" },
  { slug: "asian-leeds", community: "asian", citySlug: "leeds" },
  { slug: "african-bristol", community: "african", citySlug: "bristol" },
];

export function getComboPage(slug) {
  const s = String(slug || "")
    .toLowerCase()
    .trim();
  return COMBO_PAGES.find((c) => c.slug === s) || null;
}

/** Programmatic SEO: /search/[slug] — preset query + filters */
export const SEARCH_LANDING_PAGES = [
  { slug: "plantain-manchester", q: "plantain", city: "Manchester", community: "" },
  { slug: "halal-meat-birmingham", q: "halal meat", city: "Birmingham", community: "" },
  { slug: "nigerian-food-london", q: "nigerian food", city: "London", community: "nigerian" },
  { slug: "caribbean-food-leeds", q: "caribbean food", city: "Leeds", community: "caribbean" },
  { slug: "african-hair-products-uk", q: "hair products", city: "", community: "african" },
  { slug: "fufu-flour-online-uk", q: "fufu flour", city: "", community: "" },
  { slug: "jerk-seasoning-uk", q: "jerk seasoning", city: "", community: "caribbean" },
  { slug: "asian-grocery-manchester", q: "asian grocery", city: "Manchester", community: "asian" },
];

export function getSearchLandingPage(slug) {
  const s = String(slug || "")
    .toLowerCase()
    .trim();
  return SEARCH_LANDING_PAGES.find((p) => p.slug === s) || null;
}

export function listingMatchesCity(listing, cityDisplay) {
  const blob = `${listing?.role || ""} ${listing?.bio || ""} ${(listing?.services || []).join(" ")}`.toLowerCase();
  return blob.includes(cityDisplay.toLowerCase());
}

export function listingMatchesCategory(listing, keywords) {
  const blob = `${listing?.role || ""} ${listing?.bio || ""} ${listing?.category || ""} ${(listing?.services || []).join(" ")}`.toLowerCase();
  return keywords.some((k) => blob.includes(k.toLowerCase()));
}

/** Match listing text to a community page (nigerian, caribbean, …). */
export function listingMatchesCommunity(listing, communityKey) {
  const copy = COMMUNITY_COPY[communityKey];
  if (!copy) return false;
  return listingMatchesCategory(listing, copy.keywords);
}

/** First matching community (ordered for H1 / SEO). */
export function inferPrimaryCommunity(listing) {
  const order = [
    "nigerian",
    "jamaican",
    "ghanaian",
    "caribbean",
    "african",
    "asian",
    "south-asian",
    "halal",
  ];
  for (const k of order) {
    if (listingMatchesCommunity(listing, k)) return k;
  }
  return null;
}

/** Cities near another (internal linking). */
export const CITY_NEARBY = {
  manchester: ["liverpool", "leeds", "birmingham"],
  london: ["birmingham", "leicester", "nottingham"],
  birmingham: ["leicester", "nottingham", "manchester"],
  leeds: ["manchester", "sheffield", "bradford"],
  leicester: ["birmingham", "nottingham", "london"],
  bradford: ["leeds", "manchester", "liverpool"],
  bristol: ["birmingham", "london", "nottingham"],
  liverpool: ["manchester", "leeds", "sheffield"],
  sheffield: ["leeds", "manchester", "nottingham"],
  nottingham: ["leicester", "birmingham", "sheffield"],
};
