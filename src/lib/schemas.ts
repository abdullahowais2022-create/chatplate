import { BUSINESS_TYPE_VALUES } from "./business";
import { z } from "zod";

// Shared request schemas (used by API routes for validation and by forms for types).

const money = z.coerce.number().min(0).max(100000).transform((n) => Math.round(n * 100) / 100);
const i18n = z.record(z.string().min(2).max(8), z.string().max(500)).default({});
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)");
const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((v) => (v ? v : null));

/** Image links: our own uploads (/api/media/public/...) or an https URL. Blocks javascript:, data: etc. */
const imageUrl = optionalText(500).refine((v) => v == null || v === "" || /^\/api\/media\/public\/[\w./-]+$/.test(v) || /^https:\/\/[^\s"'<>]+$/i.test(v), "Use an uploaded image or an https:// link");

export const PAYMENT_METHODS = ["CASH", "CARD_ON_DELIVERY", "CARD_AT_PICKUP", "BANK_TRANSFER", "PAY_AT_RESTAURANT"] as const;
export const ORDER_STATUSES = ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"] as const;
export const ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export const CUSTOMER_TAGS = ["VIP", "REGULAR", "BLOCKED"] as const;
export const DIETARY_TAGS = ["vegetarian", "vegan", "gluten_free", "halal", "spicy", "contains_nuts", "dairy_free"] as const;

export const signupSchema = z.object({
  restaurantName: z.string().trim().min(2).max(100),
  businessType: z.enum(BUSINESS_TYPE_VALUES).default("other"),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(200),
});

export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(200) });

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  businessType: z.enum(BUSINESS_TYPE_VALUES).optional(),
  logoUrl: imageUrl,
  address: optionalText(300),
  phone: optionalText(40),
  email: z.string().trim().email().nullish().or(z.literal("")).transform((v) => v || null),
  timezone: z.string().min(1).max(60).refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone"),
  currency: z.string().length(3).toUpperCase(),
  latitude: z.coerce.number().min(-90).max(90).nullish(),
  longitude: z.coerce.number().min(-180).max(180).nullish(),
});

export const hoursSchema = z.object({
  hours: z
    .array(z.object({ dayOfWeek: z.number().int().min(0).max(6), openTime: time, closeTime: time, isClosed: z.boolean().default(false) }))
    .max(50),
});

export const zoneSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1).max(80),
    type: z.enum(["RADIUS", "AREA"]),
    radiusKm: z.coerce.number().min(0.1).max(200).nullish(),
    areas: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
    fee: money,
    minimumOrder: money.nullish(),
    estimatedMinutes: z.coerce.number().int().min(1).max(600).nullish(),
    isActive: z.boolean().default(true),
  })
  .refine((z) => (z.type === "RADIUS" ? z.radiusKm != null : z.areas.length > 0), "Radius zones need a radius; area zones need at least one area");

export const zonesSchema = z.object({ zones: z.array(zoneSchema).max(30) });

export const businessSettingsSchema = z
  .object({
    deliveryEnabled: z.boolean(),
    pickupEnabled: z.boolean(),
    minimumOrderAmount: money,
    pickupInstructions: optionalText(500),
    deliveryInstructions: optionalText(500),
    prepTimeMinutes: z.coerce.number().int().min(0).max(600),
    allowPreorders: z.boolean(),
    defaultLanguage: z.string().min(2).max(8),
    supportedLanguages: z.array(z.string().min(1).max(8)).max(40),
    acceptedPaymentMethods: z.array(z.enum(PAYMENT_METHODS)).min(1, "Choose at least one payment method"),
    askPaymentPreference: z.boolean(),
    paymentNote: optionalText(500),
    aiEnabled: z.boolean(),
    aiTone: z.enum(["friendly", "professional", "playful", "formal"]),
    aiCustomInstructions: optionalText(1500),
    greetingMessage: optionalText(800),
    autoReplyWhenClosed: z.boolean(),
    closedMessage: optionalText(800),
    handoffOnComplaint: z.boolean(),
    handoffConfidenceThreshold: z.coerce.number().min(0).max(1),
    handoffKeywords: z.array(z.string().trim().min(1).max(40)).max(50),
    maxClarifications: z.coerce.number().int().min(1).max(10),
  })
  .partial()
  .refine((s) => !(s.deliveryEnabled === false && s.pickupEnabled === false), "Enable delivery, pickup, or both");

