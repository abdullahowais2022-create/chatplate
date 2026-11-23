import type { MenuSnapshot, PipelineContext, RestaurantFacts } from "../types";
import { emptyDraft } from "../types";

export const menu: MenuSnapshot = {
  currency: "USD",
  categories: [
    { id: "c_pizza", name: "Pizza", nameI18n: { fr: "Pizzas" } },
    { id: "c_burger", name: "Burgers", nameI18n: {} },
    { id: "c_drinks", name: "Drinks", nameI18n: {} },
  ],
  items: [
    {
      id: "i_pep", categoryId: "c_pizza", categoryName: "Pizza", name: "Pepperoni Pizza", nameI18n: { fr: "Pizza Pepperoni" }, description: null,
      price: 12, isAvailable: true, isSoldOut: false, dietaryTags: [], aliases: ["pepperoni"],
      variants: [
        { id: "v_pep_s", name: "Small", nameI18n: {}, price: 10, isDefault: false, isAvailable: true },
        { id: "v_pep_l", name: "Large", nameI18n: { fr: "Grande" }, price: 16, isDefault: false, isAvailable: true },
      ],
      addons: [{ id: "a_cheese", name: "Extra cheese", nameI18n: {}, price: 1.5, isAvailable: true }],
    },
    {
      id: "i_marg", categoryId: "c_pizza", categoryName: "Pizza", name: "Margherita Pizza", nameI18n: {}, description: null,
      price: 11, isAvailable: true, isSoldOut: false, dietaryTags: ["vegetarian"], aliases: ["margherita"],
      variants: [
        { id: "v_marg_s", name: "Small", nameI18n: {}, price: 9, isDefault: false, isAvailable: true },
        { id: "v_marg_l", name: "Large", nameI18n: {}, price: 14, isDefault: false, isAvailable: true },
      ],
      addons: [],
    },
    {
      id: "i_burger", categoryId: "c_burger", categoryName: "Burgers", name: "Chicken Burger", nameI18n: {}, description: null,
      price: 9.5, isAvailable: true, isSoldOut: false, dietaryTags: [], aliases: ["chicken burgers"], variants: [], addons: [],
    },
    {
      id: "i_truffle", categoryId: "c_burger", categoryName: "Burgers", name: "Truffle Burger", nameI18n: {}, description: null,
      price: 15, isAvailable: true, isSoldOut: true, dietaryTags: [], aliases: [], variants: [], addons: [],
    },
    {
      id: "i_fries", categoryId: "c_burger", categoryName: "Burgers", name: "Fries", nameI18n: {}, description: null,
      price: 3.5, isAvailable: true, isSoldOut: false, dietaryTags: ["vegan"], aliases: ["chips"], variants: [], addons: [],
    },
    {
      id: "i_coke", categoryId: "c_drinks", categoryName: "Drinks", name: "Coca-Cola", nameI18n: {}, description: null,
      price: 2.5, isAvailable: true, isSoldOut: false, dietaryTags: [], aliases: ["coke", "cola"],
      variants: [
        { id: "v_coke_can", name: "Can", nameI18n: {}, price: 2.5, isDefault: true, isAvailable: true },
        { id: "v_coke_btl", name: "1.5L Bottle", nameI18n: {}, price: 4, isDefault: false, isAvailable: true },
      ],
      addons: [],
    },
  ],
};

const allWeek = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, openTime: "00:00", closeTime: "23:59", isClosed: false }));

export const restaurant: RestaurantFacts = {
  name: "Test Pizzeria",
  address: "1 Main St",
  phone: "+1 555 0100",
  timezone: "UTC",
  currency: "USD",
  location: { lat: 40.7128, lng: -74.006 },
  defaultLanguage: "en",
  supportedLanguages: ["*"],
  deliveryEnabled: true,
  pickupEnabled: true,
  minimumOrderAmount: 0,
  pickupInstructions: null,
  deliveryInstructions: null,
  prepTimeMinutes: 20,
  allowPreorders: true,
  acceptedPaymentMethods: ["cash", "card_on_delivery"],
  askPaymentPreference: false,
  paymentNote: null,
  aiTone: "friendly",
  aiCustomInstructions: null,
  greetingMessage: null,
  autoReplyWhenClosed: true,
  closedMessage: null,
  handoffOnComplaint: true,
  handoffConfidenceThreshold: 0.45,
  handoffKeywords: ["allergy"],
  maxClarifications: 3,
  hours: allWeek,
  zones: [{ id: "z1", name: "Downtown", type: "RADIUS", radiusKm: 5, areas: [], fee: 3, minimumOrder: null, estimatedMinutes: 35 }],
};

export function ctx(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    restaurant,
    menu,
    state: "IDLE",
    draft: emptyDraft(),
    editingOrderId: null,
    language: null,
    clarificationAttempts: 0,
    customer: { name: null, savedAddress: null, savedLocation: null, preferredLanguage: null, phone: "15550001111" },
    history: [],
    editableOrder: null,
    latestOrder: null,
    isFirstContact: false,
    now: new Date("2026-11-23T15:00:00Z"),
    ...overrides,
  };
}
