-- XinXon: estrutura do banco no Supabase.
-- Como usar: no painel do Supabase, abra "SQL Editor", cole este arquivo inteiro e clique em "Run".

-- Perfis (um por conta). O código de convite serve para ligar o casal.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Estudante',
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  partner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Progresso de estudo (guardado inteiro em JSON).
create table if not exists public.progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Presentes, bilhetes e cutucadas entre o casal.
create table if not exists public.gifts (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('flor', 'cha', 'lanterna', 'congelar', 'bilhete', 'cutucada')),
  message text check (char_length(message) <= 140),
  created_at timestamptz not null default now(),
  opened_at timestamptz
);
create index if not exists gifts_to_idx on public.gifts (to_id, opened_at);

-- Quem é o meu par (usado nas regras de acesso).
create or replace function public.my_partner() returns uuid
language sql stable security definer set search_path = public as $$
  select partner_id from public.profiles where id = auth.uid()
$$;

-- Cria o perfil automaticamente quando alguém se cadastra.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), 'Estudante'))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Liga duas contas como casal usando o código de convite.
create or replace function public.link_partner(code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  other public.profiles;
begin
  select * into other from public.profiles where invite_code = upper(code);
  if other.id is null then raise exception 'Código não encontrado'; end if;
  if other.id = auth.uid() then raise exception 'Esse é o seu próprio código'; end if;
  update public.profiles set partner_id = other.id where id = auth.uid();
  update public.profiles set partner_id = auth.uid() where id = other.id;
  return other.name;
end;
$$;
grant execute on function public.link_partner(text) to authenticated;

-- Regras de acesso: cada um vê o seu e o do seu par; só altera o seu.
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.gifts enable row level security;

drop policy if exists "ver perfis" on public.profiles;
create policy "ver perfis" on public.profiles for select to authenticated
  using (id = auth.uid() or id = public.my_partner());
drop policy if exists "editar meu nome" on public.profiles;
create policy "editar meu nome" on public.profiles for update to authenticated
  using (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

drop policy if exists "ver progresso" on public.progress;
create policy "ver progresso" on public.progress for select to authenticated
  using (user_id = auth.uid() or user_id = public.my_partner());
drop policy if exists "salvar meu progresso" on public.progress;
create policy "salvar meu progresso" on public.progress for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "atualizar meu progresso" on public.progress;
create policy "atualizar meu progresso" on public.progress for update to authenticated
  using (user_id = auth.uid());

drop policy if exists "ver presentes" on public.gifts;
create policy "ver presentes" on public.gifts for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
drop policy if exists "mandar presente" on public.gifts;
create policy "mandar presente" on public.gifts for insert to authenticated
  with check (from_id = auth.uid() and to_id = public.my_partner());
drop policy if exists "abrir presente" on public.gifts;
create policy "abrir presente" on public.gifts for update to authenticated
  using (to_id = auth.uid());
revoke update on public.gifts from authenticated;
grant update (opened_at) on public.gifts to authenticated;
