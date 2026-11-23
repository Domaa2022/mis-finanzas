-- Fase 2: perfiles, cuentas, categorías, movimientos y saldos.
-- Todos los montos son enteros en centavos (bigint).

-- ─── Tipos ────────────────────────────────────────────────────────────────────
create type public.account_type as enum ('savings', 'checking', 'credit_card', 'cash');
create type public.currency_code as enum ('HNL', 'USD');
create type public.category_kind as enum ('expense', 'income');
create type public.transaction_kind as enum ('expense', 'income', 'transfer_out', 'transfer_in', 'goal_contribution');

-- ─── Perfiles ────────────────────────────────────────────────────────────────
-- Guarda el nombre a mostrar y la zona horaria, que define "hoy" y el fin de mes.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  timezone text not null default 'America/Tegucigalpa',
  created_at timestamptz not null default now()
);

-- ─── Cuentas ─────────────────────────────────────────────────────────────────
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  type public.account_type not null,
  bank_name text check (char_length(bank_name) <= 60),
  currency public.currency_code not null default 'HNL',
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  include_in_total boolean not null default true,
  -- En tarjetas de crédito es negativo: lo que se debe.
  initial_balance_cents bigint not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  -- Permite que otras tablas exijan que la cuenta sea del mismo usuario.
  unique (id, user_id)
);
create index accounts_user_idx on public.accounts (user_id) where archived_at is null;

-- ─── Categorías ──────────────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  icon text not null default 'circle',
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  kind public.category_kind not null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, kind, name)
);

-- ─── Movimientos ─────────────────────────────────────────────────────────────
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  account_id uuid not null,
  category_id uuid,
  kind public.transaction_kind not null,
  amount_cents bigint not null check (amount_cents > 0),
  occurred_on date not null,
  note text check (char_length(note) <= 200),
  transfer_id uuid,
  recurring_id uuid,
  goal_id uuid,
  created_at timestamptz not null default now(),
  -- La cuenta y la categoría deben ser del mismo usuario que el movimiento.
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  -- Solo gastos e ingresos llevan categoría.
  check (category_id is null or kind in ('expense', 'income')),
  -- Las transferencias siempre vienen de create_transfer() (Fase 3).
  check ((kind in ('transfer_out', 'transfer_in')) = (transfer_id is not null)),
  -- Los aportes a metas siempre indican la meta (Fase 4).
  check ((kind = 'goal_contribution') = (goal_id is not null))
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc, created_at desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_category_idx on public.transactions (category_id);

-- ─── Saldos ──────────────────────────────────────────────────────────────────
-- Saldo = inicial + ingresos + transferencias recibidas − gastos − transferencias enviadas − aportes a metas.
-- security_invoker: la vista respeta el RLS de quien consulta.
create view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.currency,
  a.initial_balance_cents
    + coalesce(sum(
        case
          when t.kind in ('income', 'transfer_in') then t.amount_cents
          else -t.amount_cents
        end
      ), 0)::bigint as balance_cents
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

-- ─── Fecha de hoy según la zona horaria del usuario ──────────────────────────
create function public.user_today(p_user uuid default auth.uid())
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select p.timezone from public.profiles p where p.id = p_user),
    'America/Tegucigalpa'
  ))::date;
$$;

alter table public.transactions alter column occurred_on set default public.user_today();

-- ─── RLS: solo el dueño ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "solo el dueño" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "solo el dueño" on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "solo el dueño" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "solo el dueño" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─── Al registrarse: perfil y categorías por defecto ─────────────────────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '')
  )
  on conflict (id) do nothing;

  perform public.create_default_categories(new.id);
  return new;
end;
$$;

create function public.create_default_categories(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (user_id, name, icon, color, kind)
  values
    (p_user, 'Comida',          'utensils',        '#0F766E', 'expense'),
    (p_user, 'Transporte',      'car',             '#1D4ED8', 'expense'),
    (p_user, 'Entretenimiento', 'clapperboard',    '#6D28D9', 'expense'),
    (p_user, 'Compras',         'shopping-bag',    '#BE185D', 'expense'),
    (p_user, 'Salud',           'heart-pulse',     '#334155', 'expense'),
    (p_user, 'Hogar',           'house',           '#A16207', 'expense'),
    (p_user, 'Servicios',       'zap',             '#1D4ED8', 'expense'),
    (p_user, 'Educación',       'graduation-cap',  '#6D28D9', 'expense'),
    (p_user, 'Otros gastos',    'circle-ellipsis', '#334155', 'expense'),
    (p_user, 'Salario',         'briefcase',       '#0F766E', 'income'),
    (p_user, 'Negocio',         'store',           '#1D4ED8', 'income'),
    (p_user, 'Otros ingresos',  'circle-plus',     '#A16207', 'income')
  on conflict (user_id, kind, name) do nothing;
$$;

revoke execute on function public.create_default_categories(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuarios que ya existían antes de esta migración.
insert into public.profiles (id, display_name)
select u.id, nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
from auth.users u
on conflict (id) do nothing;

select public.create_default_categories(u.id) from auth.users u;
