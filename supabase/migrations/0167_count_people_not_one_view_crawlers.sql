-- People, as against browsers that loaded one page and never came back.
--
-- The tracker already turns away everything that admits to being a robot,
-- and the ones that matter do not admit to it: a crawler running
-- JavaScript fires the same beacon a phone does, with a clean browser id
-- every time. Ninety days of this shop is 6,971 visitors and 13,638 views,
-- and 6,663 of those visitors looked at exactly one page and were never
-- seen again. Three hundred and eight came back for a second.
--
-- A second page is a low bar and it is the only honest one available
-- without guessing at user agents: nothing that is reading a shop stops
-- after one page, and nothing crawling it bothers with two from the same
-- id. It is deliberately not clever, because the cost of being clever here
-- is throwing away students.
--
-- The old figure stays, under its own name, because it is still the true
-- count of what hit the server. It is just not a count of people, and a
-- conversion rate with it underneath said this shop converts nobody when
-- it converts rather well.
create or replace function public.analytics_summary(days integer)
returns json
language sql
stable
as $function$
  with v as (
    select path, visitor, coalesce(referrer, '') as referrer,
           coalesce(came_from, '') as came_from, created_at
    from page_views
    where created_at >= now() - make_interval(days => days)
  ),
  real_people as (
    select visitor from v group by visitor having count(*) >= 2
  ),
  by_path as (select path, count(*) as views from v group by 1),
  top_paths as (select path, views from by_path order by views desc limit 12)
  select json_build_object(
    'views', (select count(*) from v),
    'visitors', (select count(distinct visitor) from v),
    'people', (select count(*) from real_people),
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
$function$;
