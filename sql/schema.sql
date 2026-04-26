create extension if not exists pgcrypto;

drop table if exists public.state_results cascade;
drop table if exists public.elections cascade;

create table public.elections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '2004 Presidential Election',
  subtitle text default 'Live Results',
  win_threshold integer not null default 270,
  total_electoral_votes integer not null default 538,
  candidates jsonb not null default
  '[
    {
      "id": "gop",
      "party": "GOP",
      "name": "James Sterling",
      "shortName": "Sterling",
      "color": "#e74c3c",
      "image": ""
    },
    {
      "id": "dem",
      "party": "DNC",
      "name": "John Edwards",
      "shortName": "Edwards",
      "color": "#3498db",
      "image": ""
    },
    {
      "id": "ind",
      "party": "IND",
      "name": "Independent",
      "shortName": "IND",
      "color": "#9b59b6",
      "image": ""
    }
  ]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.state_results (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections(id) on delete cascade,

  state_name text not null,
  abbr text not null,
  electoral_votes integer not null default 0,

  total_turnout integer not null default 0,
  turnout_pct numeric(5,2) not null default 0,

  gop_pct numeric(5,2) not null default 0,
  dem_pct numeric(5,2) not null default 0,
  ind_pct numeric(5,2) not null default 0,

  called_party text check (called_party in ('gop','dem','ind') or called_party is null),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(election_id, abbr)
);

insert into public.elections (
  slug,
  title,
  subtitle,
  win_threshold,
  total_electoral_votes
)
values (
  '2004-president',
  '2004 Presidential Election',
  'Live presidential election results',
  270,
  538
)
on conflict (slug) do nothing;

with e as (
  select id from public.elections where slug = '2004-president'
)
insert into public.state_results
(election_id, state_name, abbr, electoral_votes, total_turnout, turnout_pct, gop_pct, dem_pct, ind_pct, called_party)
select e.id, v.state_name, v.abbr, v.electoral_votes, v.total_turnout, 0, 0, 0, 0, null
from e
cross join (
  values
  ('Alabama','AL',9,1900000),
  ('Alaska','AK',3,330000),
  ('Arizona','AZ',10,2300000),
  ('Arkansas','AR',6,1100000),
  ('California','CA',55,12500000),
  ('Colorado','CO',9,2200000),
  ('Connecticut','CT',7,1600000),
  ('Delaware','DE',3,380000),
  ('District of Columbia','DC',3,280000),
  ('Florida','FL',27,7600000),
  ('Georgia','GA',15,3400000),
  ('Hawaii','HI',4,430000),
  ('Idaho','ID',4,600000),
  ('Illinois','IL',21,5300000),
  ('Indiana','IN',11,2500000),
  ('Iowa','IA',7,1500000),
  ('Kansas','KS',6,1200000),
  ('Kentucky','KY',8,1800000),
  ('Louisiana','LA',9,1900000),
  ('Maine','ME',4,740000),
  ('Maryland','MD',10,2400000),
  ('Massachusetts','MA',12,3000000),
  ('Michigan','MI',17,4800000),
  ('Minnesota','MN',10,2900000),
  ('Mississippi','MS',6,1100000),
  ('Missouri','MO',11,2800000),
  ('Montana','MT',3,470000),
  ('Nebraska','NE',5,780000),
  ('Nevada','NV',5,900000),
  ('New Hampshire','NH',4,680000),
  ('New Jersey','NJ',15,3600000),
  ('New Mexico','NM',5,770000),
  ('New York','NY',31,7600000),
  ('North Carolina','NC',15,3500000),
  ('North Dakota','ND',3,330000),
  ('Ohio','OH',20,5600000),
  ('Oklahoma','OK',7,1500000),
  ('Oregon','OR',7,1800000),
  ('Pennsylvania','PA',21,5800000),
  ('Rhode Island','RI',4,440000),
  ('South Carolina','SC',8,1700000),
  ('South Dakota','SD',3,390000),
  ('Tennessee','TN',11,2500000),
  ('Texas','TX',34,7600000),
  ('Utah','UT',5,950000),
  ('Vermont','VT',3,310000),
  ('Virginia','VA',13,3200000),
  ('Washington','WA',11,3100000),
  ('West Virginia','WV',5,760000),
  ('Wisconsin','WI',10,3000000),
  ('Wyoming','WY',3,250000)
) as v(state_name, abbr, electoral_votes, total_turnout)
on conflict (election_id, abbr) do nothing;

alter table public.elections enable row level security;
alter table public.state_results enable row level security;

drop policy if exists "Public read elections" on public.elections;
drop policy if exists "Public read state results" on public.state_results;
drop policy if exists "Public update elections" on public.elections;
drop policy if exists "Public update state results" on public.state_results;

create policy "Public read elections"
on public.elections
for select
using (true);

create policy "Public read state results"
on public.state_results
for select
using (true);

create policy "Public update elections"
on public.elections
for update
using (true)
with check (true);

create policy "Public update state results"
on public.state_results
for update
using (true)
with check (true);