export const notificationSettingsSchema = z.object({
  notifyEmail: z.boolean(),
  notifyEmailAddresses: z.array(z.string().trim().email()).max(10),
  notifyWhatsApp: z.boolean(),
  notifyWhatsAppNumber: z.string().trim().regex(/^\+?[\d\s-]{7,20}$/, "Enter a phone number with country code").nullish().or(z.literal("")).transform((v) => v || null),
  notifyOnNewOrder: z.boolean(),
  notifyOnNeedsHuman: z.boolean(),
  notifyOnComplaint: z.boolean(),
});

export const whatsappCredentialsSchema = z.object({
  wabaId: z.string().trim().regex(/^\d{5,25}$/, "WhatsApp Business Account ID is numeric"),
  phoneNumberId: z.string().trim().regex(/^\d{5,25}$/, "Phone Number ID is numeric"),
  displayPhoneNumber: optionalText(30),
  accessToken: z.string().trim().min(20).max(1000).optional(),
  appSecret: z.string().trim().regex(/^[a-f0-9]{32}$/i, "App secret is a 32-character hex string").optional(),
});

export const testMessageSchema = z.object({ to: z.string().trim().regex(/^\+?[\d\s-]{7,20}$/, "Enter a phone number with country code") });

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  nameI18n: i18n,
  description: optionalText(300),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

export const menuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  nameI18n: i18n,
  description: optionalText(600),
  descriptionI18n: i18n,
  price: money,
  imageUrl: imageUrl,
  isAvailable: z.boolean().default(true),
  isSoldOut: z.boolean().default(false),
  dietaryTags: z.array(z.string().max(30)).max(10).default([]),
  aliases: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
  variants: z
    .array(z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(60), nameI18n: i18n, price: money, isDefault: z.boolean().default(false), isAvailable: z.boolean().default(true) }))
    .max(20)
    .default([]),
  addons: z
    .array(z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(60), nameI18n: i18n, price: money, isAvailable: z.boolean().default(true) }))
    .max(40)
    .default([]),
});

export const availabilitySchema = z.object({ isSoldOut: z.boolean().optional(), isAvailable: z.boolean().optional() });

export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  assignedToId: z.string().nullable().optional(),
  notes: optionalText(1000).optional(),
});

export const cancelOrderSchema = z.object({ reason: optionalText(300), notifyCustomer: z.boolean().default(true) });

export const replySchema = z.object({ text: z.string().trim().min(1).max(4000), translate: z.boolean().default(false) });

export const customerUpdateSchema = z.object({
  name: optionalText(100).optional(),
  tags: z.array(z.enum(CUSTOMER_TAGS)).max(3).optional(),
  notes: optionalText(2000).optional(),
  savedAddress: optionalText(300).optional(),
  preferredLanguage: optionalText(8).optional(),
});

export const teamCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(ROLES),
  temporaryPassword: z.string().min(10).max(200),
});

export const teamUpdateSchema = z.object({ role: z.enum(ROLES).optional(), isActive: z.boolean().optional(), name: z.string().trim().min(2).max(100).optional() });

export const playgroundSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  state: z.enum(["IDLE", "ORDERING", "AWAITING_CONFIRMATION"]).default("IDLE"),
  draft: z.any().optional(),
  history: z.array(z.object({ role: z.enum(["customer", "assistant", "staff"]), text: z.string().max(4000) })).max(30).default([]),
  language: z.string().max(8).nullish(),
  customerName: z.string().max(100).nullish(),
  forceHeuristic: z.boolean().default(false),
});

export const simulatorSchema = z.object({
  text: z.string().trim().max(2000).optional(),
  buttonId: z.string().max(100).optional(),
  location: z.object({ lat: z.number(), lng: z.number(), address: z.string().max(200).optional() }).optional(),
  customer: z.string().trim().min(1).max(40).default("Test customer"),
});
