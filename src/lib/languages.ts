/**
 * Every ISO 639-1 language. TillText's AI understands and replies in all of them; this list only
 * drives dropdowns and labels. Codes the AI reports that aren't listed still work everywhere.
 */
const NAMES: Record<string, string> = {
  aa: "Afar", ab: "Abkhazian", af: "Afrikaans", ak: "Akan", am: "Amharic", an: "Aragonese", ar: "Arabic", as: "Assamese",
  av: "Avaric", ay: "Aymara", az: "Azerbaijani", ba: "Bashkir", be: "Belarusian", bg: "Bulgarian", bi: "Bislama", bm: "Bambara",
  bn: "Bengali", bo: "Tibetan", br: "Breton", bs: "Bosnian", ca: "Catalan", ce: "Chechen", ch: "Chamorro", co: "Corsican",
  cr: "Cree", cs: "Czech", cv: "Chuvash", cy: "Welsh", da: "Danish", de: "German", dv: "Dhivehi", dz: "Dzongkha", ee: "Ewe",
  el: "Greek", en: "English", eo: "Esperanto", es: "Spanish", et: "Estonian", eu: "Basque", fa: "Persian", ff: "Fula",
  fi: "Finnish", fj: "Fijian", fo: "Faroese", fr: "French", fy: "Western Frisian", ga: "Irish", gd: "Scottish Gaelic",
  gl: "Galician", gn: "Guarani", gu: "Gujarati", gv: "Manx", ha: "Hausa", he: "Hebrew", hi: "Hindi", ho: "Hiri Motu",
  hr: "Croatian", ht: "Haitian Creole", hu: "Hungarian", hy: "Armenian", hz: "Herero", ia: "Interlingua", id: "Indonesian",
  ie: "Interlingue", ig: "Igbo", ii: "Sichuan Yi", ik: "Inupiaq", io: "Ido", is: "Icelandic", it: "Italian", iu: "Inuktitut",
  ja: "Japanese", jv: "Javanese", ka: "Georgian", kg: "Kongo", ki: "Kikuyu", kj: "Kuanyama", kk: "Kazakh", kl: "Greenlandic",
  km: "Khmer", kn: "Kannada", ko: "Korean", kr: "Kanuri", ks: "Kashmiri", ku: "Kurdish", kv: "Komi", kw: "Cornish",
  ky: "Kyrgyz", la: "Latin", lb: "Luxembourgish", lg: "Ganda", li: "Limburgish", ln: "Lingala", lo: "Lao", lt: "Lithuanian",
  lu: "Luba-Katanga", lv: "Latvian", mg: "Malagasy", mh: "Marshallese", mi: "Māori", mk: "Macedonian", ml: "Malayalam",
  mn: "Mongolian", mr: "Marathi", ms: "Malay", mt: "Maltese", my: "Burmese", na: "Nauru", nb: "Norwegian Bokmål",
  nd: "North Ndebele", ne: "Nepali", ng: "Ndonga", nl: "Dutch", nn: "Norwegian Nynorsk", no: "Norwegian", nr: "South Ndebele",
  nv: "Navajo", ny: "Chichewa", oc: "Occitan", oj: "Ojibwe", om: "Oromo", or: "Odia", os: "Ossetian", pa: "Punjabi", pi: "Pali",
  pl: "Polish", ps: "Pashto", pt: "Portuguese", qu: "Quechua", rm: "Romansh", rn: "Kirundi", ro: "Romanian", ru: "Russian",
  rw: "Kinyarwanda", sa: "Sanskrit", sc: "Sardinian", sd: "Sindhi", se: "Northern Sami", sg: "Sango", si: "Sinhala",
  sk: "Slovak", sl: "Slovenian", sm: "Samoan", sn: "Shona", so: "Somali", sq: "Albanian", sr: "Serbian", ss: "Swati",
  st: "Southern Sotho", su: "Sundanese", sv: "Swedish", sw: "Swahili", ta: "Tamil", te: "Telugu", tg: "Tajik", th: "Thai",
  ti: "Tigrinya", tk: "Turkmen", tl: "Tagalog (Filipino)", tn: "Tswana", to: "Tongan", tr: "Turkish", ts: "Tsonga", tt: "Tatar",
  tw: "Twi", ty: "Tahitian", ug: "Uyghur", uk: "Ukrainian", ur: "Urdu", uz: "Uzbek", ve: "Venda", vi: "Vietnamese",
  vo: "Volapük", wa: "Walloon", wo: "Wolof", xh: "Xhosa", yi: "Yiddish", yo: "Yoruba", za: "Zhuang", zh: "Chinese", zu: "Zulu",
};

/** The most-used languages first in dropdowns, then the rest alphabetically. */
const POPULAR = ["en", "ar", "es", "fr", "hi", "ur", "zh", "pt", "bn", "ru", "tr", "de", "id", "fa", "it", "ja", "ko", "sw", "tl", "vi", "pa", "ta", "ms", "nl", "pl", "uk", "th", "ha", "am", "so"];

export type Language = { code: string; name: string };

export const ALL_LANGUAGES: Language[] = Object.entries(NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const POPULAR_LANGUAGES: Language[] = POPULAR.map((code) => ({ code, name: NAMES[code]! }));

export function languageName(code?: string | null): string {
  if (!code) return "—";
  const base = code.toLowerCase().split(/[-_]/)[0]!;
  if (NAMES[base]) return NAMES[base]!;
  try {
    const n = new Intl.DisplayNames(["en"], { type: "language" }).of(base);
    if (n && n.toLowerCase() !== base) return n;
  } catch {
    /* unknown code */
  }
  return code.toUpperCase();
}

/** True for real ISO 639-1 codes. Used to stop made-up codes from triggering paid AI translations. */
export function isKnownLanguage(code: string | null | undefined): boolean {
  return Boolean(code && NAMES[code.toLowerCase().split(/[-_]/)[0]!]);
}
