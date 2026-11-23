// Rule-based extractor used when no OpenAI key is configured (demo mode) or the API is unavailable.
// It's intentionally conservative: when unsure it reports low confidence so the flow asks a question.

import type { CartLine, MenuItemSnap, MenuSnapshot, PaymentValue, PipelineContext, QuestionTopic, RawExtraction, RawItem } from "./types";
import { namesOf, normalize, bestMatch } from "./match";
import { linesToRaw } from "./validate";
import { zonedParts, zonedTimeToUtc } from "./hours";

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2,
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  bir: 1, iki: 2, uc: 3, dort: 4, bes: 5,
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5,
  واحد: 1, اثنين: 2, ثلاثة: 3, اربعة: 4,
  एक: 1, दो: 2, तीन: 3, चार: 4,
  ایک: 1, دو: 2, تین: 3, چار: 4,
};

export function detectLanguage(text: string, fallback = "en"): string {
  if (/[؀-ۿ]/.test(text)) return /[ٹڈڑںےۓہھگک]/.test(text) && !/[ةى]/.test(text) ? "ur" : "ar";
  if (/[ऀ-ॿ]/.test(text)) return "hi";
  const n = ` ${normalize(text)} `;
  if (/[ğşıİ]/.test(text) || / (istiyorum|lutfen|tesekkur|merhaba|siparis|evet|hayir|tane|paket) /.test(n)) return "tr";
  if (/ (je|veux|voudrais|bonjour|merci|livraison|commande|sil vous plait|avec|sans|oui) /.test(n)) return "fr";
  if (/ (quiero|hola|gracias|por favor|pedido|entrega|domicilio|sin|con|quisiera) /.test(n)) return "es";
  if (/ (mujhe|chahiye|aur|nahi|kitne|bhai|haan|kya) /.test(n)) return "hi";
  if (/ (the|want|please|i|can|get|order|hi|hello|and|with|deliver) /.test(n)) return "en";
  return fallback;
}

const HUMAN = /\b(human|humano|humain|agent|real person|someone|staff|manager|operator)\b|موظف|انسان|इंसान|insan|yetkili/;
const CANCEL = /\b(cancel|annul|annuler|cancelar|iptal)\b|إلغاء|الغاء|रद्द|منسوخ/;
const CONFIRM = /^(yes|yep|yeah|yup|confirm|confirmed|ok|okay|sure|correct|perfect|go ahead|oui|si|sí|claro|evet|tamam|onayla|confirmar|confirmer|haan|ha|ji|نعم|ايوه|اكيد|हाँ|हां|ہاں|جی)\b/;
const REJECT = /^(no|nope|non|hayir|hayır|nahi|nahin)\b|^لا\b|^नहीं|^نہیں/;
const COMPLAINT = /\b(cold|late|terrible|awful|disgusting|complain|complaint|wrong order|missing|refund|rude|raw|burnt|horrible)\b|شكوى|سيء/;
const RESERVATION = /\b(reserve|reservation|book a table|table for|réserver|reservar|rezervasyon)\b/;
const REMOVE = /\b(remove|delete|take off|drop|no more|cancel the|enlever|retirer|quitar|sacar|cikar|kaldir)\b|احذف|हटाओ|ہٹا/;
const SET_QTY = /\b(instead|make it|change to|change it to|only|plutot|en lugar|yerine)\b/;
const DELIVERY = /\b(deliver|delivery|delivered|livraison|livrer|entrega|domicilio|envio|teslimat|eve|ghar)\b|توصيل|डिलीवरी|ڈیلیوری/;
const PICKUP = /\b(pick ?up|collect|takeaway|take away|take out|emporter|recoger|gel al|paket)\b|استلام|पिकअप|پک اپ/;
const STREET = /\b(street|st|road|rd|avenue|ave|lane|blvd|boulevard|rue|calle|avenida|sokak|cadde|cad|mahalle|apt|flat|building)\b/;

