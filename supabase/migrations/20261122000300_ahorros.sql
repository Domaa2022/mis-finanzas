-- Fase 4: metas de ahorro, aportes, ahorro programado y notificaciones.

-- ─── Metas ───────────────────────────────────────────────────────────────────
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  icon text not null default 'target',
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  target_cents bigint not null check (target_cents > 0),
  target_date date,
  currency public.currency_code not null default 'HNL',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

alter table public.transactions
  add constraint transactions_goal_id_user_id_fkey
  foreign key (goal_id, user_id) references public.savings_goals (id, user_id) on delete restrict;
create index transactions_goal_idx on public.transactions (goal_id) where goal_id is not null;

-- Ahorrado en una meta = suma de sus aportes.
create view public.goal_progress
with (security_invoker = true) as
select g.id as goal_id, g.user_id, coalesce(sum(t.amount_cents), 0)::bigint as saved_cents
from public.savings_goals g
left join public.transactions t on t.goal_id = g.id and t.kind = 'goal_contribution'
group by g.id;

-- ─── Ahorro programado ───────────────────────────────────────────────────────
create type public.schedule_mode as enum ('fixed', 'percent');
create type public.schedule_frequency as enum ('weekly', 'biweekly', 'monthly');
create type public.schedule_ends as enum ('on_goal', 'on_date', 'never');

create table public.savings_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id uuid not null,
  account_id uuid not null,
  mode public.schedule_mode not null,
  amount_cents bigint,
  percent numeric(5, 2),
  frequency public.schedule_frequency not null,
  -- Semanal: {día ISO 1–7}. Quincenal: {dos días del mes}. Mensual: {un día}. −1 = último día.
  days int[] not null,
  ends public.schedule_ends not null default 'on_goal',
  end_date date,
  active boolean not null default true,
  next_run_on date not null,
  -- Fecha del aporte anterior procesado: el porcentaje se calcula sobre los ingresos posteriores.
  last_run_on date not null,
  created_at timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.savings_goals (id, user_id) on delete cascade,
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  check (
    (mode = 'fixed' and amount_cents > 0 and percent is null)
    or (mode = 'percent' and percent > 0 and percent <= 100 and amount_cents is null)
  ),
  check (
    case frequency
      when 'weekly' then cardinality(days) = 1 and days[1] between 1 and 7
      when 'biweekly' then cardinality(days) = 2
        and (days[1] = -1 or days[1] between 1 and 31) and (days[2] = -1 or days[2] between 1 and 31)
      else cardinality(days) = 1 and (days[1] = -1 or days[1] between 1 and 31)
    end
  ),
  check ((ends = 'on_date') = (end_date is not null))
);
create index savings_schedules_due_idx on public.savings_schedules (next_run_on) where active;

-- ─── Notificaciones ──────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  href text,
  -- Evita repetir el mismo aviso (por ejemplo, el recordatorio de un aporte).
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.savings_goals enable row level security;
alter table public.savings_schedules enable row level security;
alter table public.notifications enable row level security;

create policy "solo el dueño" on public.savings_goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "solo el dueño" on public.savings_schedules
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Las notificaciones las crea el sistema; el dueño las ve, las marca leídas y las borra.
create policy "solo el dueño: ver" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "solo el dueño: marcar" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "solo el dueño: borrar" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- Los aportes también se pueden borrar (devuelve el dinero a la cuenta).
drop policy "solo el dueño: borrar gastos e ingresos" on public.transactions;
create policy "solo el dueño: borrar gastos, ingresos y aportes" on public.transactions
  for delete to authenticated
  using (user_id = (select auth.uid()) and kind in ('expense', 'income', 'goal_contribution'));

-- ─── Fechas de aporte (regla 7) ──────────────────────────────────────────────
-- Día concreto de un mes: 1–31 o −1 (último). Los días que no existen se ajustan al último.
create function public.day_of_month(p_month_start date, p_rule int)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when p_rule = -1 then (p_month_start + interval '1 month' - interval '1 day')::date
    else least(p_month_start + (p_rule - 1), (p_month_start + interval '1 month' - interval '1 day')::date)
  end;
$$;

-- Próxima fecha de aporte estrictamente posterior a p_after (igual que nextRunDate en TS).
create function public.next_schedule_date(p_frequency public.schedule_frequency, p_days int[], p_after date)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_diff int;
  v_month date;
  v_best date;
  v_candidate date;
  v_rule int;
