-- The last number in each bib set.
--
-- Companion to 20260826_team_missing_bib_numbers.sql, which records the numbers
-- a set has lost. That alone doesn't tell the register when to stop: numbering
-- ran from 1 upwards forever, so a group of 18 in red was handed red 1-18 even
-- though the red set only goes to 12. The sheet has to know where each set ends
-- before it can tell a coach the bibs won't cover a group.
--
-- Kept as a second column rather than folded in with the missing numbers so
-- the earlier migration stays applied as-is wherever it has already run. The
-- register composes the two into one per-colour view.
--
-- jsonb keyed by the same colour ids as missing_bib_numbers:
--
--   {"red": 15, "blue": 12}
--
-- A colour with no entry is uncapped — numbering carries on past the end of the
-- set, which is the behaviour every club has until someone counts the bag.

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS highest_bib_numbers jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN teams.highest_bib_numbers IS
  'Last number in each bib set, keyed by bib colour id: {"red":15}. A colour with no entry is uncapped.';