function detectPayment(n: string): PaymentValue {
  if (/\b(bank transfer|transfer|virement|transferencia|havale|eft)\b/.test(n)) return "bank_transfer";
  if (/\b(cash|espece|especes|efectivo|nakit|naqd|cod)\b|نقد|नकद/.test(n)) return "cash";
  if (/\b(card|carte|tarjeta|kart)\b/.test(n)) return /\b(pick ?up|collect|retrait|recoger)\b/.test(n) ? "card_at_pickup" : "card_on_delivery";
  return "unknown";
}

function questionTopics(n: string, raw: string): QuestionTopic[] {
  const topics = new Set<QuestionTopic>();
  if (/\b(open|close|closing|opening|hours|ouvert|ferme|horario|abren|acik|kapali|saat)\b|متى|कब|کب/.test(n)) topics.add("hours");
  if (/\b(deliver to|deliver in|do you deliver|delivery area|livrez|entregan|teslimat yapiyor)\b/.test(n)) topics.add("delivery_area");
  if (/\b(delivery fee|delivery cost|delivery charge|frais de livraison|costo de envio)\b/.test(n)) topics.add("delivery_fee");
  if (/\b(menu|carte|what do you have|que tienen|ne var)\b|القائمة|मेन्यू|مینو/.test(n)) topics.add("menu");
  if (/\b(pay|payment|card|cash|payer|pagar|odeme)\b/.test(n) && raw.includes("?")) topics.add("payment");
  if (/\b(where is my order|order status|my order|how long|ou est ma commande|donde esta mi pedido|siparisim nerede)\b/.test(n)) topics.add("order_status");
  if (/\b(where are you|your address|location|adresse|direccion|neredesiniz)\b/.test(n)) topics.add("location");
  return [...topics];
}

type Hit = { item: MenuItemSnap; start: number; end: number };

