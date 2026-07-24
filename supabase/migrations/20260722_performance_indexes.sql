-- =====================================================================
-- Performance indexes
-- Derived from the query patterns in app/services/*.ts
--
-- SAFE TO RE-RUN. Every index is created via a guard that first checks
-- the table and all referenced columns actually exist, so a column that
-- was never added simply results in a NOTICE instead of an error.
--
-- HOW TO RUN
--   Supabase SQL Editor: paste and run the whole file.
--   psql:                psql "$DATABASE_URL" -f this_file.sql
--
-- NOTE ON LOCKING: these are plain (non-CONCURRENT) CREATE INDEX
-- statements, because the Supabase SQL editor wraps statements in a
-- transaction and CONCURRENTLY is not allowed there. Each one takes a
-- brief SHARE lock (blocks writes, not reads) on its table. For tables
-- of this size that is milliseconds. If any table has grown to millions
-- of rows, run that index separately via psql with CONCURRENTLY.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Guard helper
-- ---------------------------------------------------------------------
create or replace function pg_temp.mk_index(
  p_table   text,
  p_columns text[],
  p_ddl     text
) returns void
language plpgsql
as $$
declare
  c text;
begin
  if to_regclass('public.' || p_table) is null then
    raise notice 'skip: table %.% does not exist', 'public', p_table;
    return;
  end if;

  foreach c in array p_columns loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = p_table and column_name = c
    ) then
      raise notice 'skip: %.% has no column %', 'public', p_table, c;
      return;
    end if;
  end loop;

  execute p_ddl;
end;
$$;


-- =====================================================================
-- PLAYERS
-- Hottest table in the app: dashboard counts, team roster with search /
-- age-group / position filters, group roster, scout roster.
-- =====================================================================
do $$ begin
  -- getPlayersByTeam / dashboard counts: eq(team_id) + order(name).
  -- Composite serves filter AND sort, so no separate sort step.
  perform pg_temp.mk_index('players', array['team_id','name'],
    'create index if not exists idx_players_team_name
       on public.players (team_id, name)');

  -- Age-group filter: eq(team_id) + gte/lte(date_of_birth).
  -- Also serves the upcoming-birthdays dashboard widget.
  perform pg_temp.mk_index('players', array['team_id','date_of_birth'],
    'create index if not exists idx_players_team_dob
       on public.players (team_id, date_of_birth)');

  -- getPlayersByScout: eq(scout_id) + order(name).
  perform pg_temp.mk_index('players', array['scout_id','name'],
    'create index if not exists idx_players_scout_name
       on public.players (scout_id, name)
       where scout_id is not null');

  -- getPlayerByEmail: case-insensitive lookup on the auth/invite path.
  perform pg_temp.mk_index('players', array['email'],
    'create index if not exists idx_players_email_lower
       on public.players (lower(email))
       where email is not null');

  -- mentor(id,name) embed on the roster query is an FK join back to players.
  perform pg_temp.mk_index('players', array['mentor'],
    'create index if not exists idx_players_mentor
       on public.players (mentor)
       where mentor is not null');

  -- ilike('name', 'foo%') prefix search on the roster.
  -- text_pattern_ops makes the prefix match index-usable regardless of
  -- the database collation.
  perform pg_temp.mk_index('players', array['team_id','name'],
    'create index if not exists idx_players_name_prefix
       on public.players (name text_pattern_ops)');
end $$;


-- =====================================================================
-- PLAYER GROUPS
-- =====================================================================
do $$ begin
  perform pg_temp.mk_index('player_groups', array['team_id','name'],
    'create index if not exists idx_player_groups_team_name
       on public.player_groups (team_id, name)');

  perform pg_temp.mk_index('player_groups', array['created_by'],
    'create index if not exists idx_player_groups_created_by
       on public.player_groups (created_by)');

  -- Junction table. Both directions are queried:
  --   getPlayersByGroup  -> group_id
  --   moveToGroup        -> player_id + group_id in (...)
  perform pg_temp.mk_index('player_group_members', array['group_id','player_id'],
    'create unique index if not exists idx_pgm_group_player
       on public.player_group_members (group_id, player_id)');

  perform pg_temp.mk_index('player_group_members', array['player_id','group_id'],
    'create index if not exists idx_pgm_player_group
       on public.player_group_members (player_id, group_id)');
end $$;


-- =====================================================================
-- EVENTS
-- =====================================================================
do $$ begin
  -- getEventsByTeam: eq(team_id) + order(date desc)
  -- getNextEvent:    eq(team_id) + gte(date, now) + order(date) + limit 1
  perform pg_temp.mk_index('events', array['team_id','date'],
    'create index if not exists idx_events_team_date
       on public.events (team_id, date desc)');

  perform pg_temp.mk_index('events', array['scout_id','date'],
    'create index if not exists idx_events_scout_date
       on public.events (scout_id, date)
       where scout_id is not null');

  -- getRegistrableEvents: eq(can_register, true) + order(date).
  -- Partial index -> tiny, and only scans the rows that qualify.
  perform pg_temp.mk_index('events', array['can_register','date'],
    'create index if not exists idx_events_registrable_date
       on public.events (date)
       where can_register = true');

  -- getAllEvents: order(date)
  perform pg_temp.mk_index('events', array['date'],
    'create index if not exists idx_events_date
       on public.events (date)');
end $$;


-- =====================================================================
-- EVENT REGISTRATIONS
-- Heavily hit by the programme availability flows, which do
-- eq(player_id) + in(event_id, [...]) repeatedly.
-- =====================================================================
do $$ begin
  -- eq(player_id) + eq/in(event_id) -- the programme sync path.
  perform pg_temp.mk_index('event_registrations', array['player_id','event_id'],
    'create index if not exists idx_event_regs_player_event
       on public.event_registrations (player_id, event_id)');

  -- getRegistrationsByEvent: eq(event_id), ordered by joined player name.
  perform pg_temp.mk_index('event_registrations', array['event_id','registered_at'],
    'create index if not exists idx_event_regs_event_registered
       on public.event_registrations (event_id, registered_at desc)');

  -- getRegistrationsByPlayer: eq(player_id) + order(registered_at desc)
  perform pg_temp.mk_index('event_registrations', array['player_id','registered_at'],
    'create index if not exists idx_event_regs_player_registered
       on public.event_registrations (player_id, registered_at desc)');
end $$;


-- =====================================================================
-- PLAYER REPORTS  +  REPORT SCORES
-- The report list queries all end in order(created_at desc), so every
-- composite below puts created_at last in descending order -- that lets
-- one index satisfy filter + sort together.
-- =====================================================================
do $$ begin
  perform pg_temp.mk_index('player_reports', array['player_id','created_at'],
    'create index if not exists idx_reports_player_created
       on public.player_reports (player_id, created_at desc)');

  perform pg_temp.mk_index('player_reports', array['event_id','created_at'],
    'create index if not exists idx_reports_event_created
       on public.player_reports (event_id, created_at desc)
       where event_id is not null');

  perform pg_temp.mk_index('player_reports', array['match_id','created_at'],
    'create index if not exists idx_reports_match_created
       on public.player_reports (match_id, created_at desc)
       where match_id is not null');

  -- Non-head-scout filtering adds eq(scout_id) to most of the above,
  -- plus getReportsByScout uses it alone.
  perform pg_temp.mk_index('player_reports', array['scout_id','created_at'],
    'create index if not exists idx_reports_scout_created
       on public.player_reports (scout_id, created_at desc)');

  -- getNineBoxReport / getReportByTemplate: eq(player_id) + eq(template_id)
  perform pg_temp.mk_index('player_reports', array['player_id','template_id'],
    'create index if not exists idx_reports_player_template
       on public.player_reports (player_id, template_id)
       where template_id is not null');

  -- report_scores(*) is embedded in nearly every report select. Without
  -- this the join re-scans the whole scores table per report batch.
  perform pg_temp.mk_index('report_scores', array['report_id'],
    'create index if not exists idx_report_scores_report
       on public.report_scores (report_id)');

  perform pg_temp.mk_index('report_scores', array['attribute_id'],
    'create index if not exists idx_report_scores_attribute
       on public.report_scores (attribute_id)');
end $$;


-- =====================================================================
-- REPORT TEMPLATES / ATTRIBUTES
-- =====================================================================
do $$ begin
  perform pg_temp.mk_index('template_attributes', array['template_id','attribute_id'],
    'create index if not exists idx_template_attrs_template_attr
       on public.template_attributes (template_id, attribute_id)');

  perform pg_temp.mk_index('template_attributes', array['attribute_id'],
    'create index if not exists idx_template_attrs_attribute
       on public.template_attributes (attribute_id)');

  perform pg_temp.mk_index('report_templates', array['name'],
    'create index if not exists idx_report_templates_name
       on public.report_templates (name)');

  perform pg_temp.mk_index('report_attributes', array['name'],
    'create index if not exists idx_report_attributes_name
       on public.report_attributes (name)');
end $$;


-- =====================================================================
-- MATCHES
-- =====================================================================
do $$ begin
  perform pg_temp.mk_index('matches', array['team_id','date'],
    'create index if not exists idx_matches_team_date
       on public.matches (team_id, date desc)');

  -- getMatchesByScout uses or(scout_id.eq, assigned_scout_id.eq) --
  -- an OR across two columns needs one index each; Postgres will
  -- BitmapOr them.
  perform pg_temp.mk_index('matches', array['scout_id','date'],
    'create index if not exists idx_matches_scout_date
       on public.matches (scout_id, date desc)
       where scout_id is not null');

  -- getAssignedMatches: eq(assigned_scout_id) + neq(status,'completed')
  perform pg_temp.mk_index('matches', array['assigned_scout_id','date','status'],
    'create index if not exists idx_matches_assigned_scout_date
       on public.matches (assigned_scout_id, date desc)
       where assigned_scout_id is not null');
end $$;


-- =====================================================================
-- USERS / TEAMS / MEMBERSHIPS
-- team_memberships is on the critical path of every authenticated page
-- load (getTeamsForUser runs before the page data does).
-- =====================================================================
do $$ begin
  perform pg_temp.mk_index('team_memberships', array['user_id','team_id'],
    'create unique index if not exists idx_team_memberships_user_team
       on public.team_memberships (user_id, team_id)');

  perform pg_temp.mk_index('team_memberships', array['team_id','user_id'],
    'create index if not exists idx_team_memberships_team_user
       on public.team_memberships (team_id, user_id)');

  perform pg_temp.mk_index('users', array['email'],
    'create unique index if not exists idx_users_email_lower
       on public.users (lower(email))');

  perform pg_temp.mk_index('users', array['role','name'],
    'create index if not exists idx_users_role_name
       on public.users (role, name)');

  perform pg_temp.mk_index('users', array['name'],
    'create index if not exists idx_users_name
       on public.users (name)');

  perform pg_temp.mk_index('teams', array['name'],
    'create index if not exists idx_teams_name
       on public.teams (name)');
end $$;


-- =====================================================================
-- INVITATIONS
-- The token lookup is the public accept/reject landing page -- it must
-- never be a sequential scan.
-- =====================================================================
do $$ begin
  perform pg_temp.mk_index('invitations', array['token'],
    'create unique index if not exists idx_invitations_token
       on public.invitations (token)');

  perform pg_temp.mk_index('invitations', array['player_id'],
    'create index if not exists idx_invitations_player
       on public.invitations (player_id)');

  perform pg_temp.mk_index('invitations', array['invited_at'],
    'create index if not exists idx_invitations_invited_at
       on public.invitations (invited_at desc)');
end $$;


-- =====================================================================
-- SESSIONS / DRILLS
-- =====================================================================
do $$ begin
  -- getSessionItems: eq(event_id) + order("order")
  perform pg_temp.mk_index('session_items', array['event_id','order'],
    'create index if not exists idx_session_items_event_order
       on public.session_items (event_id, "order")');

  -- getReflectionsById: eq(event_id) [+ eq(coach_id) for non-admins]
  perform pg_temp.mk_index('session_reflection', array['event_id','coach_id'],
    'create index if not exists idx_session_reflection_event_coach
       on public.session_reflection (event_id, coach_id)');

  -- comments(*) is embedded in the reflection select.
  perform pg_temp.mk_index('comments', array['session_reflection_id'],
    'create index if not exists idx_comments_reflection
       on public.comments (session_reflection_id)');

  perform pg_temp.mk_index('drill_categories', array['drill_id','category_id'],
    'create unique index if not exists idx_drill_categories_drill_cat
       on public.drill_categories (drill_id, category_id)');

  perform pg_temp.mk_index('drill_categories', array['category_id'],
    'create index if not exists idx_drill_categories_category
       on public.drill_categories (category_id)');
end $$;


-- =====================================================================
-- CLUBS
-- =====================================================================
do $$ begin
  -- getActiveClubs / getClubsByType both filter status='active' + order(name)
  perform pg_temp.mk_index('clubs', array['status','name'],
    'create index if not exists idx_clubs_active_name
       on public.clubs (name)
       where status = ''active''');

  perform pg_temp.mk_index('clubs', array['type','status','name'],
    'create index if not exists idx_clubs_type_active_name
       on public.clubs (type, name)
       where status = ''active''');
end $$;


-- =====================================================================
-- PROGRAMMES
-- =====================================================================
do $$ begin
  perform pg_temp.mk_index('programmes', array['team_id','created_at'],
    'create index if not exists idx_programmes_team_created
       on public.programmes (team_id, created_at desc)');

  -- getProgrammeByUrl -- the public registration landing page.
  perform pg_temp.mk_index('programmes', array['url'],
    'create unique index if not exists idx_programmes_url
       on public.programmes (url)
       where url is not null');

  perform pg_temp.mk_index('programmes', array['can_register','created_at'],
    'create index if not exists idx_programmes_registrable_created
       on public.programmes (created_at desc)
       where can_register = true');

  perform pg_temp.mk_index('programmes', array['created_at'],
    'create index if not exists idx_programmes_created
       on public.programmes (created_at desc)');

  perform pg_temp.mk_index('programmes', array['created_by'],
    'create index if not exists idx_programmes_created_by
       on public.programmes (created_by)');

  -- programme_events already has UNIQUE(programme_id, event_id), which
  -- covers the programme_id lookups. Only the reverse direction and the
  -- sort_order ordering need help.
  perform pg_temp.mk_index('programme_events', array['programme_id','sort_order'],
    'create index if not exists idx_programme_events_prog_sort
       on public.programme_events (programme_id, sort_order)');

  perform pg_temp.mk_index('programme_events', array['event_id'],
    'create index if not exists idx_programme_events_event
       on public.programme_events (event_id)');

  -- UNIQUE(programme_id, player_id) exists; add the sort and the
  -- player-first direction.
  perform pg_temp.mk_index('programme_registrations', array['programme_id','registered_at'],
    'create index if not exists idx_programme_regs_prog_registered
       on public.programme_registrations (programme_id, registered_at desc)');

  perform pg_temp.mk_index('programme_registrations', array['player_id'],
    'create index if not exists idx_programme_regs_player
       on public.programme_registrations (player_id)');

  -- UNIQUE(programme_registration_id, event_id) covers the by-registration
  -- lookups; the FK back to events is the missing one.
  perform pg_temp.mk_index('programme_event_availability', array['event_id'],
    'create index if not exists idx_programme_avail_event
       on public.programme_event_availability (event_id)');

  perform pg_temp.mk_index('programme_allowed_emails', array['programme_id','created_at'],
    'create index if not exists idx_programme_allowed_prog_created
       on public.programme_allowed_emails (programme_id, created_at)');

  -- isEmailAllowed: eq(programme_id) + eq(lower(email)) on the public
  -- registration path.
  perform pg_temp.mk_index('programme_allowed_emails', array['programme_id','email'],
    'create index if not exists idx_programme_allowed_prog_email
       on public.programme_allowed_emails (programme_id, lower(email))');
end $$;


-- =====================================================================
-- VALIDATION CODES
-- Verified with eq(email) + eq(code) + eq(used,false) + gt(expires_at).
-- Partial index on used=false keeps it small forever, since spent codes
-- drop out of the index automatically.
-- =====================================================================
do $$ begin
  perform pg_temp.mk_index('validation_codes', array['email','code','used','expires_at'],
    'create index if not exists idx_validation_codes_lookup
       on public.validation_codes (email, code, expires_at desc)
       where used = false');

  perform pg_temp.mk_index('validation_codes', array['email','used'],
    'create index if not exists idx_validation_codes_email_unused
       on public.validation_codes (email)
       where used = false');

  perform pg_temp.mk_index('validation_codes', array['created_at'],
    'create index if not exists idx_validation_codes_created
       on public.validation_codes (created_at desc)');
end $$;


-- =====================================================================
-- Refresh planner statistics so the new indexes get picked up
-- immediately rather than after the next autovacuum cycle.
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'players','player_groups','player_group_members','events',
    'event_registrations','player_reports','report_scores',
    'report_templates','report_attributes','template_attributes',
    'matches','users','teams','team_memberships','invitations',
    'session_items','session_reflection','comments','drills',
    'drill_categories','categories','clubs','programmes',
    'programme_events','programme_registrations',
    'programme_event_availability','programme_allowed_emails',
    'validation_codes'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('analyze public.%I', t);
    end if;
  end loop;
end $$;
