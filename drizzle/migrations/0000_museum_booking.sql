-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- First account becomes the museum admin
CREATE OR REPLACE FUNCTION public.assign_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_first_admin
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_first_admin();

-- Ticket types (prices in cents, EUR)
CREATE TABLE public.ticket_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.ticket_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_types TO authenticated;
GRANT ALL ON public.ticket_types TO service_role;
ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active ticket types" ON public.ticket_types
  FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage ticket types" ON public.ticket_types
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.ticket_types (code, name, description, price_cents, sort_order) VALUES
  ('adult', 'Adult', 'Ages 18 to 64', 1800, 1),
  ('student', 'Student', 'With a valid student card', 1000, 2),
  ('senior', 'Senior', 'Ages 65 and over', 1200, 3),
  ('child', 'Child', 'Under 12, with an adult', 0, 4);

-- Bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  slot_start timestamptz NOT NULL,
  visitor_name text NOT NULL,
  email text NOT NULL,
  phone text,
  tickets jsonb NOT NULL DEFAULT '{}'::jsonb,
  ticket_count integer NOT NULL CHECK (ticket_count > 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'practice' CHECK (payment_status IN ('practice', 'paid', 'pay_at_desk')),
  source text NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'walk_in')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_slot_idx ON public.bookings (slot_start) WHERE status = 'confirmed';