function findItemHits(n: string, menu: MenuSnapshot): Hit[] {
  const hits: Hit[] = [];
  const candidates = menu.items.flatMap((item) => namesOf(item).map((name) => ({ item, name: normalize(name) })));
  candidates.sort((a, b) => b.name.length - a.name.length); // longest names first
  const taken: [number, number][] = [];
  for (const { item, name } of candidates) {
    if (name.length < 2) continue;
    const variants = [name, name.endsWith("s") ? name : `${name}s`, name.endsWith("s") ? name.slice(0, -1) : name];
    for (const v of variants) {
      const re = new RegExp(`(^|\\s)${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "gu");
      let m: RegExpExecArray | null;
      while ((m = re.exec(n))) {
        const start = m.index + m[1]!.length;
        const end = start + v.length;
        if (taken.some(([s, e]) => start < e && end > s)) continue;
        taken.push([start, end]);
        hits.push({ item, start, end });
      }
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

function quantityBefore(n: string, start: number): number | null {
  const before = n.slice(Math.max(0, start - 30), start).trim().split(" ").slice(-3);
  for (let i = before.length - 1; i >= 0; i--) {
    const w = before[i]!;
    if (/^\d{1,2}$/.test(w)) return Number(w);
    const x = w.replace(/x$/, "");
    if (/^\d{1,2}$/.test(x)) return Number(x);
    if (NUMBER_WORDS[w] !== undefined) return NUMBER_WORDS[w]!;
  }
  return null;
}

function segmentBounds(n: string, hit: Hit, next?: Hit): [number, number] {
  const end = next ? next.start : n.length;
  const start = Math.max(n.lastIndexOf(",", hit.start), n.lastIndexOf(" and ", hit.start), 0);
  return [start, end];
}

function segmentAround(n: string, hit: Hit, next?: Hit): string {
  const [s, e] = segmentBounds(n, hit, next);
  return n.slice(s, e);
}

function parseTime(n: string, ctx: PipelineContext): string | null {
  const m = n.match(/\b(?:at|for|a las|a|vers|saat)\s+(\d{1,2})(?:[:h.](\d{2}))?\s*(am|pm)?\b/) ?? n.match(/\b(\d{1,2})[:h](\d{2})\s*(am|pm)?\b/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  const tz = ctx.restaurant.timezone;
  const p = zonedParts(ctx.now, tz);
  let at = zonedTimeToUtc(p.year, p.month, p.day, h, min, tz);
  if (!m[3] && h < 12 && at < ctx.now) at = zonedTimeToUtc(p.year, p.month, p.day, h + 12, min, tz);
  if (at < ctx.now) at = new Date(at.getTime() + 24 * 3_600_000);
  return at.toISOString();
}

export function heuristicExtract(ctx: PipelineContext, text: string): RawExtraction {
  const raw = text.trim();
  const n = normalize(raw);
  const language = detectLanguage(raw, ctx.language ?? ctx.restaurant.defaultLanguage);
  const words = n.split(" ").filter(Boolean);

  const currentLines: CartLine[] = ctx.draft.items.length ? ctx.draft.items : [];
  const cart: RawItem[] = linesToRaw(currentLines);
  let cartChanged = false;

  const hits = findItemHits(n, ctx.menu);
  hits.forEach((hit, idx) => {
    const seg = segmentAround(n, hit, hits[idx + 1]);
    const qty = quantityBefore(n, hit.start);
    const variant = bestVariantIn(seg, hit.item);
    const addons = hit.item.addons.filter((a) => namesOf(a).some((x) => seg.includes(normalize(x)) && !negated(seg, normalize(x)))).map((a) => a.id);
    const removals = [...seg.matchAll(/\b(?:no|without|sans|sin|hold the|minus)\s+([\p{L}]+(?:\s(?!and\b)[\p{L}]+)?)/gu)].map((m) => m[1]!).filter((r) => !namesOf(hit.item).some((x) => normalize(x).includes(r)));
    const existing = cart.find((c) => c.menu_item_id === hit.item.id);

    const beforeItem = n.slice(segmentBounds(n, hit, hits[idx + 1])[0], hit.start);
    if (REMOVE.test(seg) || (existing && /\b(no|without|sans|sin)\s*$/.test(beforeItem))) {
      if (existing) {
        cart.splice(cart.indexOf(existing), 1);
        cartChanged = true;
      }
      return;
    }
    if (existing && (SET_QTY.test(n) || (qty === null && (variant || addons.length)))) {
      if (qty !== null) existing.quantity = qty;
      if (variant) {
        existing.variant_id = variant;
        existing.variant = null;
      }
      if (addons.length) existing.addon_ids = [...new Set([...existing.addon_ids, ...addons])];
      cartChanged = true;
      return;
    }
    cart.push({
      menu_item_id: hit.item.id,
      name: hit.item.name,
      quantity: qty ?? 1,
      variant_id: variant,
      variant: null,
      addon_ids: addons,
      addons: [],
      removals,
      notes: null,
    });
    cartChanged = true;
  });

  // Answering a size question: "large" fills in a pending line.
  if (!hits.length) {
    for (const c of cart) {
      const line = currentLines.find((l) => l.menuItemId === c.menu_item_id && l.pending === "variant");
      const item = ctx.menu.items.find((i) => i.id === c.menu_item_id);
      if (line && item) {
        const v = bestVariantIn(n, item);
        if (v) {
          c.variant_id = v;
          cartChanged = true;
        }
      }
    }
  }

  const short = words.length <= 5;
  const wantsHuman = HUMAN.test(n) || n === "human" || n === "humano" || n === "humain";
  const isCancel = CANCEL.test(n) && !hits.length;
  const confirmation: RawExtraction["confirmation"] = short && CONFIRM.test(n) ? "confirm" : short && REJECT.test(n) ? "reject" : "none";
  const topics = questionTopics(n, raw);

  let orderType: RawExtraction["order_type"] = "unknown";
  if (PICKUP.test(n)) orderType = "pickup";
  else if (DELIVERY.test(n) && !topics.includes("delivery_area") && !topics.includes("delivery_fee")) orderType = "delivery";

  const nameMatch = raw.match(/(?:my name is|name is|name:|i am|i'm|je m'appelle|me llamo|mi nombre es|ismim|adım)\s+([\p{L}][\p{L}'-]*(?:\s[\p{L}][\p{L}'-]*)?)/iu);
  const addrMatch = raw.match(/(?:address is|address:|deliver to|adresse\s*:?|dirección\s*:?|adres\s*:?)\s*(.{6,160})/i);
  let address = addrMatch?.[1]?.trim() ?? null;
  if (!address && STREET.test(n) && /\d/.test(n) && !hits.length) address = raw;

  let intent: RawExtraction["intent"] = "other";
  if (isCancel) intent = "cancel_order";
  else if (COMPLAINT.test(n)) intent = "complaint";
  else if (RESERVATION.test(n)) intent = "reservation";
  else if (cartChanged) intent = ctx.editableOrder && !ctx.draft.items.length && (SET_QTY.test(n) || REMOVE.test(n) || /\badd\b/.test(n)) ? "modify_order" : ctx.draft.items.length ? "modify_order" : "new_order";
  else if (topics.length || raw.includes("?")) intent = "question";
  else if (/\b(order|want|like|get|commander|quiero|pedir|siparis)\b/.test(n)) intent = "new_order";

  // Modifying an existing confirmed order: start from its items.
  if (intent === "modify_order" && !ctx.draft.items.length && ctx.editableOrder) {
    const base = linesToRaw(ctx.editableOrder.items);
    for (const c of cart) {
      const ex = base.find((b) => b.menu_item_id === c.menu_item_id);
      if (ex) Object.assign(ex, c);
      else base.push(c);
    }
    if (hits.some((h) => REMOVE.test(segmentAround(n, h)))) {
      for (const h of hits) if (REMOVE.test(segmentAround(n, h))) base.splice(base.findIndex((b) => b.menu_item_id === h.item.id), 1);
    }
    cart.splice(0, cart.length, ...base);
  }

  const recognised = cartChanged || wantsHuman || isCancel || confirmation !== "none" || topics.length > 0 || orderType !== "unknown" || Boolean(nameMatch) || Boolean(address) || intent !== "other";
  const greetingOnly = /^(hi|hello|hey|salut|bonjour|hola|merhaba|selam|namaste|salam|assalam|marhaba)\b/.test(n) || /^(السلام|مرحبا|नमस्ते)/.test(raw);

  return {
    intent,
    language,
    confirmation,
    wants_human: wantsHuman,
    spam_or_abuse: /\b(fuck|shit|idiot|stupid|bitch)\b/.test(n),
    cart_changed: cartChanged,
    items: cart,
    order_type: orderType,
    delivery_address: address,
    scheduled_time: parseTime(n, ctx),
    customer_name: nameMatch?.[1]?.trim() ?? null,
    payment_preference: detectPayment(n),
    question_topics: topics,
    confidence: recognised ? 0.75 : greetingOnly ? 0.9 : 0.3,
    missing_information: [],
    requires_human: false,
    requires_human_reason: null,
  };
}

function negated(seg: string, word: string): boolean {
  return new RegExp(`\\b(no|without|sans|sin)\\s+${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(seg);
}

function bestVariantIn(seg: string, item: MenuItemSnap): string | null {
  for (const v of item.variants) {
    if (namesOf(v).some((x) => ` ${seg} `.includes(` ${normalize(x)} `))) return v.id;
  }
  const single = { small: ["small", "petit", "petite", "pequena", "pequeno", "kucuk"], medium: ["medium", "moyen", "moyenne", "mediana", "mediano", "orta"], large: ["large", "big", "grand", "grande", "buyuk"] } as const;
  for (const [key, words] of Object.entries(single)) {
    if (words.some((w) => ` ${seg} `.includes(` ${w} `))) {
      const v = bestMatch(item.variants, key, 0.5);
      if (v) return v.item.id;
    }
  }
  return null;
}
