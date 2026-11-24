export const DEMO_EMAIL = "demo@tilltext.app";
export const APP_NAME = "TillText";

export const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Cash on delivery",
  CARD_ON_DELIVERY: "Card on delivery",
  CARD_AT_PICKUP: "Card at pickup",
  BANK_TRANSFER: "Bank transfer",
  PAY_AT_RESTAURANT: "Pay in store",
  UNKNOWN: "Not specified",
};

export { languageName } from "./languages";
import { ALL_LANGUAGES } from "./languages";
/** Every language (ISO 639-1). The AI understands and replies in all of them. */
export const LANGUAGES = ALL_LANGUAGES;

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