GRANT SELECT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view bookings" ON public.bookings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Closed entry times
CREATE TABLE public.blocked_slots (
  slot_start timestamptz PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.blocked_slots TO authenticated;
GRANT ALL ON public.blocked_slots TO service_role;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view closed times" ON public.blocked_slots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins close times" ON public.blocked_slots
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins reopen times" ON public.blocked_slots
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Schedule rules: Paris time, closed Monday, hourly entries 10:00 to 17:00, 40 visitors per slot
CREATE OR REPLACE FUNCTION public.museum_slot_capacity()
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 40 $$;

CREATE OR REPLACE FUNCTION public.museum_slot_is_valid(p_slot timestamptz)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXTRACT(ISODOW FROM (p_slot AT TIME ZONE 'Europe/Paris')) <> 1
     AND EXTRACT(MINUTE FROM (p_slot AT TIME ZONE 'Europe/Paris')) = 0
     AND EXTRACT(SECOND FROM (p_slot AT TIME ZONE 'Europe/Paris')) = 0
     AND EXTRACT(HOUR FROM (p_slot AT TIME ZONE 'Europe/Paris')) BETWEEN 10 AND 17
$$;

CREATE OR REPLACE FUNCTION public.slot_availability(p_date date)
RETURNS TABLE (slot_start timestamptz, capacity integer, booked integer, remaining integer, blocked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH slots AS (
    SELECT ((p_date + make_time(h, 0, 0)) AT TIME ZONE 'Europe/Paris') AS s_start
    FROM generate_series(10, 17) AS h
    WHERE EXTRACT(ISODOW FROM p_date) <> 1
  )
  SELECT s.s_start,
         public.museum_slot_capacity(),
         COALESCE(SUM(b.ticket_count), 0)::integer,
         GREATEST(public.museum_slot_capacity() - COALESCE(SUM(b.ticket_count), 0), 0)::integer,
         EXISTS (SELECT 1 FROM public.blocked_slots bs WHERE bs.slot_start = s.s_start)
  FROM slots s
  LEFT JOIN public.bookings b ON b.slot_start = s.s_start AND b.status = 'confirmed'
  GROUP BY s.s_start
  ORDER BY s.s_start
$$;
GRANT EXECUTE ON FUNCTION public.slot_availability(date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.book_tickets(
  p_slot timestamptz,
  p_name text,
  p_email text,
  p_phone text,
  p_tickets jsonb,
  p_source text DEFAULT 'online'
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer := 0;
  v_total integer := 0;
  v_booked integer;
  v_qty integer;
  v_code text;
  v_clean jsonb := '{}'::jsonb;
  r record;
BEGIN
  IF p_source NOT IN ('online', 'walk_in') THEN
    RAISE EXCEPTION 'Invalid booking source';
  END IF;
  IF p_source = 'walk_in' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only museum staff can add walk-in bookings';
  END IF;
  IF p_slot IS NULL OR NOT public.museum_slot_is_valid(p_slot) THEN
    RAISE EXCEPTION 'That is not an entry time. Please pick another time.';
  END IF;
  IF p_source = 'online' AND p_slot <= now() THEN
    RAISE EXCEPTION 'This entry time has already passed.';
  END IF;
  IF p_source = 'walk_in' AND p_slot + interval '1 hour' <= now() THEN
    RAISE EXCEPTION 'This entry time has already ended.';
  END IF;
  IF p_slot > now() + interval '60 days' THEN
    RAISE EXCEPTION 'Bookings open 60 days ahead.';
  END IF;
  IF length(trim(coalesce(p_name, ''))) < 2 OR length(p_name) > 120 THEN
    RAISE EXCEPTION 'Please enter your full name.';
  END IF;
  IF p_source = 'online' AND (p_email IS NULL OR p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_email) > 200) THEN
    RAISE EXCEPTION 'Please enter a valid email address.';
  END IF;
  IF p_phone IS NOT NULL AND length(p_phone) > 40 THEN
    RAISE EXCEPTION 'Phone number is too long.';
  END IF;

  FOR r IN SELECT code, price_cents FROM public.ticket_types WHERE active LOOP
    v_qty := COALESCE(NULLIF(p_tickets ->> r.code, '')::integer, 0);
    IF v_qty < 0 OR v_qty > 20 THEN
      RAISE EXCEPTION 'Invalid ticket quantity.';
    END IF;
    IF v_qty > 0 THEN
      v_clean := v_clean || jsonb_build_object(r.code, v_qty);
      v_count := v_count + v_qty;
      v_total := v_total + v_qty * r.price_cents;
    END IF;
  END LOOP;

  IF v_count < 1 THEN
    RAISE EXCEPTION 'Choose at least one ticket.';
  END IF;
  IF v_count > 20 THEN
    RAISE EXCEPTION 'A single booking can include up to 20 tickets.';
  END IF;

  PERFORM pg_advisory_xact_lock(EXTRACT(EPOCH FROM p_slot)::bigint);

  IF EXISTS (SELECT 1 FROM public.blocked_slots bs WHERE bs.slot_start = p_slot) THEN
    RAISE EXCEPTION 'This entry time is closed. Please pick another time.';
  END IF;

  SELECT COALESCE(SUM(b.ticket_count), 0) INTO v_booked
  FROM public.bookings b WHERE b.slot_start = p_slot AND b.status = 'confirmed';

  IF v_booked + v_count > public.museum_slot_capacity() THEN
    RAISE EXCEPTION 'Only % places left at this time.', GREATEST(public.museum_slot_capacity() - v_booked, 0);
  END IF;

  LOOP
    v_code := 'GL-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.code = v_code);
  END LOOP;

  INSERT INTO public.bookings (code, slot_start, visitor_name, email, phone, tickets, ticket_count, total_cents, payment_status, source)
  VALUES (
    v_code, p_slot, trim(p_name), lower(trim(coalesce(p_email, ''))), NULLIF(trim(coalesce(p_phone, '')), ''),
    v_clean, v_count, v_total,
    CASE WHEN p_source = 'walk_in' THEN 'pay_at_desk' ELSE 'practice' END,
    p_source
  );

  RETURN v_code;
END;
$$;
GRANT EXECUTE ON FUNCTION public.book_tickets(timestamptz, text, text, text, jsonb, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_booking(p_code text)
RETURNS TABLE (code text, slot_start timestamptz, visitor_name text, tickets jsonb, ticket_count integer, total_cents integer, status text, payment_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.code, b.slot_start, b.visitor_name, b.tickets, b.ticket_count, b.total_cents, b.status, b.payment_status
  FROM public.bookings b
  WHERE b.code = upper(trim(p_code))
$$;
GRANT EXECUTE ON FUNCTION public.get_booking(text) TO anon, authenticated;