import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Loader2, Lock, Minus, Plus } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { cn } from "@/lib/utils";
import {
  addDaysToKey,
  businessDate,
  dateKeyFromLocal,
  formatEuro,
  formatLongDate,
  formatPrice,
  isBookableDate,
  localDateFromKey,
  MUSEUM,
  slotTime,
  ticketTotal,
  type Slot,
} from "@/lib/museum";
import { createBooking } from "@/lib/museum.functions";
import { availabilityQuery, ticketTypesQuery } from "@/lib/museum.queries";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "Book tickets — Galerie Lumière" },
      {
        name: "description",
        content:
          "Choose your day and entry time, pick your tickets and check out in a few steps. Galerie Lumière, Paris.",
      },
      { property: "og:title", content: "Book tickets — Galerie Lumière" },
      {
        property: "og:description",
        content: "Timed entry tickets for Galerie Lumière. Adults €18, students €10, children free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(ticketTypesQuery()),
  component: TicketsPage,
});

function firstBookableDate(today: string) {
  let key = today;
  for (let i = 0; i < 7; i++) {
    if (isBookableDate(key, today)) return key;
    key = addDaysToKey(key, 1);
  }
  return today;
}

const digits = (v: string) => v.replace(/\D/g, "");

function TicketsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const book = useServerFn(createBooking);
  const { data: ticketTypes } = useSuspenseQuery(ticketTypesQuery());

  const [today] = useState(() => businessDate(new Date()));
  const [dateKey, setDateKey] = useState(() => firstBookableDate(today));
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({ adult: 1 });
  const [details, setDetails] = useState({ name: "", email: "", phone: "" });
  const [card, setCard] = useState({ holder: "", number: "", expiry: "", cvc: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const availability = useQuery(availabilityQuery(dateKey));
  const { count, cents } = useMemo(() => ticketTotal(ticketTypes, qty), [ticketTypes, qty]);
  const selectedSlot = availability.data?.find((s) => s.slot_start === slotStart) ?? null;
  const needsPayment = cents > 0;

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof book>[0]) => book(payload),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Booking confirmed");
        navigate({ to: "/booking/$code", params: { code: res.code } });
      } else {
        setFormError(res.error);
        toast.error(res.error);
        queryClient.invalidateQueries({ queryKey: ["availability", dateKey] });
      }
    },
    onError: () => {
      const msg = "We couldn't complete your booking. Please check your details and try again.";
      setFormError(msg);
      toast.error(msg);
    },
  });

  function changeQty(code: string, delta: number) {
    setQty((q) => {
      const next = Math.max(0, Math.min(MUSEUM.maxTicketsPerBooking, (q[code] ?? 0) + delta));
      return { ...q, [code]: next };
    });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const fail = (m: string) => {
      setFormError(m);
      toast.error(m);
    };
    if (!slotStart || !selectedSlot) return fail("Please choose an entry time.");
    if (count < 1) return fail("Please choose at least one ticket.");
    if (count > MUSEUM.maxTicketsPerBooking)
      return fail(`A single booking can include up to ${MUSEUM.maxTicketsPerBooking} tickets.`);
    if ((qty["child"] ?? 0) > 0 && count === (qty["child"] ?? 0))
      return fail("Children under 12 must visit with an adult ticket holder.");
    if (count > selectedSlot.remaining)
      return fail(`Only ${selectedSlot.remaining} places left at ${slotTime(selectedSlot.slot_start)}.`);
    if (details.name.trim().length < 2) return fail("Please enter your full name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(details.email.trim()))
      return fail("Please enter a valid email address.");
    if (needsPayment) {
      if (card.holder.trim().length < 2) return fail("Please enter the name on the card.");
      const n = digits(card.number);
      if (n.length < 13 || n.length > 19) return fail("Please enter a full card number.");
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return fail("Expiry should look like MM/YY.");
      if (!/^\d{3,4}$/.test(card.cvc)) return fail("Please enter the 3 or 4 digit security code.");
    }
    const tickets: Record<string, number> = {};
    for (const t of ticketTypes) if ((qty[t.code] ?? 0) > 0) tickets[t.code] = qty[t.code] ?? 0;
    mutation.mutate({
      data: {
        slotStart,
        name: details.name.trim(),
        email: details.email.trim(),
        ...(details.phone.trim() ? { phone: details.phone.trim() } : {}),
        tickets,
      },
    });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="px-6 pb-10 pt-6 md:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="label-caps">Tickets · Timed entry</p>
          <h1 className="mt-3 font-display text-[clamp(3rem,9vw,8rem)] leading-[0.9]">
            Book your <span className="font-script text-cream">visit</span>
          </h1>
        </div>
      </section>

      <form onSubmit={onSubmit} className="px-6 pb-24 md:px-10" noValidate>
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {/* 1. Date */}
            <Step n={1} title="Choose a day">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <Calendar
                  mode="single"
                  selected={localDateFromKey(dateKey)}
                  onSelect={(d) => {
                    if (!d) return;
                    setDateKey(dateKeyFromLocal(d));
                    setSlotStart(null);
                  }}
                  disabled={(d) => !isBookableDate(dateKeyFromLocal(d), today)}
                  startMonth={localDateFromKey(today)}
                  endMonth={localDateFromKey(addDaysToKey(today, MUSEUM.maxDaysAhead))}
                  weekStartsOn={1}
                  className="rounded-md border border-ink/15 bg-transparent [--cell-size:2.6rem]"
                  classNames={{ today: "font-semibold underline underline-offset-4" }}
                />
                <div className="label-caps space-y-2 md:pt-3">
                  <p className="font-display text-3xl normal-case tracking-tight">{formatLongDate(dateKey)}</p>
                  <p className="opacity-70">Closed on Mondays</p>
                  <p className="opacity-70">Booking opens {MUSEUM.maxDaysAhead} days ahead</p>
                </div>
              </div>
            </Step>

            {/* 2. Time */}
            <Step n={2} title="Pick an entry time">
              <SlotGrid
                slots={availability.data}
                loading={availability.isLoading}
                error={availability.isError}
                selected={slotStart}
                needed={Math.max(count, 1)}
                onSelect={setSlotStart}
              />
            </Step>

            {/* 3. Tickets */}
            <Step n={3} title="Select tickets">
              <ul className="divide-y divide-ink/15">
                {ticketTypes.map((t) => {
                  const n = qty[t.code] ?? 0;
                  return (
                    <li key={t.code} className="flex items-center justify-between gap-4 py-4">
                      <div>
                        <p className="font-display text-3xl leading-none">{t.name}</p>
                        <p className="mt-1 text-sm opacity-70">{t.description}</p>
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="hidden w-14 text-right font-display text-2xl sm:block">
                          {formatPrice(t.price_cents)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9"
                            aria-label={`Remove one ${t.name} ticket`}
                            disabled={n === 0}
                            onClick={() => changeQty(t.code, -1)}
                          >
                            <Minus />
                          </Button>
                          <span className="w-6 text-center font-display text-2xl tabular-nums" aria-live="polite">
                            {n}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9"
                            aria-label={`Add one ${t.name} ticket`}
                            disabled={count >= MUSEUM.maxTicketsPerBooking}
                            onClick={() => changeQty(t.code, 1)}
                          >
                            <Plus />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Step>

            {/* 4. Details */}
            <Step n={4} title="Your details">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="name" label="Full name">
                  <Input
                    id="name"
                    autoComplete="name"
                    value={details.name}
                    onChange={(e) => setDetails({ ...details, name: e.target.value })}
                    maxLength={120}
                    required
                  />
                </Field>
                <Field id="email" label="Email">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={details.email}
                    onChange={(e) => setDetails({ ...details, email: e.target.value })}
                    maxLength={200}
                    required
                  />
                </Field>
                <Field id="phone" label="Phone (optional)">
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={details.phone}
                    onChange={(e) => setDetails({ ...details, phone: e.target.value })}
                    maxLength={40}
                  />
                </Field>
              </div>
            </Step>

            {/* 5. Payment */}
            <Step n={5} title="Payment">
              {needsPayment ? (
                <>
                  <div className="mb-6 flex gap-3 rounded-md border border-dashed border-ink/40 bg-muted px-4 py-3 text-sm">
                    <CreditCard className="mt-0.5 size-4 shrink-0" />
                    <p>
                      <strong className="font-semibold">Practice checkout — no money is taken.</strong>{" "}
                      Use any card number, for example 4242 4242 4242 4242.
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field id="holder" label="Name on card" className="sm:col-span-2">
                      <Input
                        id="holder"
                        autoComplete="cc-name"
                        value={card.holder}
                        onChange={(e) => setCard({ ...card, holder: e.target.value })}
                      />
                    </Field>
                    <Field id="number" label="Card number" className="sm:col-span-2">
                      <Input
                        id="number"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="4242 4242 4242 4242"
                        value={card.number}
                        onChange={(e) =>
                          setCard({
                            ...card,
                            number: digits(e.target.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "),
                          })
                        }
                      />
                    </Field>
                    <Field id="expiry" label="Expiry (MM/YY)">
                      <Input
                        id="expiry"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="12/28"
                        value={card.expiry}
                        onChange={(e) => {
                          const d = digits(e.target.value).slice(0, 4);
                          setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                        }}
                      />
                    </Field>
                    <Field id="cvc" label="Security code">
                      <Input
                        id="cvc"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        value={card.cvc}
                        onChange={(e) => setCard({ ...card, cvc: digits(e.target.value).slice(0, 4) })}
                      />
                    </Field>
                  </div>
                </>
              ) : (
                <p className="text-sm">Your tickets are free — no payment needed.</p>
              )}
            </Step>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="bg-ink p-7 text-cream shadow-paper">
              <p className="label-caps opacity-60">Your visit</p>
              <p className="mt-3 font-display text-3xl leading-tight">{formatLongDate(dateKey)}</p>
              <p className="mt-1 font-display text-5xl">
                {selectedSlot ? slotTime(selectedSlot.slot_start) : <span className="opacity-40">--:--</span>}
              </p>

              <ul className="mt-6 space-y-2 border-t border-cream/20 pt-5 text-sm">
                {ticketTypes
                  .filter((t) => (qty[t.code] ?? 0) > 0)
                  .map((t) => (
                    <li key={t.code} className="flex justify-between">
                      <span>
                        {qty[t.code]} × {t.name}
                      </span>
                      <span>{formatPrice((qty[t.code] ?? 0) * t.price_cents)}</span>
                    </li>
                  ))}
                {count === 0 && <li className="opacity-60">No tickets selected</li>}
              </ul>

              <div className="mt-5 flex items-baseline justify-between border-t border-cream/20 pt-5">
                <span className="label-caps">Total</span>
                <span className="font-display text-5xl">{formatEuro(cents)}</span>
              </div>

              {formError && (
                <p role="alert" className="mt-5 rounded-md bg-background px-3 py-2 text-sm text-foreground">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                variant="cream"
                size="lg"
                className="mt-6 w-full"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : needsPayment ? (
                  <Lock />
                ) : null}
                {needsPayment ? `Pay ${formatEuro(cents)}` : "Confirm booking"}
              </Button>
              <p className="label-caps mt-4 text-center opacity-50">Practice checkout · no charge</p>
            </div>
          </aside>
        </div>
      </form>

      <SiteFooter />
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="bg-card p-6 text-card-foreground shadow-paper md:p-8">
      <header className="mb-6 flex items-baseline gap-4">
        <span className="font-display text-lg italic">({String(n).padStart(2, "0")})</span>
        <h2 className="font-display text-4xl leading-none">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="label-caps">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SlotGrid({
  slots,
  loading,
  error,
  selected,
  needed,
  onSelect,
}: {
  slots: Slot[] | undefined;
  loading: boolean;
  error: boolean;
  selected: string | null;
  needed: number;
  onSelect: (s: string) => void;
}) {
  if (loading)
    return (
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> Checking available times…
      </div>
    );
  if (error) return <p className="text-sm">We couldn't load times. Please refresh the page.</p>;
  if (!slots || slots.length === 0)
    return <p className="text-sm">The museum is closed on this day. Please choose another date.</p>;

  const now = Date.now();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {slots.map((s) => {
        const past = new Date(s.slot_start).getTime() <= now;
        const full = s.remaining <= 0;
        const tooFew = !full && s.remaining < needed;
        const unavailable = past || s.blocked || full || tooFew;
        const isSelected = selected === s.slot_start;
        const note = past
          ? "Passed"
          : s.blocked
            ? "Closed"
            : full
              ? "Sold out"
              : tooFew
                ? `${s.remaining} left`
                : s.remaining <= 10
                  ? `${s.remaining} left`
                  : "Available";
        return (
          <button
            key={s.slot_start}
            type="button"
            disabled={unavailable}
            aria-pressed={isSelected}
            onClick={() => onSelect(s.slot_start)}
            className={cn(
              "flex flex-col items-start rounded-md border px-4 py-3 text-left transition-colors",
              "border-ink/25 hover:border-ink",
              isSelected && "border-ink bg-ink text-cream",
              unavailable && "cursor-not-allowed opacity-40 hover:border-ink/25",
            )}
          >
            <span className="font-display text-3xl leading-none">{slotTime(s.slot_start)}</span>
            <span className={cn("label-caps mt-1 text-[0.68rem]", !isSelected && s.remaining <= 10 && !unavailable && "text-background")}>
              {note}
            </span>
          </button>
        );
      })}
    </div>
  );
}
