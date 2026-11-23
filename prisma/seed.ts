/* Demo data: "Saffron & Slice", a Mediterranean pizza & grill in Brooklyn.
 * Run with `npm run db:seed`. Idempotent: the demo restaurant is deleted and recreated.
 * Login: demo@chatplate.app / demo-password-2026 (also manager@ and kitchen@ with the same password).
 */
import { PrismaClient, type OrderStatus, type Prisma } from "@prisma/client";
import { encrypt, hashPhone, randomToken } from "../src/server/crypto";
import { hashPassword } from "../src/server/auth/password";

const db = new PrismaClient();
const SLUG = "demo-saffron-slice";
const PASSWORD = "demo-password-2026";

type Tr = Partial<Record<"ar" | "fr" | "es" | "hi" | "ur" | "tr", string>>;

const MENU: {
  name: string;
  i18n: Tr;
  items: {
    name: string;
    i18n?: Tr;
    description: string;
    price: number;
    tags?: string[];
    aliases?: string[];
    soldOut?: boolean;
    image?: string;
    variants?: { name: string; price: number; isDefault?: boolean; i18n?: Tr }[];
    addons?: { name: string; price: number }[];
  }[];
}[] = [
  {
    name: "Pizza",
    i18n: { ar: "بيتزا", fr: "Pizzas", es: "Pizzas", hi: "पिज़्ज़ा", ur: "پیزا", tr: "Pizza" },
    items: [
      {
        name: "Margherita Pizza", i18n: { ar: "بيتزا مارغريتا", fr: "Pizza Margherita", es: "Pizza Margarita", hi: "मार्गेरिटा पिज़्ज़ा", ur: "مارگریٹا پیزا", tr: "Margarita Pizza" },
        description: "San Marzano tomato, fior di latte, basil, olive oil", price: 11, tags: ["vegetarian"], aliases: ["margherita", "margarita", "cheese pizza"],
        image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
        variants: [{ name: "Small", price: 11, i18n: { ar: "صغير", fr: "Petite", es: "Pequeña", hi: "छोटा", ur: "چھوٹا", tr: "Küçük" } }, { name: "Medium", price: 14, i18n: { ar: "وسط", fr: "Moyenne", es: "Mediana", hi: "मीडियम", ur: "درمیانہ", tr: "Orta" } }, { name: "Large", price: 17, i18n: { ar: "كبير", fr: "Grande", es: "Grande", hi: "बड़ा", ur: "بڑا", tr: "Büyük" } }],
        addons: [{ name: "Extra cheese", price: 1.5 }, { name: "Mushrooms", price: 1 }, { name: "Jalapeños", price: 1 }, { name: "Black olives", price: 1 }],
      },
      {
        name: "Pepperoni Pizza", i18n: { ar: "بيتزا بيبروني", fr: "Pizza Pepperoni", es: "Pizza de Pepperoni", hi: "पेपरोनी पिज़्ज़ा", ur: "پیپرونی پیزا", tr: "Pepperoni Pizza" },
        description: "Tomato, mozzarella, beef pepperoni, oregano", price: 12, aliases: ["pepperoni", "peperoni"],
        image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600",
        variants: [{ name: "Small", price: 12, i18n: { ar: "صغير", fr: "Petite", es: "Pequeña", tr: "Küçük" } }, { name: "Medium", price: 15, i18n: { ar: "وسط", fr: "Moyenne", es: "Mediana", tr: "Orta" } }, { name: "Large", price: 18, i18n: { ar: "كبير", fr: "Grande", es: "Grande", tr: "Büyük" } }],
        addons: [{ name: "Extra cheese", price: 1.5 }, { name: "Extra pepperoni", price: 2 }, { name: "Jalapeños", price: 1 }, { name: "Onions", price: 0.5 }],
      },
      {
        name: "BBQ Chicken Pizza", i18n: { ar: "بيتزا دجاج باربكيو", fr: "Pizza Poulet BBQ", es: "Pizza de Pollo BBQ", tr: "Barbekü Tavuklu Pizza" },
        description: "Smoky BBQ sauce, grilled chicken, red onion, cilantro", price: 13, aliases: ["bbq pizza", "chicken pizza"],
        variants: [{ name: "Small", price: 13 }, { name: "Medium", price: 16 }, { name: "Large", price: 19 }],
        addons: [{ name: "Extra cheese", price: 1.5 }, { name: "Extra chicken", price: 3 }],
      },
      {
        name: "Veggie Supreme Pizza", i18n: { ar: "بيتزا خضار", fr: "Pizza Végétarienne", es: "Pizza Vegetal" },
        description: "Peppers, mushrooms, olives, onion, sweetcorn", price: 12, tags: ["vegetarian"], aliases: ["veggie pizza", "vegetable pizza"], soldOut: true,
        variants: [{ name: "Small", price: 12 }, { name: "Medium", price: 15 }, { name: "Large", price: 18 }],
      },
    ],
  },
  {
    name: "Shawarma & Wraps",
    i18n: { ar: "شاورما", fr: "Shawarma & Wraps", es: "Shawarma y Wraps", hi: "शावरमा", ur: "شوارما", tr: "Döner & Dürüm" },
    items: [
      { name: "Chicken Shawarma Sandwich", i18n: { ar: "ساندويتش شاورما دجاج", fr: "Sandwich Shawarma Poulet", es: "Sándwich de Shawarma de Pollo", hi: "चिकन शावरमा सैंडविच", ur: "چکن شوارما سینڈوچ", tr: "Tavuk Döner Dürüm" }, description: "Marinated chicken, garlic toum, pickles, fries in saj bread", price: 9.5, tags: ["halal"], aliases: ["chicken shawarma", "shawarma", "shawarma sandwich", "chicken wrap"], addons: [{ name: "Extra garlic sauce", price: 0.75 }, { name: "Extra chicken", price: 3 }, { name: "Hot sauce", price: 0.5 }, { name: "Cheese", price: 1 }] },
      { name: "Beef Shawarma Sandwich", i18n: { ar: "ساندويتش شاورما لحم", fr: "Sandwich Shawarma Bœuf", es: "Sándwich de Shawarma de Res", tr: "Et Döner Dürüm" }, description: "Spiced beef, tahini, onion-parsley salad, tomato", price: 10.5, tags: ["halal"], aliases: ["beef shawarma", "meat shawarma"], addons: [{ name: "Extra tahini", price: 0.75 }, { name: "Extra beef", price: 3.5 }, { name: "Hot sauce", price: 0.5 }] },
      { name: "Falafel Wrap", i18n: { ar: "راب فلافل", fr: "Wrap Falafel", es: "Wrap de Falafel", hi: "फलाफल रैप", ur: "فلافل ریپ", tr: "Falafel Dürüm" }, description: "Crispy falafel, hummus, tahini, salad, pickled turnip", price: 8.5, tags: ["vegan", "halal"], aliases: ["falafel"], addons: [{ name: "Extra falafel", price: 2 }, { name: "Hot sauce", price: 0.5 }] },
      { name: "Mixed Shawarma Plate", i18n: { ar: "صحن شاورما مشكل", fr: "Assiette Shawarma Mixte", es: "Plato Mixto de Shawarma", tr: "Karışık Döner Tabağı" }, description: "Chicken & beef shawarma, rice, salad, hummus, pita", price: 16.5, tags: ["halal"], aliases: ["shawarma plate", "mixed plate"], addons: [{ name: "Extra hummus", price: 2 }, { name: "Extra garlic sauce", price: 0.75 }] },
    ],
  },
  {
    name: "Burgers",
    i18n: { ar: "برغر", fr: "Burgers", es: "Hamburguesas", hi: "बर्गर", ur: "برگر", tr: "Burgerler" },
    items: [
      { name: "Classic Beef Burger", i18n: { ar: "برغر لحم كلاسيك", fr: "Burger Bœuf Classique", es: "Hamburguesa Clásica de Res", tr: "Klasik Burger" }, description: "6oz beef patty, lettuce, tomato, pickles, house sauce", price: 11, tags: ["halal"], aliases: ["beef burger", "burger", "cheeseburger", "hamburger"], addons: [{ name: "Cheese", price: 1 }, { name: "Turkey bacon", price: 2 }, { name: "Avocado", price: 2 }, { name: "Fried egg", price: 1.5 }] },
      { name: "Crispy Chicken Burger", i18n: { ar: "برغر دجاج مقرمش", fr: "Burger Poulet Croustillant", es: "Hamburguesa de Pollo Crujiente", hi: "क्रिस्पी चिकन बर्गर", ur: "کرسپی چکن برگر", tr: "Çıtır Tavuk Burger" }, description: "Buttermilk fried chicken, slaw, pickles, spicy mayo", price: 10, tags: ["halal"], aliases: ["chicken burger", "chicken burgers"], addons: [{ name: "Cheese", price: 1 }, { name: "Avocado", price: 2 }] },
      { name: "Double Smash Burger", i18n: { ar: "دبل سماش برغر", fr: "Double Smash Burger", es: "Hamburguesa Doble Smash" }, description: "Two smashed patties, American cheese, onions, pickles", price: 14, tags: ["halal"], aliases: ["smash burger", "double burger"], soldOut: true, addons: [{ name: "Turkey bacon", price: 2 }] },
    ],
  },
  {
    name: "Sides",
    i18n: { ar: "أطباق جانبية", fr: "Accompagnements", es: "Acompañamientos", hi: "साइड्स", ur: "سائیڈز", tr: "Yan Ürünler" },
    items: [
      { name: "Fries", i18n: { ar: "بطاطا مقلية", fr: "Frites", es: "Papas fritas", hi: "फ्राइज़", ur: "فرائز", tr: "Patates Kızartması" }, description: "Crispy fries with sea salt", price: 3.5, tags: ["vegan"], aliases: ["chips", "french fries", "fry"], variants: [{ name: "Regular", price: 3.5, isDefault: true }, { name: "Large", price: 5 }], addons: [{ name: "Cheese sauce", price: 1 }, { name: "Garlic mayo", price: 0.75 }] },
      { name: "Hummus & Pita", i18n: { ar: "حمص مع خبز", fr: "Houmous & Pita", es: "Hummus con Pan Pita", tr: "Humus & Pide" }, description: "Silky chickpea hummus, olive oil, warm pita", price: 6.5, tags: ["vegan"], aliases: ["hummus"] },
      { name: "Garlic Bread", i18n: { ar: "خبز بالثوم", fr: "Pain à l'ail", es: "Pan de ajo", tr: "Sarımsaklı Ekmek" }, description: "Stone-baked with garlic butter and parsley", price: 4.5, tags: ["vegetarian"] },
      { name: "Greek Salad", i18n: { ar: "سلطة يونانية", fr: "Salade Grecque", es: "Ensalada Griega", tr: "Yunan Salatası" }, description: "Tomato, cucumber, olives, feta, oregano", price: 8, tags: ["vegetarian", "gluten_free"] },
    ],
  },
  {
    name: "Drinks",
    i18n: { ar: "مشروبات", fr: "Boissons", es: "Bebidas", hi: "पेय", ur: "مشروبات", tr: "İçecekler" },
    items: [
      { name: "Coca-Cola", i18n: { ar: "كوكا كولا", hi: "कोका-कोला", ur: "کوکا کولا", tr: "Coca-Cola" }, description: "Chilled", price: 2.5, aliases: ["coke", "cola", "coca cola", "كولا"], variants: [{ name: "Can", price: 2.5, isDefault: true }, { name: "1.5L Bottle", price: 4.5 }] },
      { name: "Diet Coke", description: "Chilled can", price: 2.5, aliases: ["coke zero", "diet cola"] },
      { name: "Sprite", description: "Chilled can", price: 2.5, aliases: ["7up", "lemonade soda"] },
      { name: "Mint Lemonade", i18n: { ar: "ليمون بالنعناع", fr: "Limonade à la menthe", es: "Limonada con menta", tr: "Naneli Limonata" }, description: "Fresh lemon, mint, crushed ice", price: 4, tags: ["vegan"], aliases: ["lemonade", "limonana"] },
      { name: "Bottled Water", i18n: { ar: "ماء", fr: "Eau", es: "Agua", hi: "पानी", ur: "پانی", tr: "Su" }, description: "500ml", price: 1.5, aliases: ["water"] },
    ],
  },
  {
    name: "Desserts",
    i18n: { ar: "حلويات", fr: "Desserts", es: "Postres", hi: "मिठाई", ur: "میٹھا", tr: "Tatlılar" },
    items: [
      { name: "Baklava", i18n: { ar: "بقلاوة", tr: "Baklava" }, description: "Pistachio baklava, 4 pieces", price: 5, tags: ["vegetarian", "contains_nuts"] },
      { name: "Kunafa", i18n: { ar: "كنافة", tr: "Künefe" }, description: "Warm cheese kunafa with syrup and pistachio", price: 7, tags: ["vegetarian", "contains_nuts"], aliases: ["knafeh", "kunefe", "kanafeh"] },
    ],
  },
];

