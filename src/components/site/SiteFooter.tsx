import { Link } from "@tanstack/react-router";
import { MUSEUM, OPENING_HOURS } from "@/lib/museum";

export function SiteFooter() {
  return (
    <footer className="no-print bg-ink text-cream">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-4 md:px-10">
        <div className="md:col-span-2">
          <p className="font-script text-6xl leading-none">{MUSEUM.short}</p>
          <p className="label-caps mt-6 max-w-sm opacity-70">
            A house for the painters who taught the world to see light, emotion and everyday life.
          </p>
        </div>
        <div className="label-caps space-y-1">
          <p className="mb-3 opacity-60">Visit</p>
          {MUSEUM.addressLines.map((l) => (
            <p key={l}>{l}</p>
          ))}
          <p className="pt-3">{MUSEUM.phone}</p>
          <p>{MUSEUM.email}</p>
        </div>
        <div className="label-caps space-y-1">
          <p className="mb-3 opacity-60">Hours</p>
          {OPENING_HOURS.map((h) => (
            <p key={h.days}>
              {h.days} — {h.hours}
            </p>
          ))}
          <div className="flex gap-5 pt-6">
            <Link to="/tickets" className="underline underline-offset-4">
              Tickets
            </Link>
            <Link to="/visit" className="underline underline-offset-4">
              Visit
            </Link>
            <Link to="/auth" className="opacity-60 hover:opacity-100">
              Staff
            </Link>
          </div>
        </div>
      </div>
      <div className="label-caps border-t border-cream/15 px-6 py-5 text-center opacity-50 md:px-10">
        © {new Date().getFullYear()} {MUSEUM.name}
      </div>
    </footer>
  );
}
