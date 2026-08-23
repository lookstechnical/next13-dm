-- A cap on how many players can register for a programme.
--
-- Places on a camp or a development squad are finite — a coach needs the form
-- to stop taking registrations at the number they can actually staff, rather
-- than turning people away by email afterwards.
--
-- Null means unlimited, which is what every existing programme gets. A cap of
-- zero is rejected: "nobody may register" is what can_register = false already
-- says, and having two ways to express it invites them to disagree.
ALTER TABLE programmes
  ADD COLUMN IF NOT EXISTS max_registrations integer;

ALTER TABLE programmes
  DROP CONSTRAINT IF EXISTS programmes_max_registrations_positive;

ALTER TABLE programmes
  ADD CONSTRAINT programmes_max_registrations_positive
    CHECK (max_registrations IS NULL OR max_registrations > 0);

COMMENT ON COLUMN programmes.max_registrations IS
  'Maximum registrations allowed. Null = unlimited. Enforced by the trigger below as well as in the app.';

-- Enforced in the database, not only in the route.
--
-- The app checks the count before inserting, but that check and the insert are
-- two separate round trips: two parents submitting the last place at the same
-- moment can both read "one left" and both take it. On a programme whose whole
-- point is a fixed number of places, that is the one failure that matters.
--
-- The advisory lock serialises registrations per programme for the length of
-- the transaction, so the count is read and acted on atomically. It's keyed on
-- the programme id, so unrelated programmes never block each other.
CREATE OR REPLACE FUNCTION enforce_programme_registration_limit()
RETURNS trigger AS $$
DECLARE
  cap integer;
  taken integer;
BEGIN
  SELECT max_registrations INTO cap
    FROM programmes
   WHERE id = NEW.programme_id;

  IF cap IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW.programme_id::text));

  SELECT count(*) INTO taken
    FROM programme_registrations
   WHERE programme_id = NEW.programme_id;

  IF taken >= cap THEN
    -- The app matches on this message to show "programme full" rather than an
    -- error page; see registerForProgramme in app/services/programmeService.ts.
    RAISE EXCEPTION 'PROGRAMME_FULL'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- BEFORE INSERT only. An UPDATE to an existing registration doesn't consume a
-- new place, and firing on it would make a full programme unable to change a
-- registration's status.
DROP TRIGGER IF EXISTS programme_registration_limit ON programme_registrations;

CREATE TRIGGER programme_registration_limit
  BEFORE INSERT ON programme_registrations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_programme_registration_limit();
