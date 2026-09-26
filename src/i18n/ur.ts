import type { en } from "./en";

/** اردو — must contain exactly the same keys (and the same {placeholders}) as en.ts. */
export const ur: Record<keyof typeof en, string> = {
  "language.system": "فون کی زبان",
  "language.title": "زبان",
  "language.restartTitle": "مکمل کرنے کے لیے دوبارہ کھولیں",
  "language.restartBody": "تحریر کی سمت بدلنے کے لیے میڈیولر کو بند کر کے دوبارہ کھولیں۔",
  "common.cancel": "منسوخ کریں",
  "common.done": "مکمل",
};
