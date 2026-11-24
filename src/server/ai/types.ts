// Pure types for the ordering pipeline. No server-only imports so these modules are unit-testable.

export type Intent = "new_order" | "modify_order" | "cancel_order" | "question" | "complaint" | "reservation" | "other";
export type OrderTypeValue = "delivery" | "pickup" | "unknown";
export type PaymentValue = "cash" | "card_on_delivery" | "card_at_pickup" | "bank_transfer" | "pay_at_restaurant" | "unknown";
export type QuestionTopic = "hours" | "delivery_area" | "delivery_fee" | "menu" | "item_info" | "payment" | "order_status" | "location" | "other";

export type LatLng = { lat: number; lng: number };

// ───────── Menu snapshot (what the AI is allowed to know) ─────────

export type I18n = Record<string, string>;

export type MenuVariantSnap = { id: string; name: string; nameI18n: I18n; price: number; isDefault: boolean; isAvailable: boolean };
export type MenuAddonSnap = { id: string; name: string; nameI18n: I18n; price: number; isAvailable: boolean };
export type MenuItemSnap = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  nameI18n: I18n;
  description: string | null;
  price: number;
  isAvailable: boolean;
  isSoldOut: boolean;
  dietaryTags: string[];
  aliases: string[];
  variants: MenuVariantSnap[];
  addons: MenuAddonSnap[];
};
export type MenuSnapshot = { currency: string; items: MenuItemSnap[]; categories: { id: string; name: string; nameI18n: I18n }[] };

export type HoursRow = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean };

export type ZoneSnap = {
  id: string;
  name: string;
  type: "RADIUS" | "AREA";
  radiusKm: number | null;
  areas: string[];
  fee: number;
  minimumOrder: number | null;
  estimatedMinutes: number | null;
};

export type RestaurantFacts = {
  name: string;
  /** Kind of business (restaurant, grocery, pharmacy…); see src/lib/business.ts. */
  businessType: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  currency: string;
  location: LatLng | null;
  defaultLanguage: string;
  supportedLanguages: string[];
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  minimumOrderAmount: number;
  pickupInstructions: string | null;
  deliveryInstructions: string | null;
  prepTimeMinutes: number;
  allowPreorders: boolean;
  acceptedPaymentMethods: PaymentValue[];
  askPaymentPreference: boolean;
  paymentNote: string | null;
  aiTone: string;
  aiCustomInstructions: string | null;
  greetingMessage: string | null;
  autoReplyWhenClosed: boolean;
  closedMessage: string | null;
  handoffOnComplaint: boolean;
  handoffConfidenceThreshold: number;
  handoffKeywords: string[];
  maxClarifications: number;
  hours: HoursRow[];
  zones: ZoneSnap[];
};

// ───────── Cart / draft ─────────

export type CartLine = {
  menuItemId: string;
  variantId: string | null;
  addonIds: string[];
  removals: string[];
  notes: string | null;
  quantity: number;
  name: string;
  variantName: string | null;
  addonNames: string[];
  unitPrice: number;
  lineTotal: number;
  /** Set when the line can't be priced yet, e.g. the item needs a size. */
  pending?: "variant" | null;
};

export type DraftOrder = {
  items: CartLine[];
  orderType: "delivery" | "pickup" | null;
  deliveryAddress: string | null;
  location: LatLng | null;
  zoneId: string | null;
  deliveryFee: number;
  scheduledTime: string | null;
  customerName: string | null;
  paymentPreference: PaymentValue | null;
  notes: string | null;
  /** When set, the customer has been asked to confirm cancelling this order. */
  pendingCancelOrderId?: string | null;
};

export const emptyDraft = (): DraftOrder => ({
  items: [],
  orderType: null,
  deliveryAddress: null,
  location: null,
  zoneId: null,
  deliveryFee: 0,
  scheduledTime: null,
  customerName: null,
  paymentPreference: null,
  notes: null,
  pendingCancelOrderId: null,
});

export type OrderSnapshot = {
  id: string;
  number: number;
  status: string;
  editable: boolean;
  type: "delivery" | "pickup";
  items: CartLine[];
  total: number;
  deliveryAddress: string | null;
  location: LatLng | null;
  scheduledTime: string | null;
  customerName: string | null;
  paymentPreference: PaymentValue | null;
  createdAt: string;
};

// ───────── LLM extraction (raw) and final spec-shaped extraction ─────────

