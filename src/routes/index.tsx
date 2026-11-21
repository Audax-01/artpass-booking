import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight, Crown, Feather } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatPrice, MUSEUM, OPENING_HOURS } from "@/lib/museum";
import { ticketTypesQuery } from "@/lib/museum.queries";
import heroPortrait from "@/assets/hero-portrait.jpg";
import artGold from "@/assets/art-gold.jpg";
import artLetter from "@/assets/art-letter.jpg";
import artLilies from "@/assets/art-waterlilies.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Galerie Lumière — Masters of light, Paris" },
      {
        name: "description",
        content:
          "Van Gogh, Klimt, Degas, Vermeer and Monet under one roof. Book timed tickets to Galerie Lumière in Paris.",
      },
      { property: "og:title", content: "Galerie Lumière — Masters of light, Paris" },
      {
        property: "og:description",
        content: "Van Gogh, Klimt, Degas, Vermeer and Monet under one roof. Book your timed entry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(ticketTypesQuery()),
  component: Home,
});

type Artist = { name: ReactNode; works: number; highlight?: boolean };

const ARTISTS: Artist[][] = [
  [
    { name: "Van Gogh", works: 5 },
    { name: "Gustav Klimt", works: 12 },
    {
      name: (
        <>
          Joan <span className="font-script text-[1.15em]">Miró</span>
        </>
      ),
      works: 9,
    },
  ],
  [
    { name: "Salvador Dalí", works: 8 },
    { name: "Edgar Degas", works: 11, highlight: true },
    { name: "Jan Vermeer", works: 10 },
  ],
  [
    { name: "Claude Monet", works: 13 },
    {
      name: (
        <>
          Rembrandt <em className="italic">van</em> Rijn
        </>
      ),
      works: 4,
    },
  ],
];

const EXHIBITIONS = [
  {
    title: "The Golden Embrace",
    artist: "Vienna Secession",
    dates: "Until 15 March",
    room: "East Wing · Room 4",
    image: artGold,
    alt: "Painting of an embracing couple wrapped in an ornate golden robe",
  },
  {
    title: "Letters by the Window",
    artist: "Dutch Golden Age",
    dates: "Until 28 February",
    room: "North Gallery · Room 2",
    image: artLetter,
    alt: "Painting of a young woman in a blue and yellow headscarf reading a letter",
  },
  {
    title: "Water & Light",
    artist: "Impressionism",
    dates: "Permanent collection",
    room: "Garden Hall",
    image: artLilies,
    alt: "Impressionist painting of water lilies on a pond at dusk",
  },
];