const CUSTOMERS = [
  { name: "Sara Mitchell", phone: "13475550101", lang: "en", tags: ["VIP", "REGULAR"] as const, address: "214 Bedford Ave, Brooklyn, NY 11211", lat: 40.7172, lng: -73.9568 },
  { name: "Ahmed Al-Masri", phone: "13475550102", lang: "ar", tags: ["REGULAR"] as const, address: "88 Atlantic Ave, Brooklyn, NY 11201", lat: 40.6907, lng: -73.9952 },
  { name: "Lucía Fernández", phone: "13475550103", lang: "es", tags: [] as const, address: null, lat: null, lng: null },
  { name: "Pierre Dubois", phone: "13475550104", lang: "fr", tags: [] as const, address: "45 Prospect Park W, Brooklyn, NY 11215", lat: 40.6702, lng: -73.9718 },
  { name: "Priya Sharma", phone: "13475550105", lang: "hi", tags: ["REGULAR"] as const, address: "1200 Nostrand Ave, Brooklyn, NY 11225", lat: 40.6611, lng: -73.9505 },
  { name: "Bilal Qureshi", phone: "13475550106", lang: "ur", tags: [] as const, address: "760 Coney Island Ave, Brooklyn, NY 11218", lat: 40.6362, lng: -73.9675 },
  { name: "Elif Yılmaz", phone: "13475550107", lang: "tr", tags: [] as const, address: null, lat: null, lng: null },
  { name: "Marcus Johnson", phone: "13475550108", lang: "en", tags: [] as const, address: "350 Franklin Ave, Brooklyn, NY 11238", lat: 40.6826, lng: -73.9564 },
];

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

