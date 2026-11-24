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

export const LANGUAGES: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "hi", name: "Hindi" },
  { code: "ur", name: "Urdu" },
  { code: "tr", name: "Turkish" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "fa", name: "Persian" },
  { code: "bn", name: "Bengali" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese" },
];

export const languageName = (code?: string | null) => LANGUAGES.find((l) => l.code === code)?.name ?? (code ? code.toUpperCase() : "—");

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
