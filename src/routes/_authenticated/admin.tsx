import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, LogOut, Minus, Plus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  addDaysToKey,
  businessDate,
  formatEuro,
  formatLongDate,
  MUSEUM,
  slotTime,
  ticketTotal,
  type Slot,
  type TicketType,
} from "@/lib/museum";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Bookings dashboard — Galerie Lumière" },
      { name: "description", content: "Staff dashboard for Galerie Lumière bookings and entry times." },
      { property: "og:title", content: "Bookings dashboard — Galerie Lumière" },
      { property: "og:description", content: "Manage bookings, walk-ins and closed entry times." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type BookingRow = {
  id: string;
  code: string;
  slot_start: string;
  visitor_name: string;
  email: string;
  phone: string | null;
  tickets: Record<string, number>;
  ticket_count: number;
  total_cents: number;
  status: string;
  payment_status: string;
  source: string;
};

function AdminPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => businessDate(new Date()));

  const role = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const isAdmin = role.data === true;

  const types = useQuery({
    queryKey: ["admin-ticket-types"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("code, name, description, price_cents, sort_order")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as TicketType[];
    },
  });

  const slots = useQuery({
    queryKey: ["admin-slots", date],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("slot_availability", { p_date: date });
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });

  const bookings = useQuery({
    queryKey: ["admin-bookings", date, slots.data?.[0]?.slot_start],
    enabled: isAdmin && !!slots.data,
    queryFn: async () => {
      const list = slots.data ?? [];
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return [] as BookingRow[];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, code, slot_start, visitor_name, email, phone, tickets, ticket_count, total_cents, status, payment_status, source")
        .gte("slot_start", first.slot_start)
        .lte("slot_start", last.slot_start)
        .order("slot_start")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-slots", date] });
    qc.invalidateQueries({ queryKey: ["admin-bookings", date] });
    qc.invalidateQueries({ queryKey: ["availability", date] });
  };

  const toggleSlot = useMutation({
    mutationFn: async (s: Slot) => {
      if (s.blocked) {
        const { error } = await supabase.from("blocked_slots").delete().eq("slot_start", s.slot_start);
        if (error) throw error;
        return "reopened";
      }
      const { error } = await supabase.from("blocked_slots").insert({ slot_start: s.slot_start, reason: "Closed by staff" });
      if (error) throw error;
      return "closed";
    },
    onSuccess: (r) => {
      toast.success(r === "closed" ? "Entry time closed to new bookings" : "Entry time reopened");
      refresh();
    },
    onError: () => toast.error("Couldn't update that time. Please try again."),
  });

  const cancelBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking cancelled — places released");
      refresh();
    },
    onError: () => toast.error("Couldn't cancel this booking."),
  });

  const stats = useMemo(() => {
    const confirmed = (bookings.data ?? []).filter((b) => b.status === "confirmed");
    const visitors = confirmed.reduce((n, b) => n + b.ticket_count, 0);
    const revenue = confirmed.reduce((n, b) => n + b.total_cents, 0);
    const capacity = (slots.data ?? []).length * MUSEUM.capacityPerSlot;
    return { count: confirmed.length, visitors, revenue, capacity };
  }, [bookings.data, slots.data]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (role.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-ink">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-5xl">No staff access</h1>
          <p className="mt-4">
            You're signed in as {user.email}, but this account isn't museum staff. Ask the museum
            admin to give you access.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button onClick={signOut}>Sign out</Button>
            <Button asChild variant="outline">
              <Link to="/">Back to site</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 px-6 py-5 md:px-10">
        <Link to="/" className="font-script text-4xl leading-none">
          {MUSEUM.short}
        </Link>
        <div className="flex items-center gap-4">
          <span className="label-caps hidden opacity-60 sm:inline">{user.email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label-caps opacity-60">Bookings</p>
            <h1 className="mt-2 font-display text-5xl leading-none md:text-6xl">{formatLongDate(date)}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous day" onClick={() => setDate(addDaysToKey(date, -1))}>
              <ChevronLeft />
            </Button>
            <Input
              type="date"
              aria-label="Choose date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="w-44"
            />
            <Button variant="outline" size="icon" aria-label="Next day" onClick={() => setDate(addDaysToKey(date, 1))}>
              <ChevronRight />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDate(businessDate(new Date()))}>
              Today
            </Button>
            {types.data && slots.data && slots.data.length > 0 && (
              <WalkInDialog slots={slots.data} types={types.data} onDone={refresh} />
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Visitors booked" value={`${stats.visitors} / ${stats.capacity}`} />
          <Stat label="Bookings" value={String(stats.count)} />
          <Stat label="Ticket value" value={formatEuro(stats.revenue)} />
        </div>

        {slots.data && slots.data.length === 0 ? (
          <p className="mt-10 font-display text-3xl">Closed on Mondays — no entry times.</p>
        ) : (
          <section className="mt-10">
            <h2 className="label-caps mb-4 opacity-60">Entry times</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(slots.data ?? []).map((s) => {
                const pct = Math.min(100, (s.booked / s.capacity) * 100);
                return (
                  <div key={s.slot_start} className={cn("rounded-md border border-ink/15 bg-card p-4", s.blocked && "border-dashed opacity-70")}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-3xl">{slotTime(s.slot_start)}</span>
                      <span className="label-caps">
                        {s.booked}/{s.capacity}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full bg-background" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="label-caps text-[0.68rem] opacity-70">
                        {s.blocked ? "Closed to bookings" : s.remaining === 0 ? "Sold out" : `${s.remaining} left`}
                      </span>
                      <Button
                        size="sm"
                        variant={s.blocked ? "default" : "outline"}
                        disabled={toggleSlot.isPending}
                        onClick={() => toggleSlot.mutate(s)}
                      >
                        {s.blocked ? "Reopen" : "Close"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="label-caps mb-4 opacity-60">Visitors</h2>
          {bookings.isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (bookings.data ?? []).length === 0 ? (
            <p className="text-sm opacity-70">No bookings for this day yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-ink/15 bg-card">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="label-caps border-b border-ink/15 text-[0.7rem] opacity-70">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Visitor</th>
                    <th className="px-4 py-3 font-medium">Tickets</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(bookings.data ?? []).map((b) => (
                    <tr key={b.id} className={cn("border-b border-ink/10 last:border-0", b.status === "cancelled" && "opacity-45 line-through")}>
                      <td className="px-4 py-3 font-display text-xl">{slotTime(b.slot_start)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{b.code}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{b.visitor_name}</p>
                        <p className="text-xs opacity-70">{[b.email, b.phone].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className="px-4 py-3">
                        {(types.data ?? [])
                          .filter((t) => (b.tickets[t.code] ?? 0) > 0)
                          .map((t) => `${b.tickets[t.code]} ${t.name}`)
                          .join(", ")}
                      </td>
                      <td className="px-4 py-3">{formatEuro(b.total_cents)}</td>
                      <td className="px-4 py-3 label-caps text-[0.7rem]">
                        {b.source === "walk_in" ? "Walk-in" : "Online"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.status === "confirmed" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={cancelBooking.isPending}
                            onClick={() => {
                              if (window.confirm(`Cancel booking ${b.code} for ${b.visitor_name}?`)) cancelBooking.mutate(b.id);
                            }}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="label-caps text-[0.7rem] no-underline">Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ink p-5 text-cream">
      <p className="label-caps opacity-60">{label}</p>
      <p className="mt-2 font-display text-4xl">{value}</p>
    </div>
  );
}

function WalkInDialog({ slots, types, onDone }: { slots: Slot[]; types: TicketType[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const open_slots = slots.filter((s) => !s.blocked && s.remaining > 0 && new Date(s.slot_start).getTime() + 3600_000 > Date.now());
  const [slot, setSlot] = useState<string>("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({ adult: 1 });
  const { count, cents } = ticketTotal(types, qty);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("book_tickets", {
        p_slot: slot,
        p_name: name.trim(),
        p_email: "",
        p_phone: "",
        p_tickets: qty,
        p_source: "walk_in",
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (code) => {
      toast.success(`Walk-in added · ${code}`);
      setOpen(false);
      setName("");
      setQty({ adult: 1 });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setSlot(open_slots[0]?.slot_start ?? "");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={open_slots.length === 0}>
          <UserPlus /> Add walk-in
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-cream text-ink">
        <DialogHeader>
          <DialogTitle className="font-display text-4xl font-light">Add walk-in</DialogTitle>
          <DialogDescription>For visitors buying at the desk or by phone. Marked “pay at desk”.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="label-caps">Entry time</Label>
            <div className="flex flex-wrap gap-2">
              {open_slots.map((s) => (
                <button
                  key={s.slot_start}
                  type="button"
                  onClick={() => setSlot(s.slot_start)}
                  className={cn(
                    "rounded-md border border-ink/25 px-3 py-2 text-sm",
                    slot === s.slot_start && "border-ink bg-ink text-cream",
                  )}
                >
                  {slotTime(s.slot_start)} · {s.remaining} left
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="walkin-name" className="label-caps">Visitor name</Label>
            <Input id="walkin-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <ul className="divide-y divide-ink/15">
            {types.map((t) => (
              <li key={t.code} className="flex items-center justify-between py-2">
                <span>{t.name}</span>
                <span className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="size-8" aria-label={`Remove ${t.name}`}
                    onClick={() => setQty((q) => ({ ...q, [t.code]: Math.max(0, (q[t.code] ?? 0) - 1) }))}>
                    <Minus />
                  </Button>
                  <span className="w-5 text-center tabular-nums">{qty[t.code] ?? 0}</span>
                  <Button type="button" variant="outline" size="icon" className="size-8" aria-label={`Add ${t.name}`}
                    onClick={() => setQty((q) => ({ ...q, [t.code]: Math.min(20, (q[t.code] ?? 0) + 1) }))}>
                    <Plus />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <span className="label-caps">{count} tickets</span>
            <span className="font-display text-3xl">{formatEuro(cents)}</span>
          </div>
          <Button className="w-full" disabled={!slot || name.trim().length < 2 || count < 1 || save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="animate-spin" />} Add booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
