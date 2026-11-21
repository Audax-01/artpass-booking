<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (Galerie Lumière)

- Booking rules (entry hours, closed days, slot capacity, booking window, price totals) are enforced in the database functions `book_tickets`, `slot_availability`, `museum_slot_is_valid` and `museum_slot_capacity`; `src/lib/museum.ts` mirrors them for display only. Why: capacity must hold under simultaneous bookings, so the server is the source of truth — change both together.
- Ticket prices live in the `ticket_types` table (cents) and are read everywhere from it. Why: one place to change prices.
- Public pages read data through server functions in `src/lib/museum.functions.ts` using a session-less publishable client; the staff dashboard (`/admin`, under `_authenticated`) uses the browser client with admin RLS. Why: visitor details are only readable by admins.
- Checkout is a practice form (no payment provider); bookings are stored with `payment_status = 'practice'`. Why: the owner chose to switch on real payments later.

## Handling owner requests about opening times

- "Close tonight / close 15:00 tomorrow": in the staff dashboard (`/admin`), go to that date and press **Close** on each entry time. This adds rows to `blocked_slots`; existing bookings stay. **Reopen** removes them.
- "We're closed every Monday" style recurring rules: there is no recurring-hours setting in the app. Change the schedule in the database functions `museum_slot_is_valid` and `slot_availability` (and the display copy in `src/lib/museum.ts`) via a migration.
