-- Records actual attendance for a player at a programme event ("did they turn
-- up"), kept separate from programme_event_availability (what they said they'd
-- do) and from event_registrations (which only exists for available events).
-- A row with attended = true means present, false means absent; no row means
-- attendance hasn't been recorded yet.
CREATE TABLE programme_event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_registration_id uuid NOT NULL REFERENCES programme_registrations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id),
  attended boolean NOT NULL DEFAULT true,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_registration_id, event_id)
);

CREATE INDEX idx_programme_event_attendance_registration
  ON programme_event_attendance (programme_registration_id);
CREATE INDEX idx_programme_event_attendance_event
  ON programme_event_attendance (event_id);

ALTER TABLE programme_event_attendance ENABLE ROW LEVEL SECURITY;

-- Attendance is recorded by staff, so only authenticated users manage it.
CREATE POLICY "Authenticated users can view programme event attendance"
  ON programme_event_attendance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage programme event attendance"
  ON programme_event_attendance FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
