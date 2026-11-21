import { describe, expect, it } from "vitest";
import { isBookableDate, ticketTotal, type TicketType } from "@/lib/museum";

const TYPES: TicketType[] = [
  { code: "adult", name: "Adult", description: "", price_cents: 1800, sort_order: 1 },
  { code: "student", name: "Student", description: "", price_cents: 1000, sort_order: 2 },
  { code: "senior", name: "Senior", description: "", price_cents: 1200, sort_order: 3 },
  { code: "child", name: "Child", description: "", price_cents: 0, sort_order: 4 },
];

describe("museum booking rules", () => {
  it("totals euro prices: 2 adults + 1 student + 1 senior + 2 children = €58", () => {
    expect(ticketTotal(TYPES, { adult: 2, student: 1, senior: 1, child: 2 })).toEqual({
      count: 6,
      cents: 5800,
    });
  });

  it("does not allow bookings on Mondays", () => {
    // 2026-11-23 is a Monday
    expect(isBookableDate("2026-11-23", "2026-11-21")).toBe(false);
    expect(isBookableDate("2026-11-24", "2026-11-21")).toBe(true);
  });

  it("only allows booking from today up to 60 days ahead", () => {
    expect(isBookableDate("2026-11-20", "2026-11-21")).toBe(false);
    expect(isBookableDate("2027-01-20", "2026-11-21")).toBe(true); // day 60
    expect(isBookableDate("2027-01-21", "2026-11-21")).toBe(false); // day 61
  });
});
