import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createPublicClient } from "./supabase-public.server";
import type { Slot, TicketType } from "./museum";

export const getTicketTypes = createServerFn({ method: "GET" }).handler(
  async (): Promise<TicketType[]> => {
    const sb = createPublicClient();
    const { data, error } = await sb
      .from("ticket_types")
      .select("code, name, description, price_cents, sort_order")
      .eq("active", true)
      .order("sort_order");
    if (error) throw new Error("Could not load ticket prices");
    return data ?? [];
  },
);

export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data }): Promise<Slot[]> => {
    const sb = createPublicClient();
    const { data: rows, error } = await sb.rpc("slot_availability", { p_date: data.date });
    if (error) throw new Error("Could not load available times");
    return rows ?? [];
  });

const bookingInput = z.object({
  slotStart: z.string().min(10).max(40),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  tickets: z.record(z.string().max(30), z.number().int().min(0).max(20)),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => bookingInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; code: string } | { ok: false; error: string }> => {
    const sb = createPublicClient();
    const { data: code, error } = await sb.rpc("book_tickets", {
      p_slot: data.slotStart,
      p_name: data.name,
      p_email: data.email,
      p_phone: data.phone ?? "",
      p_tickets: data.tickets,
      p_source: "online",
    });
    if (error || !code) {
      return { ok: false, error: error?.message ?? "Booking failed. Please try again." };
    }
    return { ok: true, code };
  });

export type BookingDetails = {
  code: string;
  slot_start: string;
  visitor_name: string;
  tickets: Record<string, number>;
  ticket_count: number;
  total_cents: number;
  status: string;
  payment_status: string;
};

export const getBooking = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().trim().min(4).max(20) }).parse(d),
  )
  .handler(async ({ data }): Promise<BookingDetails | null> => {
    const sb = createPublicClient();
    const { data: rows, error } = await sb.rpc("get_booking", { p_code: data.code });
    if (error) throw new Error("Could not load this booking");
    const row = rows?.[0];
    if (!row) return null;
    return { ...row, tickets: (row.tickets ?? {}) as Record<string, number> };
  });
