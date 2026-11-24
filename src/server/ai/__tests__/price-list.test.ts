import { describe, expect, it } from "vitest";
import { parsePriceListText } from "../price-list";

describe("parsePriceListText", () => {
  it("reads headings as categories and lines with prices as products", () => {
    const d = parsePriceListText(`Fruit & veg\nBananas 1 kg - 1.20\n• Tomatoes 500 g ..... $0.99\n\nDrinks:\nCoca-Cola 1.5 L  1,80 €`);
    expect(d.categories.map((c) => c.name)).toEqual(["Fruit & veg", "Drinks"]);
    expect(d.categories[0]!.items).toEqual([
      { name: "Bananas 1 kg", description: null, price: 1.2, variants: [] },
      { name: "Tomatoes 500 g", description: null, price: 0.99, variants: [] },
    ]);
    expect(d.categories[1]!.items[0]).toMatchObject({ name: "Coca-Cola 1.5 L", price: 1.8 });
  });
  it("puts products without a heading into a default category", () => {
    expect(parsePriceListText("Paracetamol 500mg x20 = Rs 120").categories).toEqual([
      { name: "Products", items: [{ name: "Paracetamol 500mg x20", description: null, price: 120, variants: [] }] },
    ]);
  });
  it("returns nothing for text without prices", () => {
    expect(parsePriceListText("We sell fresh bread every morning").categories).toEqual([]);
  });
});