async function main() {
  const existing = await db.restaurant.findUnique({ where: { slug: SLUG } });
  if (existing) {
    await db.order.deleteMany({ where: { restaurantId: existing.id } });
    await db.restaurant.delete({ where: { id: existing.id } });
  }
  await db.user.deleteMany({ where: { email: { in: ["demo@chatplate.app", "manager@chatplate.app", "kitchen@chatplate.app"] } } });

  const passwordHash = await hashPassword(PASSWORD);
  const r = await db.restaurant.create({
    data: {
      name: "Saffron & Slice",
      slug: SLUG,
      isDemo: true,
      address: "512 Flatbush Ave, Brooklyn, NY 11225",
      phone: "+1 (347) 555-0199",
      email: "hello@saffronandslice.example",
      timezone: "America/New_York",
      currency: "USD",
      latitude: 40.6622,
      longitude: -73.9618,
      defaultLanguage: "en",
      supportedLanguages: ["*", "en", "ar", "fr", "es", "hi", "ur", "tr"],
      minimumOrderAmount: 10,
      prepTimeMinutes: 25,
      pickupInstructions: "Pick up at the counter. Mention your order number.",
      deliveryInstructions: "Our drivers call when they arrive. Please keep your phone nearby.",
      acceptedPaymentMethods: ["CASH", "CARD_ON_DELIVERY", "CARD_AT_PICKUP"],
      askPaymentPreference: true,
      paymentNote: "Card machines are available on delivery.",
      aiTone: "friendly",
      greetingMessage: null,
      handoffKeywords: ["allergy", "allergic", "refund", "manager", "lawyer", "catering"],
      orderSeq: 1000,
      onboardingStep: 6,
      onboardingCompletedAt: new Date(),
      notifyOnNewOrder: true,
      businessHours: {
        create: [
          // Late-night hours so the demo works most of the day (shifts past midnight are supported).
          ...[1, 2, 3, 4].map((d) => ({ dayOfWeek: d, openTime: "08:00", closeTime: "02:00" })),
          ...[5, 6].map((d) => ({ dayOfWeek: d, openTime: "08:00", closeTime: "03:00" })),
          { dayOfWeek: 0, openTime: "09:00", closeTime: "01:00" },
        ],
      },
      deliveryZones: {
        create: [
          { name: "Nearby (3 km)", type: "RADIUS", radiusKm: 3, fee: 2.99, minimumOrder: 15, estimatedMinutes: 30, sortOrder: 0 },
          { name: "Wider Brooklyn (7 km)", type: "RADIUS", radiusKm: 7, fee: 4.99, minimumOrder: 25, estimatedMinutes: 45, sortOrder: 1 },
          { name: "Williamsburg & Greenpoint", type: "AREA", areas: ["Williamsburg", "Greenpoint", "11211", "11222"], fee: 5.99, minimumOrder: 25, estimatedMinutes: 50, sortOrder: 2 },
        ],
      },
      whatsapp: { create: { webhookKey: randomToken(18), verifyToken: randomToken(24), status: "NOT_CONNECTED" } },
      users: {
        create: [
          { email: "demo@chatplate.app", name: "Nadia Haddad", role: "OWNER", passwordHash },
          { email: "manager@chatplate.app", name: "Omar Khalil", role: "MANAGER", passwordHash },
          { email: "kitchen@chatplate.app", name: "Jess Rivera", role: "STAFF", passwordHash },
        ],
      },
    },
    include: { users: true },
  });
  const staff = r.users.find((u) => u.role === "STAFF")!;
  const owner = r.users.find((u) => u.role === "OWNER")!;

  // Menu
  const items: Prisma.MenuItemGetPayload<{ include: { variants: true; addons: true } }>[] = [];
  for (const [ci, cat] of MENU.entries()) {
    const c = await db.menuCategory.create({ data: { restaurantId: r.id, name: cat.name, nameI18n: cat.i18n, sortOrder: ci } });
    for (const [ii, it] of cat.items.entries()) {
      items.push(
        await db.menuItem.create({
          data: {
            restaurantId: r.id,
            categoryId: c.id,
            name: it.name,
            nameI18n: it.i18n ?? {},
            description: it.description,
            price: it.price,
            imageUrl: it.image ?? null,
            isSoldOut: it.soldOut ?? false,
            dietaryTags: it.tags ?? [],
            aliases: it.aliases ?? [],
            sortOrder: ii,
            variants: { create: (it.variants ?? []).map((v, vi) => ({ name: v.name, nameI18n: v.i18n ?? {}, price: v.price, isDefault: v.isDefault ?? false, sortOrder: vi })) },
            addons: { create: (it.addons ?? []).map((a, ai) => ({ name: a.name, price: a.price, sortOrder: ai })) },
          },
          include: { variants: true, addons: true },
        }),
      );
    }
  }
  const item = (name: string) => items.find((i) => i.name === name)!;

  // Customers & conversations
  const customers: ((typeof CUSTOMERS)[number] & { customer: { id: string }; conversation: { id: string } })[] = [];
  for (const c of CUSTOMERS) {
    const customer = await db.customer.create({
      data: {
        restaurantId: r.id, phoneHash: hashPhone(c.phone), phoneEnc: encrypt(c.phone), phoneLast4: c.phone.slice(-4),
        name: c.name, profileName: c.name.split(" ")[0], preferredLanguage: c.lang, tags: [...c.tags],
        savedAddress: c.address, savedLat: c.lat, savedLng: c.lng,
      },
    });
    const conversation = await db.conversation.create({ data: { restaurantId: r.id, customerId: customer.id, language: c.lang } });
    customers.push({ ...c, customer, conversation });
  }

  // Orders across the last 7 days (for analytics), plus a few live ones today.
  let seq = 1000;
  type Line = { name: string; variant?: string; qty: number; addons?: string[]; removals?: string[] };
  async function makeOrder(ci: number, lines: Line[], status: OrderStatus, createdAt: Date, type: "DELIVERY" | "PICKUP", pay: Prisma.OrderCreateInput["paymentPreference"] = "CASH") {
    const cu = customers[ci]!;
    const rows = lines.map((l) => {
      const mi = item(l.name);
      const v = l.variant ? mi.variants.find((x) => x.name === l.variant)! : mi.variants.find((x) => x.isDefault) ?? null;
      const adds = (l.addons ?? []).map((a) => mi.addons.find((x) => x.name === a)!);
      const unit = Number(v?.price ?? mi.price) + adds.reduce((s, a) => s + Number(a.price), 0);
      return { menuItemId: mi.id, variantId: v?.id ?? null, name: mi.name, variantName: v?.name ?? null, addons: adds.map((a) => ({ id: a.id, name: a.name })), removals: l.removals ?? [], quantity: l.qty, unitPrice: unit, lineTotal: Math.round(unit * l.qty * 100) / 100 };
    });
    const subtotal = Math.round(rows.reduce((s, x) => s + x.lineTotal, 0) * 100) / 100;
    const fee = type === "DELIVERY" ? 2.99 : 0;
    const total = Math.round((subtotal + fee) * 100) / 100;
    seq += 1;
    const events: Prisma.OrderEventCreateWithoutOrderInput[] = [{ type: "CREATED", toStatus: "NEW", actorType: "CUSTOMER", message: "Order placed via WhatsApp", createdAt }];
    const flow: OrderStatus[] = ["NEW", "CONFIRMED", "PREPARING", "READY", ...(type === "DELIVERY" ? (["OUT_FOR_DELIVERY"] as OrderStatus[]) : []), "COMPLETED"];
    if (status === "CANCELLED") events.push({ type: "CANCELLED", fromStatus: "NEW", toStatus: "CANCELLED", actorType: "CUSTOMER", message: "Cancelled by the customer on WhatsApp", createdAt: new Date(createdAt.getTime() + 4 * 60_000) });
    else for (let i = 1; i <= flow.indexOf(status); i++) events.push({ type: "STATUS_CHANGED", fromStatus: flow[i - 1], toStatus: flow[i], actorType: "STAFF", actorUserId: staff.id, createdAt: new Date(createdAt.getTime() + i * 7 * 60_000) });
    await db.order.create({
      data: {
        restaurantId: r.id, number: seq, customerId: cu.customer.id, conversationId: cu.conversation.id, status, type, currency: "USD",
        subtotal, deliveryFee: fee, total, customerName: cu.name, paymentPreference: pay, language: cu.lang, createdAt, confirmedAt: createdAt,
        deliveryAddress: type === "DELIVERY" ? (cu.address ?? "350 Franklin Ave, Brooklyn") : null, deliveryLat: type === "DELIVERY" ? cu.lat : null, deliveryLng: type === "DELIVERY" ? cu.lng : null,
        assignedToId: ["PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(status) ? staff.id : null,
        completedAt: status === "COMPLETED" ? new Date(createdAt.getTime() + 45 * 60_000) : null,
        cancelledAt: status === "CANCELLED" ? new Date(createdAt.getTime() + 4 * 60_000) : null,
        items: { create: rows }, events: { create: events },
      },
    });
    if (status !== "CANCELLED") await db.customer.update({ where: { id: cu.customer.id }, data: { orderCount: { increment: 1 }, totalSpent: { increment: total }, lastOrderAt: createdAt } });
  }

  const combos: Line[][] = [
    [{ name: "Pepperoni Pizza", variant: "Large", qty: 1 }, { name: "Coca-Cola", qty: 2 }],
    [{ name: "Chicken Shawarma Sandwich", qty: 3, addons: ["Extra garlic sauce"] }, { name: "Fries", qty: 1, variant: "Large" }],
    [{ name: "Classic Beef Burger", qty: 2, addons: ["Cheese"] }, { name: "Fries", qty: 2 }, { name: "Sprite", qty: 2 }],
    [{ name: "Mixed Shawarma Plate", qty: 1 }, { name: "Hummus & Pita", qty: 1 }, { name: "Mint Lemonade", qty: 1 }],
    [{ name: "Margherita Pizza", variant: "Medium", qty: 2 }, { name: "Garlic Bread", qty: 1 }],
    [{ name: "Falafel Wrap", qty: 2 }, { name: "Greek Salad", qty: 1 }, { name: "Bottled Water", qty: 2 }],
    [{ name: "BBQ Chicken Pizza", variant: "Large", qty: 1 }, { name: "Kunafa", qty: 2 }],
  ];
  for (let day = 6; day >= 1; day--) {
    const n = 3 + ((day * 7) % 5);
    for (let k = 0; k < n; k++) {
      await makeOrder((day + k) % CUSTOMERS.length, combos[(day + k) % combos.length]!, (day + k) % 11 === 0 ? "CANCELLED" : "COMPLETED", minutesAgo(day * 1440 - k * 70 + 60), (day + k) % 3 === 0 ? "PICKUP" : "DELIVERY", (day + k) % 2 ? "CASH" : "CARD_ON_DELIVERY");
    }
  }
  // Today
  await makeOrder(0, combos[0]!, "COMPLETED", minutesAgo(300), "DELIVERY", "CARD_ON_DELIVERY");
  await makeOrder(3, combos[4]!, "COMPLETED", minutesAgo(240), "PICKUP", "CARD_AT_PICKUP");
  await makeOrder(7, combos[2]!, "OUT_FOR_DELIVERY", minutesAgo(55), "DELIVERY", "CASH");
  await makeOrder(4, combos[5]!, "READY", minutesAgo(35), "PICKUP", "CARD_AT_PICKUP");
  await makeOrder(1, [{ name: "Chicken Shawarma Sandwich", qty: 3, addons: ["Extra garlic sauce"] }, { name: "Fries", qty: 1, variant: "Large" }, { name: "Coca-Cola", qty: 3 }], "PREPARING", minutesAgo(18), "DELIVERY", "CASH");
  await makeOrder(2, [{ name: "Pepperoni Pizza", variant: "Large", qty: 2, removals: ["onions"] }, { name: "Coca-Cola", qty: 1, variant: "1.5L Bottle" }], "NEW", minutesAgo(3), "PICKUP", "CARD_AT_PICKUP");

  // Conversations with realistic history
  type M = { from: "c" | "ai" | "staff"; text: string; ago: number; voice?: string; type?: "TEXT" | "AUDIO" | "INTERACTIVE"; buttons?: string[] };
  async function thread(ci: number, msgs: M[], extra: Prisma.ConversationUpdateInput = {}) {
    const cu = customers[ci]!;
    for (const m of msgs) {
      const created = await db.message.create({
        data: {
          restaurantId: r.id, conversationId: cu.conversation.id, direction: m.from === "c" ? "INBOUND" : "OUTBOUND",
          sender: m.from === "c" ? "CUSTOMER" : m.from === "ai" ? "AI" : "STAFF", type: m.voice ? "AUDIO" : (m.type ?? "TEXT"),
          body: m.voice ?? m.text, status: m.from === "c" ? "RECEIVED" : "READ", createdAt: minutesAgo(m.ago), language: cu.lang,
          staffUserId: m.from === "staff" ? owner.id : null,
          payload: m.buttons ? { kind: "buttons", text: m.text, buttons: m.buttons.map((b, i) => ({ id: `cp:${i}`, title: b })) } : undefined,
        },
      });
      if (m.voice) await db.voiceNote.create({ data: { restaurantId: r.id, messageId: created.id, mediaId: "demo-media", mimeType: "audio/ogg", transcript: m.voice, language: cu.lang, status: "COMPLETED" } });
    }
    const last = msgs[msgs.length - 1]!;
    const lastIn = [...msgs].reverse().find((m) => m.from === "c");
    await db.conversation.update({
      where: { id: cu.conversation.id },
      data: { lastMessageAt: minutesAgo(last.ago), lastInboundAt: lastIn ? minutesAgo(lastIn.ago) : null, lastMessagePreview: (last.voice ? "🎤 Voice note" : last.text).slice(0, 140), ...extra },
    });
    await db.customer.update({ where: { id: cu.customer.id }, data: { lastMessageAt: minutesAgo(last.ago) } });
  }

  await thread(2, [
    { from: "c", text: "Hola! Quiero 2 pizzas de pepperoni grandes, una sin cebolla, y una Coca-Cola grande", ago: 9 },
    { from: "ai", text: "¡Perfecto! 🍕 ¿Es para entrega a domicilio o para recoger?", ago: 9, type: "INTERACTIVE", buttons: ["Entrega a domicilio", "Recoger"] },
    { from: "c", text: "Recoger", ago: 7, type: "INTERACTIVE" },
    { from: "ai", text: "¿Cómo prefieres pagar? Opciones: Efectivo al recibir, Tarjeta al recibir, Tarjeta al recoger.", ago: 7, type: "INTERACTIVE", buttons: ["Tarjeta al recoger"] },
    { from: "c", text: "Tarjeta al recoger", ago: 6, type: "INTERACTIVE" },
    { from: "ai", text: "*Resumen del pedido*\n• 2× Pizza de Pepperoni (Grande) — sin cebolla — US$36.00\n• 1× Coca-Cola (1.5L Bottle) — US$4.50\n\nSubtotal: US$40.50\n*Total: US$40.50*\n\n🏪 Recoger: 512 Flatbush Ave\n🕐 Hora: Lo antes posible\n👤 Nombre: Lucía Fernández\n💵 Pago: Tarjeta al recoger\n\nPulsa Confirmar para hacer tu pedido, o dime qué quieres cambiar.", ago: 5, type: "INTERACTIVE", buttons: ["Confirmar pedido", "Cambiar algo", "Hablar con alguien"] },
    { from: "c", text: "Confirmar pedido", ago: 3, type: "INTERACTIVE" },
    { from: "ai", text: "✅ ¡Pedido n.º 1036 recibido! Total: US$40.50. Te mantendremos informado por aquí.", ago: 3 },
  ], { unreadCount: 0 });

  await thread(1, [
    { from: "c", text: "", voice: "مرحبا، بدي تلات ساندويشات شاورما دجاج مع ثومية زيادة، وبطاطا كبيرة، وتلات كولا. توصيل لو سمحت", ago: 21 },
    { from: "ai", text: "أهلاً أحمد! 🌯 هل نوصل الطلب إلى عنوانك المحفوظ: 88 Atlantic Ave؟", ago: 21 },
    { from: "c", text: "ايوه نفس العنوان", ago: 20 },
    { from: "ai", text: "*ملخص الطلب*\n• 3× ساندويتش شاورما دجاج + Extra garlic sauce — US$30.75\n• 1× بطاطا مقلية (Large) — US$5.00\n• 3× كوكا كولا (Can) — US$7.50\n\nالمجموع الفرعي: US$43.25\nرسوم التوصيل: US$2.99\n*الإجمالي: US$46.24*\n\nاضغط تأكيد لإرسال طلبك، أو أخبرني بما تريد تغييره.", ago: 19, type: "INTERACTIVE", buttons: ["تأكيد الطلب", "تعديل", "التحدث مع موظف"] },
    { from: "c", text: "تأكيد الطلب", ago: 18, type: "INTERACTIVE" },
    { from: "ai", text: "✅ تم استلام الطلب رقم 1035! الإجمالي: US$46.24. سنبقيك على اطلاع هنا.", ago: 18 },
    { from: "ai", text: "👨‍🍳 طلبك رقم 1035 قيد التحضير.", ago: 12 },
  ], { unreadCount: 0 });

  await thread(5, [
    { from: "c", text: "السلام علیکم، کل والا آرڈر بہت ٹھنڈا آیا تھا اور فرائز بھی نہیں تھے", ago: 14 },
    { from: "ai", text: "معذرت کہ آپ کا تجربہ اچھا نہیں رہا۔ میں آپ کو ہماری ٹیم کے کسی رکن سے ملا رہا ہوں۔ وہ جلد ہی یہاں جواب دیں گے۔ 🙏", ago: 14 },
  ], { mode: "HUMAN", needsHuman: true, needsHumanReason: "Customer complaint", unreadCount: 1, aiSuggestion: "Bilal sahib, hum maafi chahte hain. Hum aapke agle order par fries muft bhejenge aur kitchen ko inform kar diya hai." });

  await thread(6, [
    { from: "c", text: "Merhaba, 2 tavuk döner dürüm istiyorum", ago: 2 },
    { from: "ai", text: "Harika! 🌯 Teslimat mı, yoksa gel al mı?", ago: 2, type: "INTERACTIVE", buttons: ["Teslimat", "Gel al"] },
  ], {
    state: "ORDERING",
    unreadCount: 1,
    draft: { items: [{ menuItemId: item("Chicken Shawarma Sandwich").id, variantId: null, addonIds: [], removals: [], notes: null, quantity: 2, name: "Chicken Shawarma Sandwich", variantName: null, addonNames: [], unitPrice: 9.5, lineTotal: 19, pending: null }], orderType: null, deliveryAddress: null, location: null, zoneId: null, deliveryFee: 0, scheduledTime: null, customerName: null, paymentPreference: null, notes: null },
  });

  await thread(0, [
    { from: "c", text: "Hi! Do you deliver to Williamsburg?", ago: 330 },
    { from: "ai", text: "Yes, we deliver to Williamsburg! What would you like to order?", ago: 330 },
    { from: "c", text: "1 large pepperoni and 2 cokes please, same address as last time", ago: 325 },
    { from: "ai", text: "✅ Order #1031 received! Total: $25.99. We'll keep you updated here.", ago: 300 },
    { from: "ai", text: "🙏 Thank you for ordering from Saffron & Slice! Enjoy your meal.", ago: 250 },
    { from: "c", text: "Delicious as always, thanks!! 😍", ago: 240 },
  ], { unreadCount: 0 });

  await thread(4, [
    { from: "c", text: "Namaste! Do falafel wrap aur ek greek salad, pickup karungi", ago: 40 },
    { from: "ai", text: "नमस्ते प्रिया! ✅ ऑर्डर #1034 मिल गया! कुल: $28.00। हम आपको यहाँ अपडेट देते रहेंगे।", ago: 36 },
    { from: "ai", text: "✅ आपका ऑर्डर #1034 पिकअप के लिए तैयार है!", ago: 8 },
  ], { unreadCount: 0 });

  await thread(3, [
    { from: "c", text: "Bonjour, vous êtes ouverts jusqu'à quelle heure ce soir ?", ago: 600 },
    { from: "ai", text: "Bonjour Pierre ! Ce soir nous sommes ouverts jusqu'à 02:00. Souhaitez-vous commander quelque chose ?", ago: 600 },
  ], { unreadCount: 0 });

  await thread(7, [
    { from: "c", text: "yo can I get 2 classic burgers with cheese, 2 fries and 2 sprites for delivery", ago: 60 },
    { from: "ai", text: "✅ Order #1033 received! Total: $38.99. We'll keep you updated here.", ago: 56 },
    { from: "ai", text: "🛵 Your order #1033 is on its way!", ago: 10 },
    { from: "c", text: "where is the driver? it's been a while", ago: 1 },
  ], { unreadCount: 1, needsHuman: true, needsHumanReason: "Customer asking about delivery status" });

  await db.notification.createMany({
    data: [
      { restaurantId: r.id, type: "NEW_ORDER", title: "New order #1036", body: "2× Pepperoni Pizza (Large), 1× Coca-Cola (1.5L Bottle) · $40.50 · Pickup", link: "/dashboard/orders", createdAt: minutesAgo(3) },
      { restaurantId: r.id, type: "COMPLAINT", title: "Bilal Qureshi needs a human", body: "Customer complaint", link: `/dashboard/inbox?c=${customers[5]!.conversation.id}`, createdAt: minutesAgo(14) },
      { restaurantId: r.id, type: "NEEDS_HUMAN", title: "Conversation needs attention", body: "Customer asking about delivery status", link: `/dashboard/inbox?c=${customers[7]!.conversation.id}`, createdAt: minutesAgo(1) },
    ],
  });
  await db.restaurant.update({ where: { id: r.id }, data: { orderSeq: seq } });
  await db.auditLog.create({ data: { restaurantId: r.id, actorType: "SYSTEM", action: "demo.seeded", entityType: "Restaurant", entityId: r.id } });

  console.log(`Seeded "${r.name}" with ${items.length} menu items, ${customers.length} customers, ${seq - 1000} orders.`);
  console.log(`Login: demo@chatplate.app / ${PASSWORD}  (also manager@chatplate.app, kitchen@chatplate.app)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
