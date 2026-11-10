-- LAST SAVE: 이메일 없는 아이디/비밀번호 계정과 클라우드 세이브
create extension if not exists pgcrypto with schema extensions;

create table public.ls_players (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  pass_hash text not null,
  created_at timestamptz not null default now()
);
create unique index ls_players_username_key on public.ls_players (lower(username));

create table public.ls_sessions (
  token_hash text primary key,
  player_id uuid not null references public.ls_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 days'
);
create index ls_sessions_player_idx on public.ls_sessions (player_id);

create table public.ls_saves (
  player_id uuid not null references public.ls_players(id) on delete cascade,
  slot int not null default 1,
  data jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (player_id, slot)
);

-- 테이블은 직접 못 읽게 막고, 아래 함수로만 접근한다
alter table public.ls_players enable row level security;
alter table public.ls_sessions enable row level security;
alter table public.ls_saves enable row level security;
revoke all on public.ls_players, public.ls_sessions, public.ls_saves from anon, authenticated;

-- 내부: 토큰 → 플레이어
create or replace function public.ls_player_of(p_token text)
returns uuid language sql stable security definer set search_path = '' as $$
  select s.player_id from public.ls_sessions s
  where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and s.expires_at > now();
$$;

create or replace function public.ls_new_session(p_player uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare t text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  delete from public.ls_sessions where player_id = p_player and expires_at < now();
  insert into public.ls_sessions(token_hash, player_id) values (encode(extensions.digest(t, 'sha256'), 'hex'), p_player);
  return t;
end $$;

-- 회원가입: 바로 로그인 토큰을 돌려준다
create or replace function public.ls_signup(p_username text, p_password text)
returns json language plpgsql security definer set search_path = '' as $$
declare pid uuid; u text := btrim(p_username);
begin
  if u !~ '^[A-Za-z0-9_가-힣]{2,16}$' then return json_build_object('error', '아이디는 2~16자, 한글·영문·숫자·_만 쓸 수 있어요.'); end if;
  if length(coalesce(p_password, '')) < 4 or length(p_password) > 72 then return json_build_object('error', '비밀번호는 4자 이상이어야 해요.'); end if;
  if exists (select 1 from public.ls_players where lower(username) = lower(u)) then return json_build_object('error', '이미 있는 아이디예요.'); end if;
  insert into public.ls_players(username, pass_hash) values (u, extensions.crypt(p_password, extensions.gen_salt('bf', 10))) returning id into pid;
  return json_build_object('token', public.ls_new_session(pid), 'username', u);
end $$;

create or replace function public.ls_login(p_username text, p_password text)
returns json language plpgsql security definer set search_path = '' as $$
declare p record;
begin
  select id, username, pass_hash into p from public.ls_players where lower(username) = lower(btrim(p_username));
  if p.id is null or p.pass_hash <> extensions.crypt(p_password, p.pass_hash) then
    perform pg_sleep(0.4);
    return json_build_object('error', '아이디나 비밀번호가 맞지 않아요.');
  end if;
  return json_build_object('token', public.ls_new_session(p.id), 'username', p.username);
end $$;

create or replace function public.ls_me(p_token text)
returns json language sql stable security definer set search_path = '' as $$
  select case when pl.id is null then json_build_object('error', '다시 로그인해 주세요.')
    else json_build_object('username', pl.username, 'hasSave', exists(select 1 from public.ls_saves sv where sv.player_id = pl.id)) end
  from (select public.ls_player_of(p_token) as id) x left join public.ls_players pl on pl.id = x.id;
$$;

create or replace function public.ls_logout(p_token text)
returns void language sql security definer set search_path = '' as $$
  delete from public.ls_sessions where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.ls_save(p_token text, p_slot int, p_data jsonb)
returns json language plpgsql security definer set search_path = '' as $$
declare pid uuid := public.ls_player_of(p_token);
begin
  if pid is null then return json_build_object('error', '다시 로그인해 주세요.'); end if;
  if pg_column_size(p_data) > 1000000 then return json_build_object('error', '저장 데이터가 너무 커요.'); end if;
  insert into public.ls_saves(player_id, slot, data, saved_at) values (pid, p_slot, p_data, now())
  on conflict (player_id, slot) do update set data = excluded.data, saved_at = now();
  return json_build_object('ok', true);
end $$;

create or replace function public.ls_load(p_token text, p_slot int)
returns json language plpgsql stable security definer set search_path = '' as $$
declare pid uuid := public.ls_player_of(p_token); d jsonb;
begin
  if pid is null then return json_build_object('error', '다시 로그인해 주세요.'); end if;
  select data into d from public.ls_saves where player_id = pid and slot = p_slot;
  return json_build_object('data', d);
end $$;

create or replace function public.ls_clear(p_token text, p_slot int)
returns json language plpgsql security definer set search_path = '' as $$
declare pid uuid := public.ls_player_of(p_token);
begin
  if pid is null then return json_build_object('error', '다시 로그인해 주세요.'); end if;
  delete from public.ls_saves where player_id = pid and slot = p_slot;
  return json_build_object('ok', true);
end $$;

revoke execute on function public.ls_player_of(text), public.ls_new_session(uuid) from public, anon, authenticated;
revoke execute on function public.ls_signup(text, text), public.ls_login(text, text), public.ls_me(text), public.ls_logout(text),
  public.ls_save(text, int, jsonb), public.ls_load(text, int), public.ls_clear(text, int) from public;
grant execute on function public.ls_signup(text, text), public.ls_login(text, text), public.ls_me(text), public.ls_logout(text),
  public.ls_save(text, int, jsonb), public.ls_load(text, int), public.ls_clear(text, int) to anon, authenticated;
