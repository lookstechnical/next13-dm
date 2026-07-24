-- =====================================================================
-- Diagnostics — run these BEFORE and AFTER the index migration to
-- confirm the indexes are actually doing something. Nothing here writes.
-- =====================================================================

-- 1. Which tables are being sequentially scanned the most?
--    High seq_scan + high seq_tup_read on a big table = missing index.
select
  relname                                   as table_name,
  n_live_tup                                as est_rows,
  seq_scan,
  seq_tup_read,
  idx_scan,
  case when seq_scan + idx_scan > 0
    then round(100.0 * idx_scan / (seq_scan + idx_scan), 1)
  end                                       as pct_index_scans,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
from pg_stat_user_tables
where schemaname = 'public'
order by seq_tup_read desc
limit 25;


-- 2. Slowest statements overall.
--    Requires pg_stat_statements (enabled by default on Supabase).
--    This is the single most useful query for finding the real hotspot —
--    an index only helps if the slow query is actually a scan.
select
  round(total_exec_time)                    as total_ms,
  calls,
  round(mean_exec_time::numeric, 2)         as mean_ms,
  round((100 * total_exec_time / nullif(sum(total_exec_time) over (), 0))::numeric, 1) as pct_of_total,
  rows,
  left(query, 200)                          as query
from pg_stat_statements
where query not ilike '%pg_stat_statements%'
order by total_exec_time desc
limit 25;

-- Reset the counters so you can measure a clean window:
--   select pg_stat_statements_reset();


-- 3. Indexes that are never used — dead weight on every INSERT/UPDATE.
--    Check this a week or two after deploying. Ignore unique/PK indexes.
select
  s.relname          as table_name,
  s.indexrelname     as index_name,
  s.idx_scan         as times_used,
  pg_size_pretty(pg_relation_size(s.indexrelid)) as index_size
from pg_stat_user_indexes s
join pg_index i on i.indexrelid = s.indexrelid
where s.schemaname = 'public'
  and s.idx_scan = 0
  and not i.indisunique
  and not i.indisprimary
order by pg_relation_size(s.indexrelid) desc;


-- 4. Foreign keys with no supporting index.
--    Every one of these makes joins and cascading deletes slow.
select
  c.conrelid::regclass  as table_name,
  c.conname             as fk_name,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.contype = 'f'
  and c.connamespace = 'public'::regnamespace
  and not exists (
    select 1 from pg_index i
    where i.indrelid = c.conrelid
      and (i.indkey::smallint[])[0:array_length(c.conkey, 1) - 1] @> c.conkey
  )
order by 1;


-- 5. Confirm a specific query now uses an index.
--    Swap in a real UUID. Look for "Index Scan using idx_..." rather
--    than "Seq Scan on players".
-- explain (analyze, buffers)
-- select id, team_id, name, position, date_of_birth, club, photo_url
-- from players
-- where team_id = '00000000-0000-0000-0000-000000000000'
-- order by name;


-- 6. Table sizes — tells you which of these actually matter.
select
  relname as table_name,
  n_live_tup as est_rows,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
from pg_stat_user_tables
where schemaname = 'public'
order by pg_total_relation_size(relid) desc
limit 30;