export type RawItem = {
  menu_item_id: string | null;
  name: string;
  quantity: number;
  variant_id: string | null;
  variant: string | null;
  addon_ids: string[];
  addons: string[];
  removals: string[];
  notes: string | null;
};

export type RawExtraction = {
  intent: Intent;
  language: string;
  confirmation: "confirm" | "reject" | "none";
  wants_human: boolean;
  spam_or_abuse: boolean;
  cart_changed: boolean;
  items: RawItem[];
  order_type: OrderTypeValue;
  delivery_address: string | null;
  scheduled_time: string | null;
  customer_name: string | null;
  payment_preference: PaymentValue;
  question_topics: QuestionTopic[];
  confidence: number;
  missing_information: string[];
  requires_human: boolean;
  requires_human_reason: string | null;
};

/** The structured output described in the product spec (prices filled in from the database). */
export type OrderExtraction = {
  intent: Intent;
  language: string;
  items: {
    menu_item_id: string | null;
    name: string;
    quantity: number;
    variant: string | null;
    addons: string[];
    removals: string[];
    notes: string | null;
    unit_price: number;
    line_total: number;
  }[];
  order_type: OrderTypeValue;
  delivery_address: string | null;
  location: LatLng | null;
  scheduled_time: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  payment_preference: PaymentValue;
  confidence: number;
  missing_information: string[];
  requires_human: boolean;
};

export type ItemIssue =
  | { kind: "unknown_item"; name: string; suggestions: string[] }
  | { kind: "sold_out"; name: string; alternatives: string[] }
  | { kind: "unavailable"; name: string; alternatives: string[] }
  | { kind: "needs_variant"; name: string; options: string[] }
  | { kind: "unknown_variant"; name: string; requested: string; options: string[] }
  | { kind: "unknown_addon"; name: string; requested: string; options: string[] }
  | { kind: "invalid_quantity"; name: string };

// ───────── Pipeline I/O ─────────

export type InboundInput = {
  text: string | null;
  location?: (LatLng & { name?: string | null; address?: string | null }) | null;
  buttonId?: string | null;
  transcribed?: boolean;
};

export type HistoryTurn = { role: "customer" | "assistant" | "staff"; text: string };

export type PipelineContext = {
  restaurant: RestaurantFacts;
  menu: MenuSnapshot;
  state: "IDLE" | "ORDERING" | "AWAITING_CONFIRMATION";
  draft: DraftOrder;
  editingOrderId: string | null;
  language: string | null;
  clarificationAttempts: number;
  customer: { name: string | null; savedAddress: string | null; savedLocation: LatLng | null; preferredLanguage: string | null; phone: string | null };
  history: HistoryTurn[];
  /** Most recent order still in an editable status (NEW / CONFIRMED). */
  editableOrder: OrderSnapshot | null;
  /** Most recent order of any status, for "where is my order?" questions. */
  latestOrder: OrderSnapshot | null;
  isFirstContact: boolean;
  now: Date;
};

export type OutboundPlan =
  | { kind: "text"; text: string }
  | { kind: "buttons"; text: string; buttons: { id: string; title: string }[]; footer?: string }
  | { kind: "location_request"; text: string };

export type Action =
  | "ask"
  | "summary"
  | "create_order"
  | "update_order"
  | "confirm_cancel"
  | "cancel_order"
  | "cancel_draft"
  | "cannot_modify"
  | "answer"
  | "handoff"
  | "closed"
  | "redirect"
  | "greet"
  | "clarify";

export type Decision = {
  action: Action;
  state: PipelineContext["state"];
  draft: DraftOrder;
  editingOrderId: string | null;
  clarificationAttempts: number;
  /** Localised fallback reply from templates; the composer may rewrite it. */
  draftReply: string;
  /** Facts the composer may use (in English, the composer translates). */
  facts: string[];
  /** Code-rendered order summary appended verbatim (prices are never written by the model). */
  summaryBlock: string | null;
  buttons: { id: string; title: string }[] | null;
  requestLocation: boolean;
  handoffReason: string | null;
  /** Flag for staff attention without switching the conversation to human mode. */
  flagForStaff: string | null;
  orderEffect: { type: "create" } | { type: "update"; orderId: string } | { type: "cancel"; orderId: string } | null;
  /** Pipeline outcome shown in the playground. */
  outcome: "create_order" | "modify_order" | "cancel_order" | "none";
};
