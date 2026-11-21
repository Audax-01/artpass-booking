// Shared, browser-safe museum facts and date helpers.
export const MUSEUM = {
  name: "Galerie Lumière",
  short: "Lumière",
  timeZone: "Europe/Paris",
  addressLines: ["14 Rue de la Lumière", "75003 Paris, France"],
  email: "visit@galerielumiere.fr",
  phone: "+33 1 42 00 18 18",
  capacityPerSlot: 40,
  maxTicketsPerBooking: 20,
  maxDaysAhead: 60,
  firstEntryHour: 10,
  lastEntryHour: 17,
  closingTime: "18:00",
} as const;

export const OPENING_HOURS = [
  { days: "Monday", hours: "Closed" },
  { days: "Tuesday – Sunday", hours: "10:00 – 18:00" },
  { days: "Last entry", hours: "17:00" },
] as const;

const euro = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export function formatEuro(cents: number): string {
  return euro.format(cents / 100).replace(/\.00$/, "");
}

export function formatPrice(cents: number): string {
  return cents === 0 ? "Free" : formatEuro(cents);
}

/** Calendar date (yyyy-MM-dd) of an instant in the museum's time zone. */
export function businessDate(instant: Date, timeZone: string = MUSEUM.timeZone): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: "year" | "month" | "day") => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new RangeError(`Missing date part: ${type}`);
    return part.value;
  };
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** yyyy-MM-dd from a calendar-picked local Date (the day the visitor clicked). */
export function dateKeyFromLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function localDateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isMondayKey(key: string): boolean {
  return new Date(`${key}T12:00:00Z`).getUTCDay() === 1;
}

/** Visitors can book from today up to MUSEUM.maxDaysAhead days ahead, never on Mondays. */
export function isBookableDate(key: string, todayKey: string): boolean {
  if (isMondayKey(key)) return false;
  if (key < todayKey) return false;
  return key <= addDaysToKey(todayKey, MUSEUM.maxDaysAhead);
}

export function formatLongDate(key: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${key}T12:00:00Z`));
}

export function slotTime(instant: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MUSEUM.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(typeof instant === "string" ? new Date(instant) : instant);
}

export function slotDateKey(instant: string): string {
  return businessDate(new Date(instant));
}

export type TicketType = {
  code: string;
  name: string;
  description: string;
  price_cents: number;
  sort_order: number;
};

export type Slot = {
  slot_start: string;
  capacity: number;
  booked: number;
  remaining: number;
  blocked: boolean;
};

export function ticketTotal(types: TicketType[], qty: Record<string, number>) {
  let count = 0;
  let cents = 0;
  for (const t of types) {
    const n = qty[t.code] ?? 0;
    count += n;
    cents += n * t.price_cents;
  }
  return { count, cents };
}