function Home() {
  const { data: ticketTypes } = useSuspenseQuery(ticketTypesQuery());

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <SiteHeader />

        <h1 className="relative z-20 mx-auto mt-4 max-w-7xl px-4 text-center font-display text-[clamp(2rem,5.6vw,5.6rem)] leading-[1.04] md:mt-6">
          <span className="sr-only">Galerie Lumière — </span>
          {ARTISTS.map((row, i) => (
            <span key={i} className="block animate-rise lg:whitespace-nowrap" style={{ animationDelay: `${i * 120}ms` }}>
              {row.map((a, j) => (
                <span key={j} className={a.highlight ? "text-cream" : undefined}>
                  {j > 0 && <span className="mx-[0.12em] font-light">/</span>}
                  {a.name}
                  <span className="count-sup" aria-label={`${a.works} works`}>
                    ({a.works})
                  </span>
                </span>
              ))}
            </span>
          ))}
        </h1>

        {/* Ghost script */}
        <div
          aria-hidden
          className="ghost-script absolute inset-x-0 bottom-[4%] z-0 whitespace-nowrap text-center text-[30vw] animate-fade md:text-[22vw]"
        >
          Edgar Degas
        </div>

        {/* Portrait */}
        <div className="relative z-10 mx-auto -mt-10 w-[78vw] max-w-[34rem] flex-1 md:-mt-16 lg:-mt-24">
          <img
            src={heroPortrait}
            alt="Oil portrait of a bearded gentleman in a black frock coat holding pale gloves"
            className="block h-full w-full animate-fade object-cover object-top [mask-image:linear-gradient(to_bottom,black_92%,transparent)]"
            width={1024}
            height={1536}
          />
        </div>

        {/* Side notes */}
        <div className="pointer-events-none absolute inset-x-0 top-[58%] z-20 hidden px-10 lg:flex lg:justify-between">
          <SideNote icon={<Feather className="size-10 stroke-[1]" />}>
            This collection gathers artists who defined the visual language of their time through
            emotion, light, and everyday scenes.
          </SideNote>
          <SideNote icon={<Crown className="size-10 stroke-[1]" />}>
            Across centuries, these masters redefined how the world is seen, influencing art and
            visual culture to this day.
          </SideNote>
        </div>

        <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2">
          <Button asChild variant="default" size="lg" className="shadow-paper">
            <Link to="/tickets">Book your visit</Link>
          </Button>
        </div>
      </section>

      {/* Intro (mobile side notes) */}
      <section className="border-t border-foreground/20 px-6 py-14 lg:hidden">
        <div className="label-caps mx-auto max-w-md space-y-6">
          <p>
            This collection gathers artists who defined the visual language of their time through
            emotion, light, and everyday scenes.
          </p>
          <p>
            Across centuries, these masters redefined how the world is seen, influencing art and
            visual culture to this day.
          </p>
        </div>
      </section>

      {/* Exhibitions */}
      <section className="border-t border-foreground/20 px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-display text-6xl leading-none md:text-8xl">
              Now <span className="font-script text-[1.1em]">showing</span>
            </h2>
            <p className="label-caps max-w-xs">
              Three rooms, three centuries. Every ticket includes all current exhibitions.
            </p>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {EXHIBITIONS.map((ex, i) => (
              <article key={ex.title} className="group">
                <div className="overflow-hidden bg-ink p-3 shadow-paper">
                  <img
                    src={ex.image}
                    alt={ex.alt}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-4">
                  <span className="font-display text-sm italic">({String(i + 1).padStart(2, "0")})</span>
                  <span className="label-caps">{ex.dates}</span>
                </div>
                <h3 className="mt-2 font-display text-4xl leading-tight">{ex.title}</h3>
                <p className="label-caps mt-2 opacity-80">
                  {ex.artist} · {ex.room}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Plan your visit */}
      <section className="bg-cream px-6 py-20 text-ink md:px-10 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="label-caps">Plan your visit</p>
            <h2 className="mt-4 font-display text-6xl leading-[0.95] md:text-8xl">
              Timed entry,
              <br />
              <span className="font-script text-[1.05em] text-background">unhurried</span> looking.
            </h2>
            <p className="mt-8 max-w-md text-lg leading-relaxed">
              Choose a day and an entry time, then stay as long as you like. Each hour welcomes at
              most {MUSEUM.capacityPerSlot} visitors, so the rooms stay quiet.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link to="/tickets">Book tickets</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/visit">
                  Visitor information <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p className="label-caps border-b border-ink/25 pb-3">Tickets</p>
              <ul className="mt-4 space-y-4">
                {ticketTypes.map((t) => (
                  <li key={t.code} className="flex items-baseline justify-between gap-3">
                    <div>
                      <p className="font-display text-2xl">{t.name}</p>
                      <p className="text-sm opacity-70">{t.description}</p>
                    </div>
                    <p className="font-display text-3xl">{formatPrice(t.price_cents)}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label-caps border-b border-ink/25 pb-3">Hours</p>
              <ul className="mt-4 space-y-4">
                {OPENING_HOURS.map((h) => (
                  <li key={h.days} className="flex items-baseline justify-between gap-3">
                    <p className="font-display text-2xl">{h.days}</p>
                    <p className="label-caps">{h.hours}</p>
                  </li>
                ))}
              </ul>
              <p className="label-caps mt-10 border-b border-ink/25 pb-3">Find us</p>
              <div className="mt-4 font-display text-2xl leading-snug">
                {MUSEUM.addressLines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SideNote({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="label-caps max-w-[19rem] animate-rise [animation-delay:500ms]">
      <span className="float-left mr-3 mt-[-0.6rem]">{icon}</span>
      {children}
    </div>
  );
}
