/**
 * Clip Services starter blog corpus (3 pillar posts). Edit here and redeploy.
 * @typedef {{ slug: string; title: string; category: string; metaDescription: string;
 *   excerpt: string; datePublished: string; dateModified: string; author: string;
 *   featuredImage: string; imageAlt: string; readMinutes: number; featured?: boolean;
 *   storesInArticle?: {label:string;href:string}[];
 *   sections: Array<{ id?: string; h2: string; html: string }>;
 * }} BlogPostExport
 */

/** @type {BlogPostExport[]} */
export const BLOG_POSTS = [
  {
    slug: "where-to-buy-nigerian-food-online-uk",
    title: "Where to Buy Nigerian Food Online in the UK",
    category: "shopping-guides",
    metaDescription:
      "Buy Nigerian food online in the UK: palm oil, garri, fufu flour, egusi and stockfish from trusted independents. Links to Clip Services stores and category aisles.",
    excerpt:
      "Shopping for Nigerian ingredients online saves time—but only when you know how to vet sellers, bundle ambient and chilled goods wisely, and support independents on Clip Services.",
    datePublished: "2026-05-02",
    dateModified: "2026-05-03",
    author: "Sonia Chidinma Otikpa",
    featuredImage: "/icons/blog/featured-nigerian.svg",
    imageAlt: "Nigerian pantry staples illustration for shoppers in the UK",
    readMinutes: 5,
    featured: true,
    storesInArticle: [
      { label: "Browse all stores", href: "/stores" },
      { label: "Spices & ingredients", href: "/categories/spices-ingredients" },
      { label: "Staples & grains", href: "/categories/staples-grains" },
      { label: "Nigerian community hub", href: "/community/nigerian" },
    ],
    sections: [
      {
        id: "staples-to-stock",
        h2: "Nigerian staples that are built for cupboard life",
        html: `<figure class="blog-figure"><img src="/icons/blog/featured-nigerian.svg" width="880" height="495" loading="lazy" decoding="async" alt="Colourful collage-style illustration of Nigerian staples for UK online orders"></figure>
<p>If you grew up swapping tips in car parks outside wholesalers, buying Nigerian food online can feel oddly quiet—but the staples stay familiar: garri graded for soaking or frying, melon seeds (egusi) toasted until aromatic, smoky stockfish sold by honesty of smell more than barcode gloss, crayfish sacks that coax soups awake even when rationed tightly, palm oil bottled with harvest dates you can chase, fermented batters tucked beside chillers quietly reminding you Saturday breakfast deserves theatre.</p>
<h3>Fufu, swallow flours and cassava maths</h3>
<p>Lafun diverges subtlety from smoother amala moods; swallow lovers debate hydration percentages like DJs tweak tempo. Ordering online means reading listings beyond hero photography—grain fineness matters, fermentation notes deserve screenshot receipts, sacks heavy enough to justify cabinet reinforcement arrive best when merchants spell handling instructions plainly.</p>
<h3>Oils, ferments and fish bundles</h3>
<p>Palm oils tint soups emotionally; substitutes labelled vague “vegetable blends” sabotage bitterness balances chefs nurse carefully. Pair stockfish pickups with pepper mixes sourced same seller when possible—substitutions stay cousin-text-message simple rather than existential.</p>
<p>Marry ambient bulk orders with refrigerated nuance: dried fish bundles ride beside Scotch bonnets or leafy greens sourced from merchants segregating smoky odours cleanly from cosmetics aisles accidental couriers wedge together.</p>
<blockquote class="blog-pull"><p>Trust isn’t glossy photography—it’s how transparently merchants answer WhatsApp pings about substitutions midweek.</p></blockquote>`,
      },
      {
        id: "vet-sellers-online",
        h2: "How to find authentic Nigerian groceries online",
        html: `<p>Sourcing Nigerian groceries online rewards patience layered like pepper soup reductions. Clip Services anchors every storefront beside <strong><a href="/stores">the live marketplace index</a></strong>, pairing Stripe receipts with identities sellers refuse to outsource to anonymous grey bots.</p>
<h3>Use community and category filters together</h3>
<p>Cross-check <strong><a href="/community/nigerian">Nigerian discovery pages</a></strong> alongside city hubs—whether you pickup through <a href="/cities/london">London</a> neighbourhoods pulsing weekly or preorder nationwide from quieter regional wholesalers stocking pepper mixes supermarket chains pretend don’t exist. Clip Services storefront bios flag halal overlaps, multilingual labels, refrigerated courage levels—signals chains bury beneath sameness SKUs.</p>
<h3>Evidence worth screenshotting before checkout</h3>
<p>Prefer sellers publishing handling timelines for smoky fish sacks, substitutions policies respecting Ramadan delivery cadence, frozen pepper blend rotation schedules, multilingual allergen cues (sesame crustaceans sulphites linger honestly here), Stripe receipts reconciling PAYE budgeting spreadsheets families actually maintain—not vanity dashboards hiding refund friction.</p>
<h3>Category shortcuts that mirror real cupboards</h3>
<p>For oils brittle seeds brittle ferments roam <a href="/categories/spices-ingredients">Spices &amp; ingredients</a>; grains flours moi moi scaffolding hide inside <a href="/categories/staples-grains">Staples &amp; grains</a>; broaden meals honouring neighbouring diaspora brilliance via <a href="/categories/meat-fish">Meat &amp; fish</a> pickups whenever goat cuts headline birthdays.</p>
<p>If you miss the sensory overload of crowded aisles, recreate it deliberately—open deliveries near an open window, cue highlife playlists softly, invite someone judgy enough to critique your palm oil colour choices. Shopping online never needs to feel sterile.</p>`,
      },
      {
        id: "order-smart-shop-local",
        h2: "Making online orders predictable (and humane)",
        html: `<ul class="blog-list"><li>Split carts boldly: smoky fish Scotch bonnets separate from perfumes soap refills—cousins dodge odour feuds politely.</li><li>Allergies deserve capital letters diaspora aisles cram triggers generously.</li><li>Batch thaw fermented batters respect Sunday patience windows.</li><li>Sunday cooks justify starch sacks ethically—freeze swallow portions flat.</li><li>Note mosque-adjacent delivery etiquette when riders share prayer breaks.</li></ul>
<h3>Rhythm between cities and nationwide couriers</h3>
<p>Wandering London hotspots differs emotionally from trusting ambient-hauls shipped lovingly across counties—both honourable when merchants publish cut-off honesty. Nigerian inventory depth correlates with refrigeration pride paragraphs sellers craft without marketing agencies ghostwriting.</p>
<p>Clip Services keeps checkout transparent: message sellers about rice sack swaps, escalate pepper heat tolerance, confirm palm oil harvest batch codes before payment finalises—digital dignity mirroring counter respect aunties demand.</p>
<p>When couriers arrive, clear hallway space early; fragile pepper tubs appreciate gentle unboxing. If something bruises, decent sellers document replacements without gaslighting—another reason independents beat anonymous marketplaces that treat bruised produce as “character building.”</p>
<h3>Stretch your reading diet</h3>
<p>Pair this guide with <a href="/blog/guide-african-caribbean-asian-stores-manchester">Manchester storefront geography</a> when northern relatives text photo requests, sprinkle <a href="/blog/essential-caribbean-ingredients-order-online">Caribbean pantry courage</a> beside jollof experiments borrowing Scotch bonnet folklore.</p>
<p><strong>Next step:</strong> reopen <a href="/stores">/stores</a>, favourite two merchants covering ambient refrigerated cadence symmetrically, checkout knowing independents—not extractive aggregators—earn the margin tonight.</p>`,
      },
    ],
  },
  {
    slug: "guide-african-caribbean-asian-stores-manchester",
    title: "A Guide to African, Caribbean and Asian Stores in Manchester",
    category: "shopping-guides",
    metaDescription:
      "African, Caribbean and Asian supermarkets across Greater Manchester — Longsight, Cheetham Hill, Rusholme — with links to Clip Services city pages, halal aisles and meat counters.",
    excerpt:
      "Greater Manchester stacks plantain towers, jerk tubs, halal counters and spice arcs block by block—here is how to navigate it on foot and through Clip Services online.",
    datePublished: "2026-05-01",
    dateModified: "2026-05-03",
    author: "Sonia Chidinma Otikpa",
    featuredImage: "/icons/blog/featured-manchester.svg",
    imageAlt: "Schematic neighbourhood map motif for diaspora groceries in Greater Manchester",
    readMinutes: 6,
    storesInArticle: [
      { label: "Manchester city listings", href: "/cities/manchester" },
      { label: "Browse stores", href: "/stores" },
      { label: "Fresh produce aisle", href: "/categories/fresh-produce" },
      { label: "Halal products shelf", href: "/categories/halal-products" },
    ],
    sections: [
      {
        id: "why-manchester",
        h2: "Why Greater Manchester excels for diaspora groceries",
        html: `<p>Manchester marinated factory brick into hospitality arteries feeding students carers creatives nurses—every postcode insisting plantains arrive with sincerity, jerk marinade shelves flex between paste tins dry rub honours, halal butcher counters narrate humane sourcing calmly beside yam sacks thumping reassuring metre.</p>
<p>Nigerian wholesale cadences dovetail Afro-Caribbean chillers humming beside Indian subcontinent spice palettes; messy geographically luscious culinarily. Rain punishes hurried shoppers mercilessly—plan collapsible sacks thermos patience playlists worth queue camaraderie.</p>
<p>Students rotating between lectures and communal kitchens learn which aisles refill bitter leaf on Wednesday mornings; fundraisers compare lamb prices with the same tenderness they argue jollof rice mythology. Density here is why “nipping to Longsight” can mean returning with six bags, three WhatsApp voice notes, and a recipe scribbled on the back of a receipt.</p>
<h3>Use Clip Services as compass before leaving home</h3>
<p>Open <strong><a href="/cities/manchester">Manchester listings</a></strong>, filter cuisines honestly, screenshot opening hours clergy volunteers misremember politely. Sellers publish Ramadan carnival Eid adaptations faster than laminated window signs yellow—trust bios before nostalgia alone.</p>
<blockquote class="blog-pull"><p>Neighbours text “grab pimento tins near Auntie Kay” because relationships precede SKU spreadsheets—discovery tools must amplify that tenderness.</p></blockquote>`,
      },
      {
        id: "neighbourhoods",
        h2: "Where to roam: neighbourhoods with serious inventory",
        html: `<h3>Longsight &amp; Cheetham Hill depth</h3><p>Corridors stack ambient staples towering above prams beside fabric bundles earmarked owambe Saturdays. Midweek midday restocks reward planners avoiding Saturday crush meltdowns toddlers amplify beautifully.</p>
<h3>Rusholme arcs &amp; Caribbean corners</h3><p>Tins ackee guarding fridges guarding green seasoning mashups signal seriousness jerk culture honours—dry rub <em>and</em> wet paste coexist adults respect. Expect pepper heat honesty labelling Scotch bonnets bravado deserves.</p>
<h3>Whalley Range &amp; Chorlton echoes</h3><p>Smaller micro-retail kitchens freeze soups ethically for pickup arcs—monitor Clip Services for pop-ups marrying vegan doubles with saltfish zealots politely.</p>
<h3>Asian halal overlays everyone should sample</h3><p>Storefronts feeding South Asian congregations refrigerate goat coveted Nigerian birthdays—cross pollinate errands via <a href="/categories/halal-products">Halal products</a> tags before mosque parking politics escalate unnecessarily.</p>
<figure class="blog-figure blog-figure--map" role="img" aria-label="Schematic map of diaspora neighbourhoods in Greater Manchester"><svg viewBox="0 0 800 420" xmlns="http://www.w3.org/2000/svg" width="100%" height="auto"><rect fill="#f5f0e8" width="800" height="420" rx="12"/><path d="M80 340 L220 280 L340 260 L460 280 L620 310 L740 290" stroke="#8b3a3a" stroke-width="4" fill="none"/><circle cx="260" cy="210" r="16" fill="#d4a017"/><circle cx="420" cy="190" r="16" fill="#d4a017"/><circle cx="520" cy="240" r="16" fill="#d4a017"/><circle cx="600" cy="210" r="16" fill="#d4a017"/><text x="260" y="160" fill="#8b3a3a" font-size="22" font-family="Georgia,serif">Longsight</text><text x="450" y="150" fill="#8b3a3a" font-size="22" font-family="Georgia,serif">Rusholme</text><text x="500" y="320" fill="#8b3a3a" font-size="22" font-family="Georgia,serif">Cheetham Hill</text><text x="600" y="160" fill="#8b3a3a" font-size="22" font-family="Georgia,serif">Whalley Range</text><text x="60" y="55" fill="#2c1810" font-size="26" font-weight="700">Manchester neighbourhoods</text><text x="60" y="395" fill="#5c4033" font-size="17">Pins sketch legendary grocery corridors — pair with storefront hours on Clip Services before you travel.</text></svg></figure>
<p>Use <strong><a href="/categories/fresh-produce">Fresh produce</a></strong> tagging when scouting callaloo bundles or plantain planks—ripeness conversations deserve clerks who ripen alongside customers seasonally.</p>
<p>Transit links matter: trams, buses, and overstuffed car boots all play a role—so does knowing which stores let you park briefly while someone runs in for “just scotch bonnets” that somehow become three bags. Save favourite routes in your maps app labelled with parking reality, not optimism.</p>`,
      },
      {
        id: "order-online-loop",
        h2: "Ordering online—and supporting independents ethically",
        html: `<p>Clip Services fuses conversational commerce Stripe receipts—message substitutions without shame, preorder bulk ethically, dodge venture-subsidised phantom inventory theatre bleeding cities quietly.</p>
<h3>Category cheat sheet bridging cultures</h3>
<p>Jerk nights marrying halal goat deserve <a href="/categories/meat-fish">Meat &amp; fish</a> plus <a href="/blog/essential-caribbean-ingredients-order-online">Caribbean essentials reading</a> same evening notebooks. Nationwide ambient hauls respecting ice-pack realism ship nationally when sellers publish chemistry honestly.</p>
<h3>Before you commute from Liverpool or Sheffield</h3>
<p>Wider northwest fans sometimes caravan monthly—coordinate chill boxes text threads Clip Services storefront threads simplify beautifully.</p>
<p>Coach groups often split the haul: one cousin handles frozen, another handles ambient-heavy rice sacks, someone else negotiates plantain ripeness like a diplomat. Make a shared note with “hard rules” (no squashed breadfruit) and “soft preferences” (ideal scotch bonnet size) so friendships survive A56 traffic.</p>
<p>If smoke soups headline weekends refresh <a href="/blog/where-to-buy-nigerian-food-online-uk">Nigerian online sourcing habits</a> then reaffirm favourites inside <strong><a href="/stores">/stores</a></strong> mapping Manchester courage outward.</p>
<p>Older relatives still bless shopkeepers who remember how they prefer their plantains; teenagers film restock TikToks that accidentally become neighbourhood news. Indie retail is sentimental infrastructure—shopping online through the same merchants simply extends that relationship onto rails that respect receipts, payouts, and the awkward Tuesday when you realise you forgot pimento berries again.</p>
<p>For drinks and batch-cook tins, skim <a href="/categories/drinks-beverages">Drinks &amp; beverages</a> listings when sorrel concentrates or tonic wines appear seasonally—pair with <a href="/categories/oils-condiments">Oils &amp; condiments</a> if you are building gift hampers for cousins down south.</p>`,
      },
    ],
  },
  {
    slug: "essential-caribbean-ingredients-order-online",
    title: "5 Essential Caribbean Ingredients You Can Now Order Online",
    category: "recipes",
    metaDescription:
      "Five cornerstone Caribbean pantry ingredients for UK cooks: Scotch bonnets, jerk builds, thyme and allspice, plantains, saltfish — order via Clip Services independents.",
    excerpt:
      "Sunday dinner survives when Scotch bonnets, jerk layers, thyme, plantains and saltfish arrive from sellers who refrigerate honestly—here is the shortlist.",
    datePublished: "2026-04-30",
    dateModified: "2026-05-03",
    author: "Sonia Chidinma Otikpa",
    featuredImage: "/icons/blog/featured-caribbean.svg",
    imageAlt: "Caribbean pantry illustration showing peppers, herbs and tins",
    readMinutes: 5,
    storesInArticle: [
      { label: "Browse stores", href: "/stores" },
      { label: "Caribbean hub", href: "/community/caribbean" },
      { label: "Spices & ingredients", href: "/categories/spices-ingredients" },
      { label: "Search jerk seasoning UK", href: "/search?q=jerk%20seasoning" },
    ],
    sections: [
      {
        id: "heat-and-green",
        h2: "1 · Scotch bonnet heat and honest green seasoning",
        html: `<figure class="blog-figure"><img src="/icons/blog/featured-caribbean.svg" loading="lazy" decoding="async" width="880" height="495" alt="Illustrated Caribbean staples including Scotch bonnets and thyme"></figure>
<p>Scotch bonnets flirt fruitiness before brute capsaicin—freeze extras flat labelled by harvest week sparing Tuesday glove melodrama toddlers narrate vividly. Bottle green seasoning with discipline: thyme stems scallion sass ginger garlic weight coriander stems politely rescued from compost guilt maybe bonnet blush when blend viscosity demands bravery.</p>
<h3>Purchasing online without betraying ripeness folklore</h3>
<p>Serious storefronts annotate pepper crates shipping bruise timelines refrigerated honesty—Clip Services bios reward merchants publishing photos weekly not stock photography museums recycle.</p>
<p>Navigate <strong><a href="/community/caribbean">Caribbean community hubs</a></strong> alongside <strong><a href="/categories/spices-ingredients">Spices &amp; ingredients</a></strong> so marinade jars marrying pimento-heavy blends surface before ketchup-laden tourist traps masquerade heritage falsely.</p>
<p>Run comparative searches (<a href="/search?q=jerk%20seasoning">jerk seasoning</a>) reading ingredient decks transparency deserves—paprika-heavy shortcuts rarely honour pimento choreography grandmothers supervise.</p>
<p>Document your heat tolerance like you document oven temperatures: what felt “medium” in 2019 may feel volcanic after a few mild years of British pub food. Build a household Scoville glossary in the notes app so gift-givers stop buying ghost-pepper ketchup as a joke.</p>`,
      },
      {
        id: "warm-spices-oil-runs",
        h2: "2 · Warm spices, browning, and purposeful oil pulls",
        html: `<p>Whole allspice (pimento) berries bruised mortar-side perfume escovitch dreams better than dusty tins souvenir shelves abandoned post-carnival. Browning—not treacle caricature—caramelises responsibly when drops respect patience; miniature bottles tame regret cabinets inherit otherwise.</p>
<p>Reserve neutral oils boasting high smoke generosity for frying plantains green; finishing oils flirt delicately afterward so kitchens avoid bitter aftertastes sneering quietly.</p>
<p>Build a “Sunday shelf” in the cupboard: one jar of wet jerk, one bag of whole pimento, one bottle of browning you actually opened (not the decorative one from 2019). Rotate stock the way music rotations stay fresh—older powders lose perfume faster than playlists lose relevance.</p>
<p>When reading labels online, treat mysterious “spice blends” with polite suspicion until ingredient decks list allspice and thyme before corn syrup cosplay.</p>
<blockquote class="blog-pull"><p>Caribbean depth whispers disciplined spice choreography long before influencer sauce deals hijack hashtags.</p></blockquote>`,
      },
      {
        id: "plantain-coconut-saltfish",
        h2: "3–5 · Plantains, coconut milk, saltfish discipline",
        html: `<h3>3 · Plantains calibrated to intention</h3><p>Green planks demand fearless oil thickness kitchen roll virtues playlists extending patience politely; black-peel sweetness caramelises plantains into dessert seriousness chains mislabel ripeness dishonestly correcting.</p>
<p>Merchant listings describing curvature spots honestly deserve bookmarks— vague “fresh produce” euphemisms waste fuel emotional labour alike.</p>
<h3>4 · Coconut milk versus cream choreography</h3><p>Rundowns crave cream viscosity whereas rice politely asks milk tenderness—freeze leftovers deli-labelled stew ambitions prevent Monday confusion escalating.</p>
<p>Pair tins with merchants refrigerating thoughtfully—ambient-only coconut cans survive pantries elegantly when rotations disciplined.</p>
<h3>5 · Saltfish (salt cod) choreography</h3><p>Rinse soak repeat lovingly until nostalgic punishment aromas fade cooperative—bone-in heritage cuts hydrate evenly for buljol spreads ackee harmonies deserve.</p>
<p>Boil-off tests matter: flake a corner after simmering to confirm salt levels before you combine with premium ackee tins. That pause is what separates calm Saturday cooks from people who blame ancestry when the skillet “tastes like the North Sea had opinions.”</p>
<p>Honour sellers bundling salted cod beside <strong><a href="/categories/staples-grains">grain staples</a></strong> so Saturday soups remain single-checkout poetry.</p>
<figure class="blog-figure"><img src="/icons/og-cover.svg" loading="lazy" decoding="async" width="880" height="495" alt="Clip Services diaspora groceries brand tile"></figure>
<h3>Widen your map ethically</h3>
<p>Jerk nights bridging halal arcs pair reading <a href="/blog/guide-african-caribbean-asian-stores-manchester">Manchester corridors guide</a> alongside <a href="/blog/where-to-buy-nigerian-food-online-uk">Nigerian pantry sourcing etiquette</a>—continent kindness shrinks politely when storefronts networked intentionally.</p>
<p>Batch-prep green seasoning on quiet evenings: blitz, taste, adjust salt knowing Wednesday curries thank you. Freeze half in ice-cube trays so midweek rice never feels abandoned. Document your ratios in the notes app—future you forgets scallion ratios mysteriously every September.</p>
<p>When hosting friends new to Caribbean tables, translate heat gently: offer yogurt or cucumber alongside pepper-forward trays so pride and comfort coexist without diluting culture into tourist buffet cosplay.</p>
<p><strong>Your move:</strong> reopen <strong><a href="/stores">/stores</a></strong>, favourite merchants posting pepper integrity essays, refrigerate coconut courage before simmer Sundays accelerate dramatically.</p>`,
      },
    ],
  },
];
