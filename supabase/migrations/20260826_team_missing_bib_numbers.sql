-- Bib numbers a club no longer has.
--
-- The programme register splits each group into two teams and hands out
-- numbered bibs, numbering each colour from 1 upwards. Sets don't stay whole:
-- bibs get lost, torn or taken home, so a red set sold as 1-15 might be missing
-- 3 and 7. Numbering straight through means the sheet keeps sending a coach to
-- the bag for a bib that isn't in it, every session, for every group.
--
-- Stored on the team rather than on the programme or the register URL because
-- it describes the kit in the cupboard, not any one session: the same gaps
-- apply to every register every coach prints, and nobody should have to key
-- them in again.
--
-- jsonb keyed by the colour ids the register uses (see BIB_COLORS in
-- app/routes/dashboard.programmes_.$id_.register.tsx):
--
--   {"red": [3, 7], "blue": [11]}
--
-- A colour with a complete set is simply absent. Not null with a `{}` default
-- so reading code never has to distinguish "no gaps" from "never set".

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS missing_bib_numbers jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN teams.missing_bib_numbers IS
  'Bib numbers the club no longer holds, keyed by bib colour id: {"red":[3,7]}. Empty object = every set complete.';
