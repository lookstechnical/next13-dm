-- Extra email addresses for a player.
--
-- A player is usually a child, and the address on file is a parent's. The
-- other parent wants the same emails, so one address per player is not enough.
--
-- players.email stays the primary: it is what the player profile shows, what
-- registration captures first, and what a single-address player has always
-- had. This column holds the rest. Everything the system sends to a player
-- goes to the primary plus these (see app/utils/player-emails.ts), and
-- registration recognises any of them as "this player".
--
-- Stored as an array rather than a child table because the addresses are only
-- ever read and written as a set alongside the player, and a dozen call sites
-- already select the player row. NOT NULL with a '{}' default so no reader has
-- to distinguish "no extra addresses" from null.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS additional_emails text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN players.additional_emails IS
  'Extra addresses emailed alongside players.email (e.g. a second parent). Primary address lives in players.email and is never repeated here.';

-- Lookups by address have to check this column as well as email (a second
-- parent registering for a programme), and `additional_emails @> '{x}'` needs
-- a GIN index to avoid a sequential scan of the squad.
CREATE INDEX IF NOT EXISTS idx_players_additional_emails
  ON players USING GIN (additional_emails);
