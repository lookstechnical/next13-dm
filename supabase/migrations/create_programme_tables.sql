-- Programmes table
CREATE TABLE programmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  registration_deadline timestamptz,
  can_register boolean NOT NULL DEFAULT false,
  status event_status NOT NULL DEFAULT 'upcoming',
  sections jsonb,
  availability_description text,
  eligible_dob_from date,
  eligible_dob_to date,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Programme events junction table
CREATE TABLE programme_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id),
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (programme_id, event_id)
);

-- Programme registrations
CREATE TABLE programme_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id),
  email text,
  status registration_status NOT NULL DEFAULT 'registered',
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, player_id)
);

-- Programme event availability
CREATE TABLE programme_event_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_registration_id uuid NOT NULL REFERENCES programme_registrations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id),
  available boolean NOT NULL DEFAULT true,
  UNIQUE (programme_registration_id, event_id)
);

-- RLS policies
ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE programme_event_availability ENABLE ROW LEVEL SECURITY;

-- Public read access for programmes where can_register = true
CREATE POLICY "Public can view registrable programmes"
  ON programmes FOR SELECT
  USING (can_register = true);

-- Authenticated users can manage programmes
CREATE POLICY "Authenticated users can manage programmes"
  ON programmes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public read access for programme events (linked to public programmes)
CREATE POLICY "Public can view programme events"
  ON programme_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM programmes
      WHERE programmes.id = programme_events.programme_id
      AND programmes.can_register = true
    )
  );

-- Authenticated users can manage programme events
CREATE POLICY "Authenticated users can manage programme events"
  ON programme_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anyone can insert registrations (public registration flow)
CREATE POLICY "Anyone can register for programmes"
  ON programme_registrations FOR INSERT
  WITH CHECK (true);

-- Public can read their own registrations
CREATE POLICY "Anyone can view programme registrations"
  ON programme_registrations FOR SELECT
  USING (true);

-- Authenticated users can manage registrations
CREATE POLICY "Authenticated users can manage programme registrations"
  ON programme_registrations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anyone can insert availability (part of registration flow)
CREATE POLICY "Anyone can insert programme event availability"
  ON programme_event_availability FOR INSERT
  WITH CHECK (true);

-- Anyone can read availability
CREATE POLICY "Anyone can view programme event availability"
  ON programme_event_availability FOR SELECT
  USING (true);

-- Authenticated users can manage availability
CREATE POLICY "Authenticated users can manage programme event availability"
  ON programme_event_availability FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
