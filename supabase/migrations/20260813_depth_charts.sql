-- Depth charts: a team can keep several named charts (e.g. "2026/27 Senior",
-- "U18 Squad"), each one a set of ordered columns of players. Columns are
-- seeded from the standard positions but are free text, so staff can rename
-- them or add their own ("Utility Back", "Bench"). A player can sit in more
-- than one column — the whole point is to rank them where they could play,
-- not where their profile says they play.
CREATE TABLE depth_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE depth_chart_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depth_chart_id uuid NOT NULL REFERENCES depth_charts(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

-- One row per player placed in a column. sort_order is the depth ranking
-- within that column, 0 = first choice.
CREATE TABLE depth_chart_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  depth_chart_column_id uuid NOT NULL
    REFERENCES depth_chart_columns(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (depth_chart_column_id, player_id)
);

CREATE INDEX idx_depth_charts_team ON depth_charts (team_id);
CREATE INDEX idx_depth_chart_columns_chart
  ON depth_chart_columns (depth_chart_id);
CREATE INDEX idx_depth_chart_slots_column
  ON depth_chart_slots (depth_chart_column_id);
CREATE INDEX idx_depth_chart_slots_player ON depth_chart_slots (player_id);

ALTER TABLE depth_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE depth_chart_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE depth_chart_slots ENABLE ROW LEVEL SECURITY;

-- Depth charts are internal staff planning, so there is no public access.
CREATE POLICY "Authenticated users can manage depth charts"
  ON depth_charts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage depth chart columns"
  ON depth_chart_columns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage depth chart slots"
  ON depth_chart_slots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
