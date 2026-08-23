-- Start and finish times for events.
--
-- Events only ever had a `date`, so a session showed as "23 August 2026" with
-- no indication of when to turn up. Parents were being told the time by email
-- or not at all, and the programme schedule on the public page was the same
-- date-only list.
--
-- Stored as `time` rather than folded into the existing `date` column:
--
--   * `date` is written by the calendar picker as a plain YYYY-MM-DD (see the
--     BST note in app/components/forms/date.tsx). Promoting it to a timestamp
--     would put every existing event at midnight UTC and re-open exactly the
--     off-by-one-day bug that note describes.
--   * Four indexes are keyed on `date` (20260722_performance_indexes.sql), and
--     several queries do `.gte("date", todayStart)`. Changing the column type
--     would force all of those to be revisited.
--   * A session's start time is a wall-clock time — "training is at 6pm" holds
--     whether or not the clocks have changed. `time` says that; `timestamptz`
--     would silently shift it across a DST boundary.
--
-- Both nullable: every existing event has no time, and events like a multi-day
-- camp legitimately have none. The UI treats null as "time not set" and falls
-- back to showing the date alone.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time;

COMMENT ON COLUMN events.start_time IS 'Wall-clock start time on `date`. Null = not set.';
COMMENT ON COLUMN events.end_time IS 'Wall-clock finish time. Null = not set / open-ended.';
