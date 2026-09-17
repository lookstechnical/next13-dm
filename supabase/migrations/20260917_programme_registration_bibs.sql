-- The bib a player wears for a programme.
--
-- The register deals bibs out automatically and lets a coach change them, but
-- those changes only live in the sheet's URL — lose the link and the bibs are
-- gone. Coaches want to hand a player a bib on the programme itself and have
-- it stick, so the colour and number sit on the registration.
--
-- Both are optional and independent: a colour with no number is a player put
-- in a colour before the bag has been sorted. The colour is one of the ids the
-- register knows (red, blue, …), kept as text like teams.missing_bib_numbers.
--
-- No uniqueness constraint: two players briefly sharing a bib while a coach
-- reshuffles is normal, so the dashboard flags clashes instead of refusing.
ALTER TABLE programme_registrations
  ADD COLUMN IF NOT EXISTS bib_color text,
  ADD COLUMN IF NOT EXISTS bib_number integer;

ALTER TABLE programme_registrations
  DROP CONSTRAINT IF EXISTS programme_registrations_bib_number_positive;

ALTER TABLE programme_registrations
  ADD CONSTRAINT programme_registrations_bib_number_positive
    CHECK (bib_number IS NULL OR bib_number > 0);

COMMENT ON COLUMN programme_registrations.bib_color IS
  'Bib colour id (red, blue, …) assigned for this programme, or null.';
COMMENT ON COLUMN programme_registrations.bib_number IS
  'Bib number assigned for this programme, or null.';
