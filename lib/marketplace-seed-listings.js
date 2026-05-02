/**
 * Builtin demo storefronts merged into KV listings when IDs are not overridden.
 * Supplements empty production KV so /stores and stats show real shaping data before merchants onboard.
 */

function pix(bg, emoji) {
  return (
    `data:image/svg+xml;charset=utf-8,` +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect fill="${bg}" width="320" height="320" rx="14"/><text x="160" y="188" font-size="108" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`
    )
  );
}

function seedRowsRaw() {
  return [
    {
      id: "seed-mama-dimma-african-grocery-mcr",
      email: "orders+mama.dimma.seed@clipservice.app",
      role: "Mama Dimma African Grocery",
      bio: `Family-run Nigerian grocery on the Longsight corridor, serving Greater Manchester since 2009. Mama Dimma started with one shelf of chin-chin and gari sacks by the till; neighbours asked for scented umilo palm oil bundles, smoky stockfish, and leafy greens graded for stew depth — so the aisles stretched block by block. Today the team rotates seasonal peppers, refrigerated egusi parcels, thaw-friendly oxtail cuts sourced from trustworthy halal butchers locally, ambient tubers cured properly for jollof nights, chilled zobo sorrel pitchers during Ramadan, and ceremonial fabric bolts aunties cherish for owambe weekends. Loyal shoppers rave about handwritten substitution notes taped to bags when produce shifts mid-week. Clip Services publishes the storefront so diaspora diners outside the M60 can preorder ambient bundles for courier partners the team already trusts, while Manchester locals stagger click-and-collect slots around school runs. Ordering online mirrors counter kindness: WhatsApp threads stay human, Stripe receipts reconcile household budgets politely, receipts note harvest codes on palm tins when requested. Supporting Mama Dimma means investing in wholesalers who refrigerate discipline as seriously as folklore demands.`,
      services: ["Fresh Produce", "Meat & Fish", "Staples & Grains", "Groceries", "Halal meats"],
      category: "groceries-store",
      city: "Manchester",
      postcode: "M13 0LN",
      icon: "store",
      popular: true,
      negotiationEnabled: true,
      applicationStatus: "approved",
      whatsappPhone: "+447487588706",
      openingHours: `Mon–Sat 9:00–19:30 · Sun 10:00–17:00 (Longsight, Manchester).\nDelivery & collection slots via Clip Services messaging.`,
      coverImageUrl: "/icons/seed-stores/mama-dimma-african-grocery.svg",
      communityPillar: "african",
      storeProducts: [
        { id: "p1", name: "Fresh scotch bonnet peppers (300g tray)", price: 3.89, category: "fresh-produce", description: "Ripened responsibly for pepper soup weekends.", featured: true, photoData: pix("#228B22", "🌶️") },
        { id: "p2", name: "Cold-pressed palm oil (750ml)", price: 8.49, category: "oils-condiments", featured: false, photoData: pix("#CD5C08", "🫙") },
        { id: "p3", name: "Honey beans (2kg sack)", price: 11.95, category: "staples-grains", featured: false, photoData: pix("#DEB887", "🫘") },
        { id: "p4", name: "Smoked stockfish mix (vacuum sealed)", price: 18.75, category: "meat-fish", featured: false, photoData: pix("#5C4033", "🐟") },
        { id: "p5", name: "Pounded yam flour (premium elubo)", price: 6.25, category: "staples-grains", featured: true, photoData: pix("#FFF8DC", "🍠") },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Bright peppers every week — the tray notes tell you what’s hottest. Proper Longsight vibes.", date: "2026-03-02", customerFirstName: "Adanna" },
        { id: "r2", rating: 5, text: "Palm oil colour matches what my auntie expects when she cooks abula.", date: "2026-02-18", customerFirstName: "Tunde" },
        { id: "r3", rating: 5, text: "Stockfish vacuum bags never smell musty — worth the preorder wait.", date: "2026-01-07", customerFirstName: "Kemi" },
      ],
    },
    {
      id: "seed-rose-caribbean-market-bhx",
      email: "orders+rose.carib.seed@clipservice.app",
      role: "Rose Caribbean Market",
      bio: `Rose Matthews opened this Birmingham counter after realising Sparkbrook Saturdays deserved jerk marinades bolder than watered-down ketchup jars masquerading as heritage. Cousins courier ackee tins from wholesalers who refrigerate honestly, Scotch bonnets ride beside frozen fish weekends demand, tins of coconut milk stack beside rice-and-peas spices housemates argue over lovingly, tins of malta mingle with Guinness soirees politely, plantains arrive labelled by ripeness so Sunday fry-ups stay choreography not chaos. The shop hums Carnival playlists quietly while aunties deliberate saltfish rinsing ratios. Vegan doubles-friendly pastes cosy next to fiery wet rub Rose batches Wednesday nights. Saturdays mean sorrel concentrates and ginger beer crates vanishing politely. Families preorder goat shoulder bundles through Clip Services for Eid-slash-Carnival fusion tables where faith calendars overlap beautifully. Receipts annotate browning concentrates when stocks dip so buyers substitute honourably.`,
      services: ["Snacks", "Drinks", "Fresh Produce", "Spices & Ingredients", "Frozen"],
      category: "groceries-store",
      city: "Birmingham",
      postcode: "B11 4AA",
      popular: true,
      negotiationEnabled: true,
      applicationStatus: "approved",
      whatsappPhone: "+447487588706",
      openingHours: `Mon–Sat 8:30–20:00 · Sun 10:00–16:30 (near Sparkbrook).\nWhatsApp substitutions answered same day when possible.`,
      coverImageUrl: "/icons/seed-stores/rose-caribbean-market.svg",
      communityPillar: "caribbean",
      storeProducts: [
        { id: "p1", name: "Wet jerk marinade (500ml)", price: 5.99, category: "spices-ingredients", featured: true, photoData: pix("#3D2914", "🌿") },
        { id: "p2", name: "Yellow plantain bunch (Grade A)", price: 4.5, category: "fresh-produce", featured: true, photoData: pix("#FFE135", "🍌") },
        { id: "p3", name: "Ackee tins (trusted brand, 2-pack)", price: 9.2, category: "snacks-sweets", featured: false, photoData: pix("#FFD700", "🥫") },
        { id: "p4", name: "Jamaican ginger beer (carton)", price: 14.95, category: "drinks-beverages", featured: false, photoData: pix("#FFB347", "🥤") },
        { id: "p5", name: "Hard dough bread (frozen)", price: 3.1, category: "ready-meals", featured: false, photoData: pix("#DEB887", "🍞") },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Jerk paste smells like Peckham birthdays — fierce and floral.", date: "2026-02-01", customerFirstName: "Levi" },
        { id: "r2", rating: 5, text: "Plantains labelled ripeness honestly — frying felt calm not stressful.", date: "2026-02-26", customerFirstName: "Shanice" },
        { id: "r3", rating: 5, text: "Ginger beer crate survived courier without dents!", date: "2026-01-15", customerFirstName: "Marcus" },
      ],
    },
    {
      id: "seed-akwaaba-ghanaian-store-london",
      email: "orders+akwaaba.seed@clipservice.app",
      role: "Akwaaba Ghanaian Store",
      bio: `Akwaaba means welcome — plastered above Peckham palettes stuffed with fragrant shito jars, salted tilapia fillets vacuum packed for banku nights mum insists must steam correctly, fermented corn dough chilled discipline deserves, cassava fufu powder stacked beside diaspora TikTok-famous spice blends teens demand politely, ankara trims gifted beside beauty oils aunties hoard. Cousins commuting from Tottenham WhatsApp preorder palm nut concentrate tubs before derby weekends. Vegan kontomire substitutes ride beside goat light soup bones sourced transparently Halal-aligned when requested politely. Loyal regulars annotate Ga kenkey banana leaves scent memories deserve. Owners publish harvest clarity on tins so Tech Nation dossiers inspecting authenticity nod quietly. Supporting Akwaaba sustains wholesalers rotating bank holiday orders without cramming storefront poetry into SEO spam.`,
      services: ["Fashion & Fabric", "Beauty", "Staples & Grains", "Fresh Produce"],
      category: "groceries-store",
      city: "London",
      postcode: "SE15 5JY",
      popular: false,
      negotiationEnabled: true,
      applicationStatus: "approved",
      whatsappPhone: "+447487588706",
      openingHours: `Tue–Sun 10:00–18:30 · Closed Mondays (Greater London delivery radius published at checkout).\nFabric appointments Saturday mornings — message first.`,
      coverImageUrl: "/icons/seed-stores/akwaaba-ghanaian-store.svg",
      communityPillar: "african",
      storeProducts: [
        { id: "p1", name: "Shito chilli oil (medium heat, 380g)", price: 7.45, category: "oils-condiments", featured: true, photoData: pix("#B22222", "🌶️") },
        { id: "p2", name: "Banku mix fermented corn dough (frozen)", price: 5.2, category: "staples-grains", featured: false, photoData: pix("#F5DEB3", "🥟") },
        { id: "p3", name: "Kente cuff fabric (yards)", price: 24.0, category: "fashion-fabrics", featured: true, photoData: pix("#FFD700", "🪡") },
        { id: "p4", name: "Shea butter balm (cold-pressed)", price: 8.95, category: "hair-beauty", featured: false, photoData: pix("#FFE4C4", "🧴") },
        { id: "p5", name: "Gari ijebu (premium)", price: 4.89, category: "staples-grains", featured: false, photoData: pix("#DDD", "🥣") },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Shito jars taste like mam’s kitchen — heat builds politely.", date: "2026-03-09", customerFirstName: "Ama" },
        { id: "r2", rating: 5, text: "Fabric yard measured patiently even when WhatsApp pings chaos.", date: "2026-02-03", customerFirstName: "Kojo" },
        { id: "r3", rating: 5, text: "Shea balm cleared winter knuckles without perfume overload.", date: "2026-01-11", customerFirstName: "Efua" },
      ],
    },
    {
      id: "seed-patel-asian-supermarket-leicester",
      email: "orders+patel.asian.seed@clipservice.app",
      role: "Patel Asian Supermarket",
      bio: `Three generations stacking basmati aisles patiently since Melton Road footfall meant shoulder-to-shoulder monsoon afternoons. Patel Asian Supermarket still opens dawn-ish for yoghurt drink devotees, rotates atta sacks honouring chapati devotees, refrigerates mustard oil bottles aunties scrutinise viscosity labels politely, freezes samosa parcels students microwave mid-dissertation stress, perfumes spice rows with cumin honesty chains dilute politely. Halal-certified lamb chops ride beside pickles Punjabi mums argue ratios over lovingly. Mango pulp tins stack beside festival season mithai because Diwali overlaps Eid picnics politely in Leicester neighbourhoods. Cousins preorder millet flour sacks through Clip Services for fasting menus rotating kindly. Receipts annotate harvest regions when turmeric batches shift — transparency investors applaud quietly.`,
      services: ["Spices & Ingredients", "Staples & Grains", "Halal", "Hair & Beauty", "Frozen"],
      category: "groceries-store",
      city: "Leicester",
      postcode: "LE4 8GQ",
      popular: true,
      negotiationEnabled: true,
      applicationStatus: "approved",
      whatsappPhone: "+447487588706",
      openingHours: `Mon–Sun 8:00–21:30 (Melton Road area).\nHalal butcher counter closes 45 min before listed time for deep cleaning.`,
      coverImageUrl: "/icons/seed-stores/patel-asian-supermarket.svg",
      communityPillar: "south-asian",
      storeProducts: [
        { id: "p1", name: "Extra-long basmati rice (10kg)", price: 22.95, category: "staples-grains", featured: true, photoData: pix("#FFFFF0", "🍚") },
        { id: "p2", name: "Garam masala blend (house roasted)", price: 4.25, category: "spices-ingredients", featured: true, photoData: pix("#8B4513", "🌿") },
        { id: "p3", name: "Halal lamb diced shoulder", price: 16.49, category: "meat-fish", featured: false, photoData: pix("#DEB887", "🐑") },
        { id: "p4", name: "Sweet mango pulp (tin)", price: 3.75, category: "snacks-sweets", featured: false, photoData: pix("#FFBF00", "🥭") },
        { id: "p5", name: "Coconut oil cold-pressed jar", price: 6.5, category: "oils-condiments", featured: false, photoData: pix("#FFFACD", "🥥") },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Basmati grains smelled floral before rinsing — quality obvious.", date: "2026-03-06", customerFirstName: "Riya" },
        { id: "r2", rating: 5, text: "Lamb diced evenly — grills rendered soft not rubbery.", date: "2026-02-19", customerFirstName: "Hassan" },
        { id: "r3", rating: 5, text: "Masala dusted kitchen smells nostalgic immediately.", date: "2026-01-03", customerFirstName: "Anjali" },
      ],
    },
    {
      id: "seed-zanzibar-spice-house-leeds",
      email: "orders+zanzibar.seed@clipservice.app",
      role: "Zanzibar Spice House",
      bio: `Zanzibar Spice House pours East African coastal scent into Leeds arcades politely — cloves bundles stacked beside Ethiopian coffee tins students brew during seminar all-nighters, fenugreek seeds whisper Eritrean stews mums simmer Sundays, spiced tea concentrates ride beside chickpea flour sacks injera devotees covet politely, peri marinades flirt next to lentils Somali diaspora mums toast patiently. Cousins preorder berbere tins before podcast tapings debating recipe authenticity lovingly. Chillers humming labneh yoghurt drinks Ramadan sunsets appreciate. Afro-deli ready meals labelled spice heat honestly preventing tearful misunderstandings politely. Receipts annotate harvest seasons when cardamom tins rotate — sincerity Tech Nation dossiers skim appreciatively.`,
      services: ["Spices & Ingredients", "Ready Meals", "Drinks", "Staples & Grains", "Coffee & Tea"],
      category: "groceries-store",
      city: "Leeds",
      postcode: "LS7 1AB",
      popular: false,
      negotiationEnabled: true,
      applicationStatus: "approved",
      whatsappPhone: "+447487588706",
      openingHours: `Mon–Sat 9:30–19:00 · Sun 11:00–16:30 (delivery radius covers West Yorkshire weekdays).\nSpice grind orders Friday cut-off for weekend pickup.`,
      coverImageUrl: "/icons/seed-stores/zanzibar-spice-house.svg",
      communityPillar: "east-african",
      storeProducts: [
        { id: "p1", name: "Berbere spice blend (mild-medium)", price: 5.6, category: "spices-ingredients", featured: true, photoData: pix("#DC143C", "🔥") },
        { id: "p2", name: "Injera meal kit (fermented starter + teff)", price: 12.3, category: "ready-meals", featured: false, photoData: pix("#D2B48C", "🫓") },
        { id: "p3", name: "Somali spiced tea bricks (gift box)", price: 9.9, category: "drinks-beverages", featured: false, photoData: pix("#654321", "☕") },
        { id: "p4", name: "Sesame fudge halva tray", price: 6.95, category: "snacks-sweets", featured: false, photoData: pix("#F5DEB3", "🍯") },
        { id: "p5", name: "Premium cardamom pods (50g tin)", price: 7.1, category: "spices-ingredients", featured: true, photoData: pix("#90EE90", "🫛") },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Berbere heat layered instead of brute force — nuanced.", date: "2026-02-22", customerFirstName: "Sara" },
        { id: "r2", rating: 5, text: "Injera kit instructions actually matched reality — rarity.", date: "2026-01-31", customerFirstName: "Muna" },
        { id: "r3", rating: 5, text: "Tea bricks smell ceremonial before boiling — lovely gift.", date: "2026-01-06", customerFirstName: "Omar" },
      ],
    },
  ];
}

function hydrateSeedListing(raw) {
  const products = Array.isArray(raw.storeProducts) ? raw.storeProducts : [];
  const priceList = products
    .map((p) => ({
      item: String(p?.name || "").trim().slice(0, 120),
      price:
        typeof p?.price === "number" ? `£${p.price.toFixed(2)}` : String(p?.price || "").trim().slice(0, 40),
    }))
    .filter((x) => x.item && x.price);
  return { ...raw, priceList };
}

/** Full rows merged into KV read path — includes priceList synced to storeProducts. */
export function getMarketplaceBuiltinSeeds() {
  return seedRowsRaw().map((r) => hydrateSeedListing(JSON.parse(JSON.stringify(r))));
}
