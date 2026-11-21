import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MUSEUM } from "@/lib/museum";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/tickets", label: "Tickets" },
  { to: "/visit", label: "Plan your visit" },
] as const;

export function SiteHeader() {
  return (
    <header className="relative z-30 grid grid-cols-3 items-center px-5 py-5 md:px-8 md:py-7">
      <div className="justify-self-start">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu" className="rounded-full">
              <Plus className="!size-7 stroke-[1.25]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-full max-w-md flex-col border-r-0 bg-background">
            <SheetTitle className="font-script text-5xl font-normal">{MUSEUM.short}</SheetTitle>
            <nav className="mt-12 flex flex-col gap-2">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="font-display text-5xl leading-tight transition-opacity hover:opacity-60"
                  activeProps={{ className: "text-cream" }}
                  activeOptions={{ exact: true }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="label-caps mt-auto space-y-1 pt-16">
              {MUSEUM.addressLines.map((l) => (
                <p key={l}>{l}</p>
              ))}
              <p>Tue – Sun · 10:00 – 18:00</p>
              <Link to="/auth" className="mt-6 inline-block underline underline-offset-4">
                Staff sign in
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <Link to="/" className="justify-self-center font-script text-4xl leading-none md:text-5xl">
        {MUSEUM.short}
      </Link>
      <div className="justify-self-end">
        <Button asChild variant="nav" size="none">
          <Link to="/tickets">Tickets</Link>
        </Button>
      </div>
    </header>
  );
}
