import { describe, expect, it } from "vitest";
import { chooseLanguage } from "../flow";
import { t, registerLanguage } from "../i18n";
import { ctx, restaurant } from "./fixtures";
import { ALL_LANGUAGES, languageName } from "@/lib/languages";

describe("any language", () => {
  it("keeps any detected language when the business replies in every language", () => {
    for (const code of ["sw", "tl", "vi", "yo", "am", "ja"]) {
      expect(chooseLanguage(ctx(), code, "a message with enough words in it")).toBe(code);
    }
  });
  it("normalises regional codes (pt-BR → pt)", () => {
    expect(chooseLanguage(ctx(), "pt-BR", "quero duas pizzas grandes por favor")).toBe("pt");
  });
  it("falls back to the default language when the business limits languages", () => {
    const c = ctx({ restaurant: { ...restaurant, supportedLanguages: ["en", "ar"] } });
    expect(chooseLanguage(c, "sw", "nataka pizza mbili kubwa tafadhali")).toBe("en");
  });
  it("uses AI-translated labels for languages without built-in text, English for missing keys", () => {
    registerLanguage("sw", { askOrderType: "Kuletewa au kuchukua?" });
    expect(t("sw", "askOrderType")).toBe("Kuletewa au kuchukua?");
    expect(t("sw-KE", "askOrderType")).toBe("Kuletewa au kuchukua?");
    expect(t("sw", "redirect", { restaurant: "X" })).toContain("X");
  });
  it("lists every ISO 639-1 language with names", () => {
    expect(ALL_LANGUAGES.length).toBeGreaterThan(180);
    expect(languageName("sw")).toBe("Swahili");
    expect(languageName("pt-BR")).toBe("Portuguese");
    expect(languageName("zz")).toBe("ZZ");
  });
});
