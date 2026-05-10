/**
 * Builtin demo storefronts merged into KV listings when IDs are not overridden.
 * Supplements empty production KV so /stores and stats show real shaping data before merchants onboard.
 */

function seedRowsRaw() {
  const hours = `Mon–Sat 9am–7pm · Sun 10am–4pm (UK).\nDelivery and collection arranged by message once you checkout.`;

  const u = {
    groceries: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80",
    tropical: "https://images.unsplash.com/photo-1606914469633-bd39206ea739?w=1200&q=80",
    halal: "https://images.unsplash.com/photo-1607623814075-e51df27aff23?w=1200&q=80",
    market: "https://images.unsplash.com/photo-1526318896980-cf784e088935f?w=1200&q=80",
    spices: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&q=80",
  };

  /** Small product thumbnails (Unsplash — free to use hotlink pattern). */
  const t = {
    plantain: "https://images.unsplash.com/photo-1603833665858-ae61fbc39e76?w=400&q=80",
    yam: "https://images.unsplash.com/photo-1586201375761-83865001e309?w=400&q=80",
    flour: "https://images.unsplash.com/photo-1633438967025-cb7d097a7e5c?w=400&q=80",
    oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80",
    egusi: "https://images.unsplash.com/photo-1615485925694-928b630bd3d2?w=400&q=80",
    fish: "https://images.unsplash.com/photo-1519708227418-c8fd629a6325?w=400&q=80",
    spices: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80",
    grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80",
    chilli: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80",
    jerk: "https://images.unsplash.com/photo-1604908176997-125f279ccdfb?w=400&q=80",
    bread: "https://images.unsplash.com/photo-1586444248902-2f653ed6403e?w=400&q=80",
    drink: "https://images.unsplash.com/photo-1558642452-9d2a7feb7fd6?w=400&q=80",
    ackee: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80",
    rice: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&q=80",
    lamb: "https://images.unsplash.com/photo-1603048297179-0979f6c7e4c9?w=400&q=80",
    chicken: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&q=80",
    ghee: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80",
    fabric: "https://images.unsplash.com/photo-1574631800870-deaa6b4d2987?w=400&q=80",
    coconut: "https://images.unsplash.com/photo-1621263764928-df144f01e587?w=400&q=80",
    curry: "https://images.unsplash.com/photo-1455619452474-d7be8d079209?w=400&q=80",
    citrus: "https://images.unsplash.com/photo-1547514701-42782101795e?w=400&q=80",
    casava: "https://images.unsplash.com/photo-1585320806297-f9791720b74f?w=400&q=80",
  };

  return [
    {
      id: "seed-mama-dimma-african-grocery-mcr",
      email: "orders+mama.d.seed@clipservice.app",
      role: "Mama D's African Grocery",
      bio:
        `Mama D keeps Longsight ticking with sacks of cassava beside bottles of palm oil that actually smell like Sunday soup. Friends message when plantain crates land; aunties linger over stockfish graded for soups that bubble all afternoon.
We cheer for Lagos spice runs and Kumasi breakfasts all the same window. Checkout on Clip mirrors the counter chatter you already know — simple swaps, receipts you can screenshot, Stripe when you prefer card over cash.` +
        ` If you grew up plating jollof for twelve, you deserve a grocer who treats tins and tubs with patience, not pity. Pilot season means we bundle orders carefully while we learn rhythms together.`,
      services: ["Fresh Produce", "Meat & Fish", "Staples & Grains", "Groceries"],
      category: "groceries-store",
      city: "Manchester",
      postcode: "M13 0LN",
      icon: "store",
      popular: true,
      negotiationEnabled: true,
      applicationStatus: "approved",
      pilotBadge: "Pilot — Onboarding",
      heritageTags: ["Nigerian", "Ghanaian"],
      whatsappPhone: "+447830001101",
      openingHours: `Longsight, Manchester · ${hours}`,
      coverImageUrl: u.groceries,
      communityPillar: "west-african",
      storeProducts: [
        {
          id: "p1",
          name: "Ripe yellow plantain (graded bunch)",
          price: 4.95,
          category: "fresh-produce",
          description: "Firm enough for grilling, sweeter by the day on the sill.",
          featured: true,
          thumbUrl: t.plantain,
        },
        {
          id: "p2",
          name: "Puna yam (approx. 1.2 kg tuber)",
          price: 5.89,
          category: "fresh-produce",
          featured: true,
          thumbUrl: t.yam,
        },
        {
          id: "p3",
          name: "Fufu flour blend (cassava & plantain)",
          price: 6.49,
          category: "staples-grains",
          thumbUrl: t.flour,
        },
        {
          id: "p4",
          name: "Pure red palm oil (750 ml)",
          price: 8.99,
          category: "oils-condiments",
          thumbUrl: t.oil,
        },
        {
          id: "p5",
          name: "Ground egusi melon (500 g)",
          price: 7.25,
          category: "staples-grains",
          thumbUrl: t.egusi,
        },
        {
          id: "p6",
          name: "Smoked stockfish steaks (thick cut)",
          price: 19.5,
          category: "meat-fish",
          thumbUrl: t.fish,
        },
        {
          id: "p7",
          name: "Hausa-style suya spice rub (220 g)",
          price: 4.75,
          category: "spices-ingredients",
          thumbUrl: t.spices,
        },
        {
          id: "p8",
          name: "Gari Ijebu (toasted cassava flakes, 1 kg)",
          price: 5.1,
          category: "staples-grains",
          thumbUrl: t.grains,
        },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Plantain bunch was labelled ripeness honestly — frying felt effortless.", date: "2026-03-02", customerFirstName: "Adanna" },
        { id: "r2", rating: 5, text: "Palm oil colour reassured Mum before Egusi touched the pot.", date: "2026-02-18", customerFirstName: "Tunde" },
      ],
    },
    {
      id: "seed-rose-caribbean-market-bhx",
      email: "orders+caribbean.roots.seed@clipservice.app",
      role: "Caribbean Roots Market",
      bio:
        `Handsworth afternoons smell like Scotch bonnets and wet jerk paste here. We stack hard dough beside sorrel concentrates because Christmas and Sunday dinner share the same counter.
Saltfish tins sit next to ripe plantains tagged for frying or steaming on purpose.` +
        ` Run by people who learnt callaloo timing from aunties who never measured. Ordering through Clip lets you preorder ackee Saturdays without losing your place at the doorway. Pilot onboarding means polite WhatsApps if something sells out midday — substitution notes still sound human.`,
      services: ["Fresh Produce", "Snacks", "Drinks", "Spices & Ingredients"],
      category: "groceries-store",
      city: "Birmingham",
      postcode: "B20 3DP",
      popular: true,
      negotiationEnabled: true,
      applicationStatus: "approved",
      pilotBadge: "Pilot — Onboarding",
      heritageTags: ["Jamaican", "Trinidadian"],
      whatsappPhone: "+447830001102",
      openingHours: `Handsworth, Birmingham · ${hours}`,
      coverImageUrl: u.tropical,
      communityPillar: "caribbean",
      storeProducts: [
        {
          id: "p1",
          name: "Scotch bonnet peppers (fresh tray)",
          price: 3.65,
          category: "fresh-produce",
          featured: true,
          thumbUrl: t.chilli,
        },
        {
          id: "p2",
          name: "Traditional jerk marinade (400 ml jar)",
          price: 6.2,
          category: "spices-ingredients",
          featured: true,
          thumbUrl: t.jerk,
        },
        {
          id: "p3",
          name: "Hard dough loaf (frozen, sliced)",
          price: 3.49,
          category: "breads-bakery",
          thumbUrl: t.bread,
        },
        {
          id: "p4",
          name: "Sorrel festive concentrate (1 litre)",
          price: 7.89,
          category: "drinks-beverages",
          thumbUrl: t.drink,
        },
        {
          id: "p5",
          name: "Ackee tins (540 g, duo pack)",
          price: 9.95,
          category: "snacks-sweets",
          thumbUrl: t.ackee,
        },
        {
          id: "p6",
          name: "Bone-in saltfish (454 g salted cod)",
          price: 11.49,
          category: "meat-fish",
          thumbUrl: t.fish,
        },
        {
          id: "p7",
          name: "Ripe frying plantains (graded bunch)",
          price: 4.6,
          category: "fresh-produce",
          thumbUrl: t.plantain,
        },
        {
          id: "p8",
          name: "Callaloo (tinned, island cut)",
          price: 3.2,
          category: "fresh-produce",
        },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Jerk marinade tastes like Peckham birthdays — smoky and stubborn.", date: "2026-02-01", customerFirstName: "Levi" },
        { id: "r2", rating: 5, text: "Sorrel batch survived courier without bursting — cheers.", date: "2026-02-26", customerFirstName: "Shanice" },
      ],
    },
    {
      id: "seed-patel-asian-supermarket-leicester",
      email: "orders+bismillah.seed@clipservice.app",
      role: "Bismillah Halal Foods",
      bio:
        `Highfields corridor knows this counter for chilled lamb diced to order and basmati sacks that fluff instead of clamping shut. Ghee jars gleam beside turmeric scoops scooped politely with tongs.` +
        ` Paneer slabs wait for grills at home naan rituals demand. Aunties sniff garam masala batches before tins leave the trolley. Checkout on Clip simply extends the courteous queue indoors — Stripe receipts tally school-night curries cleanly. Pilot season means brisk replies if a batch of chicken sells before your slot.`,
      services: ["Meat & Fish", "Spices & Ingredients", "Halal", "Staples & Grains"],
      category: "groceries-store",
      city: "Leicester",
      postcode: "LE2 0PD",
      popular: true,
      negotiationEnabled: true,
      applicationStatus: "approved",
      pilotBadge: "Pilot — Onboarding",
      heritageTags: ["Indian", "Pakistani", "Halal"],
      whatsappPhone: "+447830001103",
      openingHours: `Highfields, Leicester · ${hours}`,
      coverImageUrl: u.halal,
      communityPillar: "south-asian",
      storeProducts: [
        {
          id: "p1",
          name: "Halal diced lamb shoulder (approx. 1 kg)",
          price: 17.95,
          category: "meat-fish",
          featured: true,
          thumbUrl: t.lamb,
        },
        {
          id: "p2",
          name: "Whole halal chicken (air-chilled)",
          price: 8.49,
          category: "meat-fish",
          thumbUrl: t.chicken,
        },
        {
          id: "p3",
          name: "Extra-long basmati rice (10 kg)",
          price: 24.95,
          category: "staples-grains",
          featured: true,
          thumbUrl: t.rice,
        },
        {
          id: "p4",
          name: "House garam masala (220 g)",
          price: 4.89,
          category: "spices-ingredients",
          thumbUrl: t.spices,
        },
        {
          id: "p5",
          name: "Pure cow ghee (500 g tin)",
          price: 9.25,
          category: "oils-condiments",
          thumbUrl: t.ghee,
        },
        {
          id: "p6",
          name: "Ground turmeric refill (280 g)",
          price: 3.75,
          category: "spices-ingredients",
        },
        {
          id: "p7",
          name: "Chapatti atta flour (10 kg sack)",
          price: 13.49,
          category: "staples-grains",
          thumbUrl: t.flour,
        },
        {
          id: "p8",
          name: "Paneer block — grill cut (454 g)",
          price: 4.59,
          category: "ready-meals",
        },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Basmati cooked long grains without snapping — fragrant kitchen all evening.", date: "2026-03-06", customerFirstName: "Riya" },
        { id: "r2", rating: 5, text: "Lamb diced evenly — korma night stayed tender.", date: "2026-02-19", customerFirstName: "Hassan" },
      ],
    },
    {
      id: "seed-akwaaba-ghanaian-store-london",
      email: "orders+akwaaba.seed@clipservice.app",
      role: "Akwaaba Ghanaian Store",
      bio:
        `Akwaaba still tastes like Peckham afternoons — fermented banku tubs beside smoky shito that stains spoons happily. Aunties skim fabric bolts for weddings while cousins hoard shea jars for Manchester winters.` +
        ` Cassava and plantain crates rotate fast because Sunday soup waits for nobody. Ordering through Clip honours the chatter you already trusted at the doorway; receipts summarise grams clearly for folks budgeting train fare home.`,
      services: ["Fresh Produce", "Fashion & Fabric", "Hair & Beauty", "Staples & Grains"],
      category: "groceries-store",
      city: "London",
      postcode: "SE15 5JY",
      popular: false,
      negotiationEnabled: true,
      applicationStatus: "approved",
      pilotBadge: "Pilot — Onboarding",
      heritageTags: ["Ghanaian", "West African"],
      whatsappPhone: "+447830001104",
      openingHours: `Peckham, London · ${hours}`,
      coverImageUrl: u.market,
      communityPillar: "west-african",
      storeProducts: [
        {
          id: "p1",
          name: "Fresh cassava roots (bulk bag)",
          price: 7.89,
          category: "fresh-produce",
          featured: true,
          thumbUrl: t.casava,
        },
        {
          id: "p2",
          name: "Green cooking plantains (firm bunch)",
          price: 5.49,
          category: "fresh-produce",
          thumbUrl: t.plantain,
        },
        {
          id: "p3",
          name: "Shito chilli oil — medium heat (380 g jar)",
          price: 7.85,
          category: "oils-condiments",
          featured: true,
          thumbUrl: t.jerk,
        },
        {
          id: "p4",
          name: "Ankara wax-print fabric — 6 yard bolt",
          price: 54.95,
          category: "fashion-fabrics",
          featured: true,
          thumbUrl: t.fabric,
        },
        {
          id: "p5",
          name: "Charcoal-infused Ghanaian black soap",
          price: 6.15,
          category: "hair-beauty",
        },
        {
          id: "p6",
          name: "Unrefined ivory shea butter (250 g)",
          price: 8.6,
          category: "hair-beauty",
        },
        {
          id: "p7",
          name: "Banku fermented corn dough balls (frozen kit)",
          price: 5.75,
          category: "ready-meals",
        },
        {
          id: "p8",
          name: "Ga kenkey — wrapped fermented maize dumplings",
          price: 3.89,
          category: "ready-meals",
        },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Shito aroma filled the hallway before spoons touched rice.", date: "2026-03-09", customerFirstName: "Ama" },
        { id: "r2", rating: 5, text: "Fabric cutter measured calmly even when Peckham bustle outside.", date: "2026-02-03", customerFirstName: "Kojo" },
      ],
    },
    {
      id: "seed-zanzibar-spice-house-leeds",
      email: "orders+spiceroute.seed@clipservice.app",
      role: "Spice Route UK",
      bio:
        `Hyde Park students and aunties collide over lemongrass bundles and tins of coconut milk labelled clearly for laksa Tuesdays. Jasmine rice sacks stack beside Lebanese za'atar tins because Leeds kitchens rarely stay monocultural.` +
        ` Meat counter bundles halal trim politely for grills after Friday prayers. Ordering on Clip previews weights before you tram home — substitutions stay honest pilot season. We jot recipe ideas on receipts when you ask.`,
      services: ["Spices & Ingredients", "Ready Meals", "Halal", "Drinks"],
      category: "groceries-store",
      city: "Leeds",
      postcode: "LS6 2LJ",
      popular: false,
      negotiationEnabled: true,
      applicationStatus: "approved",
      pilotBadge: "Pilot — Onboarding",
      heritageTags: ["South East Asian", "Middle Eastern"],
      whatsappPhone: "+447830001105",
      openingHours: `Hyde Park, Leeds · ${hours}`,
      coverImageUrl: u.spices,
      communityPillar: "south-east-asian",
      storeProducts: [
        {
          id: "p1",
          name: "Fresh lemongrass bundle (stalks trimmed)",
          price: 3.89,
          category: "fresh-produce",
          featured: true,
          thumbUrl: t.citrus,
        },
        {
          id: "p2",
          name: "Coconut milk tins (premium, 400 ml ×6)",
          price: 11.49,
          category: "oils-condiments",
          featured: true,
          thumbUrl: t.coconut,
        },
        {
          id: "p3",
          name: "Thai jasmine rice (5 kg)",
          price: 18.49,
          category: "staples-grains",
          thumbUrl: t.rice,
        },
        {
          id: "p4",
          name: "Thai panang curry paste (400 g jar)",
          price: 5.89,
          category: "ready-meals",
          thumbUrl: t.curry,
        },
        {
          id: "p5",
          name: "Lebanese za'atar seasoning (180 g pouch)",
          price: 4.95,
          category: "spices-ingredients",
          thumbUrl: t.spices,
        },
        {
          id: "p6",
          name: "Levantine tahini (450 g squeeze bottle)",
          price: 6.75,
          category: "oils-condiments",
        },
        {
          id: "p7",
          name: "Ground sumac (150 g)",
          price: 4.59,
          category: "spices-ingredients",
        },
        {
          id: "p8",
          name: "Mixed halal grilling cuts (Approx. 1.1 kg box)",
          price: 26.49,
          category: "meat-fish",
          thumbUrl: t.lamb,
        },
      ],
      reviews: [
        { id: "r1", rating: 5, text: "Lemongrass bundle still fragrant after the walk from city centre.", date: "2026-02-22", customerFirstName: "Sara" },
        { id: "r2", rating: 5, text: "Coconut tins stacked without dents — rare courier win.", date: "2026-01-31", customerFirstName: "Yasmin" },
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
