-- LAST SAVE: 엔딩 기록(계정당 엔딩 종류별 1번)과 버그 제보
create table public.ls_endings (
  player_id uuid not null references public.ls_players(id) on delete cascade,
  kind text not null check (kind in ('reset', 'normal', 'true', 'secret')),
  difficulty text not null default 'normal' check (difficulty in ('easy', 'normal')),
  hours_left real,
  reached_at timestamptz not null default now(),
  primary key (player_id, kind)
);

create table public.ls_reports (
  id bigint generated always as identity primary key,
  player_id uuid references public.ls_players(id) on delete set null,
  map text not null,
  x int, y int,
  body text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index ls_reports_player_idx on public.ls_reports (player_id, created_at);

alter table public.ls_endings enable row level security;
alter table public.ls_reports enable row level security;
revoke all on public.ls_endings, public.ls_reports from anon, authenticated;

-- 엔딩을 봤다 (같은 엔딩은 처음 한 번만 남는다)
create or replace function public.ls_end(p_token text, p_kind text, p_difficulty text, p_hours real)
returns json language plpgsql security definer set search_path = '' as $$
declare pid uuid := public.ls_player_of(p_token);
begin
  if pid is null then return json_build_object('error', '다시 로그인해 주세요.'); end if;
  if p_kind not in ('reset', 'normal', 'true', 'secret') then return json_build_object('error', 'bad kind'); end if;
  insert into public.ls_endings(player_id, kind, difficulty, hours_left)
  values (pid, p_kind, case when p_difficulty = 'easy' then 'easy' else 'normal' end, p_hours)
  on conflict (player_id, kind) do nothing;
  return json_build_object('ok', true);
end $$;

-- 공개 통계: 가입 인원과 엔딩별 달성 인원 (개인 정보 없음)
create or replace function public.ls_stats()
returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'players', (select count(*) from public.ls_players),
    'endings', (select coalesce(json_object_agg(kind, n), '{}'::json) from (select kind, count(*) n from public.ls_endings group by kind) e)
  );
$$;

-- 버그 제보: 로그인한 사람만, 하루 20건까지, 본문 500자
create or replace function public.ls_report(p_token text, p_map text, p_x int, p_y int, p_body text, p_meta jsonb)
returns json language plpgsql security definer set search_path = '' as $$
declare pid uuid := public.ls_player_of(p_token); b text := btrim(coalesce(p_body, ''));
begin
  if pid is null then return json_build_object('error', '다시 로그인해 주세요.'); end if;
  if length(b) < 2 then return json_build_object('error', '내용을 조금만 더 적어 주세요.'); end if;
  if (select count(*) from public.ls_reports where player_id = pid and created_at > now() - interval '1 day') >= 20 then
    return json_build_object('error', '오늘은 제보를 많이 보냈어요. 내일 다시 보내 주세요.');
  end if;
  insert into public.ls_reports(player_id, map, x, y, body, meta)
  values (pid, left(coalesce(p_map, '?'), 32), p_x, p_y, left(b, 500), case when pg_column_size(p_meta) < 4000 then p_meta else null end);
  return json_build_object('ok', true);
end $$;

revoke all on function public.ls_end(text, text, text, real), public.ls_stats(), public.ls_report(text, text, int, int, text, jsonb) from public;
grant execute on function public.ls_end(text, text, text, real), public.ls_stats(), public.ls_report(text, text, int, int, text, jsonb) to anon, authenticated;
