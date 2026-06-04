-- Programme registration allow-list
--
-- When a programme's registration deadline has passed (but can_register is still
-- true), only people whose email appears here may complete registration. This
-- lets admins control late / additional registrations and final numbers.
CREATE TABLE programme_allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, email)
);

ALTER TABLE programme_allowed_emails ENABLE ROW LEVEL SECURITY;

-- The public registration flow runs with the anon key and needs to check whether
-- the email being registered is on the list (mirrors the existing validation_codes
-- access pattern).
CREATE POLICY "Anyone can view programme allowed emails"
  ON programme_allowed_emails FOR SELECT
  USING (true);

-- Only authenticated users (admins) can manage the allow-list.
CREATE POLICY "Authenticated users can manage programme allowed emails"
  ON programme_allowed_emails FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
