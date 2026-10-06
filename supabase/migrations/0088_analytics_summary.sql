-- Counting views in the database rather than in the page.
--
-- Every number on the analytics page was worked out by reading the rows and
-- counting them in JavaScript, on the reasoning that the numbers are small
-- and one query beats six. The numbers stopped being small, and the API hands
-- back at most a thousand rows however large a limit is asked for. So views
-- read 1000, every week, for weeks: not a busy shop, a full bucket. People,
-- the funnel and every channel's visit count were cut by the same wall, and
-- all of them read low rather than wrong, which is the kind of wrong nobody
-- goes looking for.
--
-- Counting here has no such ceiling, and it is one round trip rather than six
-- thousand rows over the wire.
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
  )
  select json_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct visitor) from v),
    -- Both baskets: the skincare shelf has one of its own.
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
      from (
        select path, count(*) as views from v group by 1 order by 2 desc limit 12
      ) p
    ), '[]'::json),
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
    -- The restaurant and product paths worth naming, busiest first.
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
