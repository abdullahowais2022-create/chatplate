/** Kinds of business TillText supports. Drives dashboard wording and what the AI is told about the shop. */
export const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurant / takeaway", noun: "restaurant", catalog: "menu", food: true },
  { value: "cafe", label: "Café / bakery", noun: "café", catalog: "menu", food: true },
  { value: "grocery", label: "Grocery / supermarket", noun: "grocery store", catalog: "products", food: false },
  { value: "pharmacy", label: "Pharmacy", noun: "pharmacy", catalog: "products", food: false },
  { value: "butcher", label: "Butcher / fish shop", noun: "butcher shop", catalog: "products", food: false },
  { value: "retail", label: "Shop / boutique", noun: "shop", catalog: "products", food: false },
  { value: "electronics", label: "Electronics / mobile shop", noun: "electronics shop", catalog: "products", food: false },
  { value: "florist", label: "Florist / gifts", noun: "flower and gift shop", catalog: "products", food: false },
  { value: "other", label: "Other business", noun: "local business", catalog: "products", food: false },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];
export const BUSINESS_TYPE_VALUES = BUSINESS_TYPES.map((b) => b.value) as [BusinessType, ...BusinessType[]];

export function businessInfo(type: string | null | undefined) {
  return BUSINESS_TYPES.find((b) => b.value === type) ?? BUSINESS_TYPES[BUSINESS_TYPES.length - 1]!;
}

/** "Menu" for food places, "Products" for everyone else. */
export function catalogLabel(type: string | null | undefined, { plural = true } = {}) {
  const b = businessInfo(type);
  if (b.catalog === "menu") return "Menu";
  return plural ? "Products" : "Product";
}