begin
  if p_frequency = 'weekly' then
    v_diff := (p_days[1] - extract(isodow from p_after)::int + 7) % 7;
    return p_after + case when v_diff = 0 then 7 else v_diff end;
  end if;

  for i in 0..2 loop
    v_month := (date_trunc('month', p_after) + make_interval(months => i))::date;
    v_best := null;
    foreach v_rule in array p_days loop
      v_candidate := public.day_of_month(v_month, v_rule);
      if v_candidate > p_after and (v_best is null or v_candidate < v_best) then
        v_best := v_candidate;
      end if;
    end loop;
    if v_best is not null then
      return v_best;
    end if;
  end loop;
  raise exception 'Días de aporte inválidos';
end;
$$;

-- Al crear o reactivar una programación, el primer aporte es después de hoy.
create function public.savings_schedule_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := public.user_today(new.user_id);
begin
  if tg_op = 'INSERT'
    or new.frequency is distinct from old.frequency
    or new.days is distinct from old.days
    or (new.active and not old.active) then
    new.next_run_on := public.next_schedule_date(new.frequency, new.days, v_today);
  end if;
  if tg_op = 'INSERT' or (new.active and not old.active) then
    new.last_run_on := v_today - 1;
  end if;
  return new;
end;
$$;

create trigger savings_schedules_defaults
  before insert or update on public.savings_schedules
  for each row execute function public.savings_schedule_defaults();

-- ─── Aportar a una meta ──────────────────────────────────────────────────────
create function public.contribute_to_goal(
  p_goal uuid,
  p_account uuid,
  p_amount_cents bigint,
  p_occurred_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_goal public.savings_goals;
  v_account public.accounts;
  v_balance bigint;
  v_tx uuid;
begin
  if v_user is null then
    raise exception 'Inicia sesión para aportar.' using errcode = 'P0001';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'El monto debe ser mayor que cero.' using errcode = 'P0001';
  end if;
  select * into v_goal from public.savings_goals where id = p_goal and user_id = v_user and archived_at is null;
  select * into v_account from public.accounts where id = p_account and user_id = v_user and archived_at is null for update;
  if v_goal.id is null or v_account.id is null then
    raise exception 'No encontramos la meta o la cuenta.' using errcode = 'P0001';
  end if;
  if v_goal.currency <> v_account.currency then
    raise exception 'La cuenta debe estar en la misma moneda que la meta.' using errcode = 'P0001';
  end if;
  if v_account.type <> 'credit_card' then
    select balance_cents into v_balance from public.account_balances where account_id = v_account.id;
    if v_balance < p_amount_cents then
      raise exception 'No hay saldo suficiente en %.', v_account.name using errcode = 'P0001';
    end if;
  end if;

  insert into public.transactions (user_id, account_id, kind, amount_cents, occurred_on, goal_id)
  values (v_user, v_account.id, 'goal_contribution', p_amount_cents, coalesce(p_occurred_on, public.user_today(v_user)), v_goal.id)
  returning id into v_tx;
  return v_tx;
end;
$$;

revoke execute on function public.contribute_to_goal(uuid, uuid, bigint, date) from public, anon;
grant execute on function public.contribute_to_goal(uuid, uuid, bigint, date) to authenticated;

-- ─── Job: ejecutar los aportes que vencen (reglas 4–7) ───────────────────────
create function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_href text, p_dedupe text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body, href, dedupe_key)
  values (p_user, p_kind, p_title, p_body, p_href, p_dedupe)
  on conflict (user_id, dedupe_key) do nothing;
$$;

create function public.format_cents(p_cents bigint, p_currency public.currency_code)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_currency when 'USD' then '$ ' else 'L ' end
    || to_char(p_cents / 100.0, 'FM999,999,999,990.00');
$$;

