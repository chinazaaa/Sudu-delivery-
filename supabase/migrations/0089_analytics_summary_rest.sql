-- The twelve busiest pages, and what is left over.
--
-- The page shows the busiest twelve, so the column never added up to the
-- total above it, which reads as a bug rather than as a top twelve. Most of
-- what is missing is one view each on one product page, and saying how many
-- pages that is turns a hole into a fact.
--
-- Replaces the function from 0088 whole: a function is not a table, so this
-- is the migration and the one before it is history.
create or replace function analytics_summary(days integer)
returns json
language sql
stable
as $$
  with v as (
    select path, visitor, coalesce(referrer, '') as referrer,
           coalesce(came_from, '') as came_from, created_at
    from page_views
    where created_at >= now() - make_interval(days => days)
  ),
  by_path as (select path, count(*) as views from v group by 1),
  top_paths as (select path, views from by_path order by views desc limit 12)
  select json_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct visitor) from v),
    'reached_cart', (
      select count(distinct visitor) from v
      where path like '/cart%' or path like '/skincare%'
    ),
    'per_day', coalesce((
      select json_agg(json_build_object('date', d.date, 'views', d.views, 'visitors', d.visitors)
                      order by d.date)
      from (
        select to_char(created_at, 'YYYY-MM-DD') as date,
               count(*) as views,
               count(distinct visitor) as visitors
        from v group by 1
      ) d
    ), '[]'::json),
    'pages', coalesce((
      select json_agg(json_build_object('path', p.path, 'views', p.views) order by p.views desc)
      from top_paths p
    ), '[]'::json),
    'rest_views', (
      select coalesce(sum(views), 0) from by_path
      where path not in (select path from top_paths)
    ),
    'rest_pages', (
      select count(*) from by_path where path not in (select path from top_paths)
    ),
    'sources', coalesce((
      select json_agg(json_build_object('source', s.referrer, 'views', s.views) order by s.views desc)
      from (
        select referrer, count(*) as views from v group by 1 order by 2 desc limit 8
      ) s
    ), '[]'::json),
    'channels', coalesce((
      select json_agg(json_build_object('channel', c.came_from, 'visitors', c.visitors))
      from (
        select came_from, count(distinct visitor) as visitors from v group by 1
      ) c
    ), '[]'::json),
    'ids', coalesce((
      select json_agg(i.path)
      from (
        select path from v
        where path like '/r/%' or path like '/p/%'
        group by 1 order by count(*) desc limit 200
      ) i
    ), '[]'::json)
  );
$$;
