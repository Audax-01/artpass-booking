import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Accessibility, Baby, Camera, Clock, Coffee, MapPin, ShoppingBag, Train } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatPrice, MUSEUM, OPENING_HOURS } from "@/lib/museum";
import { ticketTypesQuery } from "@/lib/museum.queries";

export const Route = createFileRoute("/visit")({
  head: () => ({
    meta: [
      { title: "Plan your visit — Galerie Lumière" },
      {
        name: "description",
        content:
          "Opening hours, ticket prices, directions, accessibility and visitor rules for Galerie Lumière in Paris.",
      },
      { property: "og:title", content: "Plan your visit — Galerie Lumière" },
      {
        property: "og:description",
        content: "Hours, prices, directions and accessibility for Galerie Lumière, Paris.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(ticketTypesQuery()),
  component: VisitPage,
});

const FACILITIES = [
  { icon: Accessibility, title: "Step-free access", text: "Lifts to every floor and wheelchairs to borrow at the cloakroom." },
  { icon: Baby, title: "Families", text: "Pram parking, baby changing rooms and a children's drawing trail." },
  { icon: Coffee, title: "Café Lumière", text: "Coffee, pastries and lunch in the glass courtyard, 10:00 – 17:30." },
  { icon: ShoppingBag, title: "Shop", text: "Prints, books and gifts. Open to everyone, no ticket needed." },
  { icon: Camera, title: "Photography", text: "Allowed without flash or tripods, except where signs say otherwise." },
  { icon: Clock, title: "How long", text: "Most visitors stay 1.5 to 2 hours. You may stay until closing." },
];

const FAQ = [
  {
    q: "Do I need to book in advance?",
    a: "We recommend it. Each entry hour welcomes up to 40 visitors, and weekends often sell out. Any remaining places are sold at the desk.",
  },
  {
    q: "Can I arrive late for my entry time?",
    a: "Yes, you can enter any time during your booked hour. If you miss the hour, our desk will do its best to fit you into a later one.",
  },
  {
    q: "Do children need a ticket?",
    a: "Children under 12 enter free but still need a ticket so we can keep the rooms comfortable. They must come with an adult.",
  },
  {
    q: "How do I show my ticket?",
    a: "Show your booking code on your phone or a printout at the entrance. You'll find it on the confirmation page after booking.",
  },
  {
    q: "Can I change or cancel my booking?",
    a: `Email ${MUSEUM.email} with your booking code at least 24 hours before your visit and we'll help.`,
  },
  {
    q: "Are bags allowed?",
    a: "Small bags are fine. Backpacks, large bags and umbrellas go in the free cloakroom.",
  },
];

function VisitPage() {
  const { data: ticketTypes } = useSuspenseQuery(ticketTypesQuery());

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="px-6 pb-16 pt-10 md:px-10 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <p className="label-caps">Visitor information</p>
          <h1 className="mt-4 font-display text-[clamp(3.5rem,10vw,9rem)] leading-[0.9]">
            Plan your <span className="font-script text-cream">visit</span>
          </h1>
        </div>
      </section>

      <section className="border-t border-foreground/20 px-6 py-16 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-14 md:grid-cols-3">
          <div>
            <h2 className="label-caps border-b border-foreground/30 pb-3">Opening hours</h2>
            <ul className="mt-5 space-y-4">
              {OPENING_HOURS.map((h) => (
                <li key={h.days} className="flex items-baseline justify-between">
                  <span className="font-display text-3xl">{h.days}</span>
                  <span className="label-caps">{h.hours}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm opacity-80">Open on public holidays except 1 January, 1 May and 25 December.</p>
          </div>

          <div>
            <h2 className="label-caps border-b border-foreground/30 pb-3">Tickets</h2>
            <ul className="mt-5 space-y-4">
              {ticketTypes.map((t) => (
                <li key={t.code} className="flex items-baseline justify-between gap-4">
                  <span>
                    <span className="block font-display text-3xl">{t.name}</span>
                    <span className="text-sm opacity-80">{t.description}</span>
                  </span>
                  <span className="font-display text-3xl">{formatPrice(t.price_cents)}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8">
              <Link to="/tickets">Book tickets</Link>
            </Button>
          </div>

          <div>
            <h2 className="label-caps border-b border-foreground/30 pb-3">Getting here</h2>
            <div className="mt-5 space-y-5">
              <p className="flex gap-3">
                <MapPin className="mt-1 size-5 shrink-0 stroke-[1.25]" />
                <span className="font-display text-2xl leading-snug">
                  {MUSEUM.addressLines.map((l) => (
                    <span key={l} className="block">{l}</span>
                  ))}
                </span>
              </p>
              <p className="flex gap-3">
                <Train className="mt-1 size-5 shrink-0 stroke-[1.25]" />
                <span className="text-sm leading-relaxed">
                  Metro line 11, Rambuteau (4 min walk). Line 3, Arts et Métiers (6 min). Bus 29 and 75.
                </span>
              </p>
              <p className="label-caps pt-2">
                {MUSEUM.phone}
                <br />
                {MUSEUM.email}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream px-6 py-20 text-ink md:px-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-6xl md:text-7xl">
            In the <span className="font-script text-background">house</span>
          </h2>
          <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {FACILITIES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="border-t border-ink/20 pt-5">
                <Icon className="size-7 stroke-[1.1]" />
                <h3 className="mt-4 font-display text-3xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed opacity-80">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="font-display text-6xl leading-none md:text-7xl">
            Good to <span className="font-script text-cream">know</span>
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.q} value={`q-${i}`} className="border-foreground/25">
                <AccordionTrigger className="py-6 text-left font-display text-2xl font-normal hover:no-underline md:text-3xl">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-base leading-relaxed">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
