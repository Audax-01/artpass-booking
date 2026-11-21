import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatEuro, formatLongDate, MUSEUM, slotDateKey, slotTime } from "@/lib/museum";
import { bookingQuery, ticketTypesQuery } from "@/lib/museum.queries";

export const Route = createFileRoute("/booking/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Your tickets ${params.code} — Galerie Lumière` },
      { name: "description", content: "Your Galerie Lumière booking confirmation and entry ticket." },
      { property: "og:title", content: "Your tickets — Galerie Lumière" },
      { property: "og:description", content: "Booking confirmation for Galerie Lumière." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context, params }) => {
    const [booking] = await Promise.all([
      context.queryClient.ensureQueryData(bookingQuery(params.code)),
      context.queryClient.ensureQueryData(ticketTypesQuery()),
    ]);
    if (!booking) throw notFound();
  },
  notFoundComponent: BookingNotFound,
  component: BookingPage,
});

function BookingPage() {
  const { code } = Route.useParams();
  const { data: booking } = useSuspenseQuery(bookingQuery(code));
  const { data: types } = useSuspenseQuery(ticketTypesQuery());
  if (!booking) return <BookingNotFound />;

  const cancelled = booking.status === "cancelled";
  const lines = types.filter((t) => (booking.tickets[t.code] ?? 0) > 0);

  return (
    <div className="min-h-screen">
      <div className="no-print">
        <SiteHeader />
      </div>

      <section className="px-6 pb-24 pt-6 md:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="label-caps no-print">{cancelled ? "Booking cancelled" : "Booking confirmed"}</p>
          <h1 className="no-print mt-3 font-display text-[clamp(3rem,8vw,6.5rem)] leading-[0.9]">
            {cancelled ? (
              "This booking was cancelled"
            ) : (
              <>
                See you <span className="font-script text-cream">soon</span>, {booking.visitor_name.split(" ")[0]}
              </>
            )}
          </h1>

          {/* Ticket */}
          <article className="mt-12 grid overflow-hidden bg-cream text-ink shadow-paper md:grid-cols-[1fr_auto]">
            <div className="p-8 md:p-10">
              <div className="flex items-start justify-between gap-4">
                <p className="font-script text-5xl leading-none">{MUSEUM.short}</p>
                <span className="label-caps rounded-full border border-ink/40 px-3 py-1">
                  {cancelled ? "Cancelled" : "Entry ticket"}
                </span>
              </div>

              <div className="mt-10 grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="label-caps opacity-60">Date</p>
                  <p className="mt-1 font-display text-3xl leading-tight">
                    {formatLongDate(slotDateKey(booking.slot_start))}
                  </p>
                </div>
                <div>
                  <p className="label-caps opacity-60">Entry time</p>
                  <p className="mt-1 font-display text-5xl leading-none">{slotTime(booking.slot_start)}</p>
                  <p className="text-sm opacity-70">Enter any time within the hour</p>
                </div>
                <div>
                  <p className="label-caps opacity-60">Name</p>
                  <p className="mt-1 font-display text-3xl">{booking.visitor_name}</p>
                </div>
                <div>
                  <p className="label-caps opacity-60">Tickets</p>
                  <ul className="mt-1 space-y-0.5">
                    {lines.map((t) => (
                      <li key={t.code} className="font-display text-2xl">
                        {booking.tickets[t.code]} × {t.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-baseline justify-between gap-4 border-t border-ink/20 pt-6">
                <div>
                  <p className="label-caps opacity-60">Total</p>
                  <p className="font-display text-4xl">{formatEuro(booking.total_cents)}</p>
                </div>
                <p className="label-caps max-w-xs text-right opacity-70">
                  {booking.payment_status === "practice"
                    ? "Practice payment — no money was taken"
                    : booking.payment_status === "pay_at_desk"
                      ? "Pay at the desk"
                      : "Paid"}
                </p>
              </div>
            </div>

            {/* Stub */}
            <div className="flex flex-col items-center justify-center gap-4 border-t-2 border-dashed border-ink/30 bg-ink p-8 text-cream md:border-l-2 md:border-t-0">
              <p className="label-caps opacity-60">Booking code</p>
              <p className="font-display text-4xl tracking-wider">{booking.code}</p>
              <Barcode value={booking.code} />
              <p className="label-caps text-center opacity-60">Show at the entrance</p>
            </div>
          </article>

          <div className="no-print mt-10 flex flex-wrap gap-4">
            <Button type="button" onClick={() => window.print()}>
              <Printer /> Print ticket
            </Button>
            <Button asChild variant="outline">
              <Link to="/visit">Plan your visit</Link>
            </Button>
            <Button asChild variant="link" size="none" className="self-center">
              <Link to="/tickets">Book another visit</Link>
            </Button>
          </div>
          <p className="no-print label-caps mt-8 max-w-xl opacity-80">
            Keep your booking code. To change or cancel, email {MUSEUM.email} at least 24 hours
            before your visit.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  const bars = Array.from(value.repeat(3)).flatMap((ch, i) => {
    const c = ch.charCodeAt(0) + i;
    return [1 + (c % 3), 1 + ((c >> 2) % 2)];
  });
  return (
    <div className="flex h-20 items-stretch gap-[2px]" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} className={i % 2 === 0 ? "bg-cream" : "bg-transparent"} style={{ width: `${w * 2}px` }} />
      ))}
    </div>
  );
}

function BookingNotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-6xl">Booking not found</h1>
        <p className="mt-4">Please check your booking code, or book a new visit.</p>
        <Button asChild className="mt-8">
          <Link to="/tickets">Book tickets</Link>
        </Button>
      </div>
    </div>
  );
}
