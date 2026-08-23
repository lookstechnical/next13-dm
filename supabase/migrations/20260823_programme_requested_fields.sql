-- Optional extra profile details a programme can ask for at registration.
--
-- Programmes vary in what they need to know. A talent-ID camp wants parental
-- heights (used to predict adult height, which matters when the squad spans a
-- growth spurt); a residential needs medical conditions; a schools programme
-- needs the school. Asking every registrant for all of it would pad the form
-- for the programmes that don't care, so each programme opts in.
--
-- `requested_fields` holds the opted-in field keys, matching the `text[]`
-- precedent set by invitations.reject_reasons (20260820). Keys are validated in
-- app/utils/programme-fields.ts rather than by a CHECK constraint or an enum:
-- the list is UI copy as much as data, and adding an option shouldn't need a
-- migration.

ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS requested_fields text[];

COMMENT ON COLUMN programmes.requested_fields IS
  'Optional profile fields this programme asks for at registration. Keys defined in app/utils/programme-fields.ts. Null/empty = ask for nothing extra.';

-- Which of the requested fields a registrant must actually fill in.
--
-- A second array rather than a jsonb [{key, required}] structure: "asked for"
-- and "must answer" are independent questions, and keeping them as two plain
-- text[] columns means the same parse/validate helpers work on both and the
-- existing text[] precedent still holds.
--
-- required_fields is treated as a SUBSET of requested_fields. Nothing at the
-- database level enforces that (a CHECK across two arrays is awkward and would
-- fire on legitimate intermediate states), so parseRequiredFields() in
-- app/utils/programme-fields.ts intersects the two on the way out. A key left
-- behind here after its field is un-ticked is therefore inert, not a trap.
ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS required_fields text[];

COMMENT ON COLUMN programmes.required_fields IS
  'Subset of requested_fields the registrant must fill in. Intersected with requested_fields in app/utils/programme-fields.ts. Null/empty = everything optional.';

-- Parental heights are stored as total inches rather than a "5ft 11in" string
-- so they stay comparable and averageable. The form collects feet and inches
-- separately and combines them; app/utils/height.ts converts back for display.
--
-- Deliberately NOT reusing the existing players.height text column: that one is
-- the player's own height and is free text, so overloading it would conflate
-- three different measurements.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS mother_height_inches integer,
  ADD COLUMN IF NOT EXISTS father_height_inches integer,
  ADD COLUMN IF NOT EXISTS medical_conditions text;

COMMENT ON COLUMN players.mother_height_inches IS 'Total inches. Null = not provided.';
COMMENT ON COLUMN players.father_height_inches IS 'Total inches. Null = not provided.';
COMMENT ON COLUMN players.medical_conditions IS 'Free-text medical conditions / allergies declared at registration.';

-- Guard against a mistyped feet box producing an impossible height. The range
-- is wide on purpose — it exists to catch 500 inches, not to police outliers.
ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_mother_height_inches_range,
  DROP CONSTRAINT IF EXISTS players_father_height_inches_range;

ALTER TABLE players
  ADD CONSTRAINT players_mother_height_inches_range
    CHECK (mother_height_inches IS NULL OR mother_height_inches BETWEEN 36 AND 96),
  ADD CONSTRAINT players_father_height_inches_range
    CHECK (father_height_inches IS NULL OR father_height_inches BETWEEN 36 AND 96);
