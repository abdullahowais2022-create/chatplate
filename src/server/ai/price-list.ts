// Pure helper (no server imports) so it can be unit-tested.
export type PriceListDraft = {
  categories: { name: string; items: { name: string; description: string | null; price: number; variants: { name: string; price: number }[] }[] }[];
  greetingMessage: string | null;
};

/** Fallback without OpenAI: reads lines like "Margherita pizza ..... 12.50" or "Rice 5kg - $9". */
export function parsePriceListText(text: string): PriceListDraft {
  const categories: PriceListDraft["categories"] = [];
  let current: PriceListDraft["categories"][number] | null = null;
  const priceRe = /^(.*?)[\s.:\-–—|=]*(?:[$€£₹¥]|rs\.?|aed|sar|usd|eur|gbp|pkr|inr)?\s*(\d{1,7}(?:[.,]\d{1,2})?)\s*(?:[$€£₹¥]|rs\.?|aed|sar|usd|eur|gbp|pkr|inr|\/-)?\s*$/i;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^[\s*•·\-–]+/, "").trim();
    if (!line) continue;
    const m = priceRe.exec(line);
    const name = m?.[1]?.replace(/[\s.:\-–—|=]+$/, "").trim();
    if (m && name && /[\p{L}]/u.test(name)) {
      if (!current) categories.push((current = { name: "Products", items: [] }));
      current.items.push({ name: name.slice(0, 120), description: null, price: Number(m[2]!.replace(",", ".")), variants: [] });
    } else if (line.length <= 60 && /[\p{L}]/u.test(line)) {
      categories.push((current = { name: line.replace(/:$/, "").slice(0, 80), items: [] }));
    }
  }
  return { categories: categories.filter((c) => c.items.length > 0), greetingMessage: null };
}