/*
  Procesa una programación hasta `p_today` (incluye fechas atrasadas, una por una).
  Devuelve cuántos aportes creó.
*/
create function public.process_savings_schedule(p_schedule uuid, p_today date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.savings_schedules;
  g public.savings_goals;
  a public.accounts;
  v_run date;
  v_income bigint;
  v_balance bigint;
  v_saved bigint;
  v_amount bigint;
  v_created int := 0;
begin
  select * into s from public.savings_schedules where id = p_schedule for update;
  if s.id is null or not s.active then
    return 0;
  end if;
  select * into g from public.savings_goals where id = s.goal_id;
  select * into a from public.accounts where id = s.account_id;

  while s.active and s.next_run_on <= p_today loop
    v_run := s.next_run_on;

    -- Fin por fecha: no aporta después de end_date.
    if s.ends = 'on_date' and v_run > s.end_date then
      s.active := false;
      exit;
    end if;

    -- Meta o cuenta archivadas: se pausa.
    if g.archived_at is not null or a.archived_at is not null then
      s.active := false;
      exit;
    end if;

    select saved_cents into v_saved from public.goal_progress where goal_id = g.id;

    if s.ends = 'on_goal' and v_saved >= g.target_cents then
      -- Regla 6: la meta ya está completa.
      s.active := false;
      exit;
    end if;

    if s.mode = 'fixed' then
      v_amount := s.amount_cents;
    else
      -- Regla 4: porcentaje de los ingresos desde el aporte anterior.
      select coalesce(sum(amount_cents), 0) into v_income
      from public.transactions
      where account_id = a.id and kind = 'income' and occurred_on > s.last_run_on and occurred_on <= v_run;
      v_amount := floor(v_income * round(s.percent * 100) / 10000);
    end if;

    if s.ends = 'on_goal' then
      v_amount := least(v_amount, g.target_cents - v_saved);
    end if;

    if v_amount > 0 then
      select balance_cents into v_balance from public.account_balances where account_id = a.id;
      if a.type <> 'credit_card' and v_balance < v_amount then
        -- Regla 5: sin saldo suficiente se omite y se notifica.
        perform public.notify(s.user_id, 'savings_skipped',
          'No se apartó tu ahorro para ' || g.name,
          a.name || ' no tenía saldo suficiente para apartar ' || public.format_cents(v_amount, a.currency) || '.',
          '/ahorros', 'savings_skipped:' || s.id || ':' || v_run);
      else
        insert into public.transactions (user_id, account_id, kind, amount_cents, occurred_on, goal_id)
        values (s.user_id, a.id, 'goal_contribution', v_amount, v_run, g.id);
        v_created := v_created + 1;

        if s.ends = 'on_goal' and v_saved + v_amount >= g.target_cents then
          -- Regla 6: se desactiva al llegar a la meta.
          s.active := false;
          perform public.notify(s.user_id, 'goal_completed',
            '¡Completaste tu meta ' || g.name || '!',
            'Llegaste a ' || public.format_cents(g.target_cents, g.currency) || '. El ahorro programado terminó.',
            '/ahorros', 'goal_completed:' || g.id);
        end if;
      end if;
    end if;
    -- Regla 4: si no hubo ingresos, no se crea movimiento.

    s.last_run_on := v_run;
    s.next_run_on := public.next_schedule_date(s.frequency, s.days, v_run);

    if s.ends = 'on_date' and s.next_run_on > s.end_date then
      s.active := false;
    end if;
  end loop;

  update public.savings_schedules
  set active = s.active, next_run_on = s.next_run_on, last_run_on = s.last_run_on
  where id = s.id;

  return v_created;
end;
$$;

-- Recordatorio un día antes de cada aporte.
create function public.remind_savings(p_schedule uuid, p_today date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.savings_schedules;
  g public.savings_goals;
begin
  select * into s from public.savings_schedules where id = p_schedule;
  if not s.active or s.next_run_on <> p_today + 1 then
    return;
  end if;
  select * into g from public.savings_goals where id = s.goal_id;
  perform public.notify(s.user_id, 'savings_reminder',
    'Mañana se aparta tu ahorro para ' || g.name,
    case when s.mode = 'fixed'
      then 'Se apartarán ' || public.format_cents(s.amount_cents, g.currency) || '. Revisa que la cuenta tenga saldo.'
      else 'Se apartará el ' || trim(to_char(s.percent, 'FM990.##')) || ' % de tus ingresos.' end,
    '/ahorros', 'savings_reminder:' || s.id || ':' || s.next_run_on);
end;
$$;

-- Corre todas las programaciones vencidas según la fecha local de cada usuario.
create function public.run_due_savings()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_total int := 0;
begin
  for r in
    select s.id, public.user_today(s.user_id) as today
    from public.savings_schedules s
    where s.active
  loop
    if (select next_run_on from public.savings_schedules where id = r.id) <= r.today then
      v_total := v_total + public.process_savings_schedule(r.id, r.today);
    end if;
    perform public.remind_savings(r.id, r.today);
  end loop;
  return v_total;
end;
$$;

-- Las funciones del job no se pueden llamar desde la API.
revoke execute on function public.process_savings_schedule(uuid, date) from public, anon, authenticated;
revoke execute on function public.remind_savings(uuid, date) from public, anon, authenticated;
revoke execute on function public.run_due_savings() from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, text, text, text, text) from public, anon, authenticated;
