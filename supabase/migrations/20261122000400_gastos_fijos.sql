-- Fase 5: suscripciones y gastos fijos, cobros pendientes y recordatorios.

create type public.recurring_kind as enum ('subscription', 'fixed');
create type public.recurring_frequency as enum ('weekly', 'monthly', 'yearly');
create type public.pending_status as enum ('pending', 'confirmed', 'dismissed');

create table public.recurring_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind public.recurring_kind not null default 'subscription',
  name text not null check (char_length(btrim(name)) between 1 and 40),
  icon text not null default 'circle',
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  account_id uuid not null,
  category_id uuid,
  -- Si is_variable, es un estimado que se ajusta al confirmar.
  amount_cents bigint not null check (amount_cents > 0),
  is_variable boolean not null default false,
  frequency public.recurring_frequency not null default 'monthly',
  -- Semanal: día ISO 1–7. Mensual: 1–31 o −1 (último). Anual: mes*100 + día (214 = 14 feb).
  day_rule int not null,
  next_charge_on date not null,
  remind_days_before int check (remind_days_before between 0 and 7),
  auto_register boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete set null (category_id),
  check (
    case frequency
      when 'weekly' then day_rule between 1 and 7
      when 'monthly' then day_rule = -1 or day_rule between 1 and 31
      else day_rule / 100 between 1 and 12 and day_rule % 100 between 1 and 31
    end
  )
);
create index recurring_charges_due_idx on public.recurring_charges (next_charge_on) where active;

-- Cobros que esperan confirmación (gastos fijos sin registro automático, regla 8).
create table public.pending_charges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  recurring_id uuid not null,
  due_on date not null,
  amount_cents bigint not null check (amount_cents > 0),
  status public.pending_status not null default 'pending',
  transaction_id uuid references public.transactions on delete set null,
  created_at timestamptz not null default now(),
  unique (recurring_id, due_on),
  foreign key (recurring_id, user_id) references public.recurring_charges (id, user_id) on delete cascade
);
create index pending_charges_user_idx on public.pending_charges (user_id) where status = 'pending';

alter table public.transactions
  add constraint transactions_recurring_id_fkey
  foreign key (recurring_id) references public.recurring_charges (id) on delete set null;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.recurring_charges enable row level security;
alter table public.pending_charges enable row level security;

create policy "solo el dueño" on public.recurring_charges
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Los pendientes los crea el job; el dueño los ve y los descarta. Confirmar usa confirm_pending_charge().
create policy "solo el dueño: ver" on public.pending_charges
  for select to authenticated using (user_id = (select auth.uid()));
create policy "solo el dueño: descartar" on public.pending_charges
  for update to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (user_id = (select auth.uid()) and status = 'dismissed');

-- ─── Fechas de cobro ─────────────────────────────────────────────────────────
-- Próximo cobro estrictamente posterior a p_after (igual que nextChargeDate en TS).
create function public.next_charge_date(p_frequency public.recurring_frequency, p_rule int, p_after date)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_diff int;
  v_candidate date;
  v_year int := extract(year from p_after)::int;
begin
  if p_frequency = 'weekly' then
    v_diff := (p_rule - extract(isodow from p_after)::int + 7) % 7;
    return p_after + case when v_diff = 0 then 7 else v_diff end;
  end if;

  for i in 0..1 loop
    if p_frequency = 'monthly' then
      v_candidate := public.day_of_month((date_trunc('month', p_after) + make_interval(months => i))::date, p_rule);
    else
      v_candidate := public.day_of_month(make_date(v_year + i, p_rule / 100, 1), p_rule % 100);
    end if;
    if v_candidate > p_after then
      return v_candidate;
    end if;
  end loop;
  raise exception 'Regla de cobro inválida';
end;
$$;

-- Al crear o cambiar la regla, el próximo cobro es desde hoy (incluido).
create function public.recurring_charge_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
    or new.frequency is distinct from old.frequency
    or new.day_rule is distinct from old.day_rule
    or (new.active and not old.active) then
    new.next_charge_on := public.next_charge_date(new.frequency, new.day_rule, public.user_today(new.user_id) - 1);
  end if;
  return new;
end;
$$;

create trigger recurring_charges_defaults
  before insert or update on public.recurring_charges
  for each row execute function public.recurring_charge_defaults();

-- ─── Confirmar un cobro pendiente ────────────────────────────────────────────
-- Con monto variable se puede indicar el monto real (regla 8).
create function public.confirm_pending_charge(
  p_pending uuid,
  p_amount_cents bigint default null,
  p_occurred_on date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  p public.pending_charges;
  r public.recurring_charges;
  v_amount bigint;
  v_tx uuid;
begin
  select * into p from public.pending_charges where id = p_pending and user_id = v_user for update;
  if p.id is null or p.status <> 'pending' then
    raise exception 'Ese cobro ya no está pendiente.' using errcode = 'P0001';
  end if;
  select * into r from public.recurring_charges where id = p.recurring_id;

  v_amount := coalesce(p_amount_cents, p.amount_cents);
  if v_amount <= 0 then
    raise exception 'El monto debe ser mayor que cero.' using errcode = 'P0001';
  end if;
  if p_amount_cents is not null and p_amount_cents <> p.amount_cents and not r.is_variable then
    raise exception 'Este cobro tiene monto fijo.' using errcode = 'P0001';
  end if;

  insert into public.transactions (user_id, account_id, category_id, kind, amount_cents, occurred_on, note, recurring_id)
  values (v_user, r.account_id, r.category_id, 'expense', v_amount, coalesce(p_occurred_on, p.due_on), r.name, r.id)
  returning id into v_tx;

  update public.pending_charges set status = 'confirmed', transaction_id = v_tx, amount_cents = v_amount where id = p.id;
  return v_tx;
end;
$$;

revoke execute on function public.confirm_pending_charge(uuid, bigint, date) from public, anon;
grant execute on function public.confirm_pending_charge(uuid, bigint, date) to authenticated;

-- ─── Job: cobros del día y recordatorios (regla 8) ───────────────────────────
create function public.process_recurring_charge(p_charge uuid, p_today date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recurring_charges;
  a public.accounts;
  v_due date;
  v_created int := 0;
begin
  select * into r from public.recurring_charges where id = p_charge for update;
  if r.id is null or not r.active then
    return 0;
  end if;
  select * into a from public.accounts where id = r.account_id;
  if a.archived_at is not null then
    update public.recurring_charges set active = false where id = r.id;
    return 0;
  end if;

  while r.next_charge_on <= p_today loop
    v_due := r.next_charge_on;
    if r.auto_register then
      -- Se anota el gasto el día del cobro.
      insert into public.transactions (user_id, account_id, category_id, kind, amount_cents, occurred_on, note, recurring_id)
      values (r.user_id, r.account_id, r.category_id, 'expense', r.amount_cents, v_due, r.name, r.id);
    else
      -- Queda pendiente de confirmar; con monto variable, el monto es un estimado.
      insert into public.pending_charges (user_id, recurring_id, due_on, amount_cents)
      values (r.user_id, r.id, v_due, r.amount_cents)
      on conflict (recurring_id, due_on) do nothing;
      perform public.notify(r.user_id, 'charge_pending',
        'Confirma el cobro de ' || r.name,
        case when r.is_variable
          then 'Estimado ' || public.format_cents(r.amount_cents, a.currency) || '. Indica el monto real para registrarlo.'
          else public.format_cents(r.amount_cents, a.currency) || ' de ' || a.name || '. Confírmalo para registrarlo.' end,
        '/gastos-fijos', 'charge_pending:' || r.id || ':' || v_due);
    end if;
    v_created := v_created + 1;
    r.next_charge_on := public.next_charge_date(r.frequency, r.day_rule, v_due);
  end loop;

  update public.recurring_charges set next_charge_on = r.next_charge_on where id = r.id;
  return v_created;
end;
$$;

create function public.remind_recurring(p_charge uuid, p_today date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recurring_charges;
  a public.accounts;
begin
  select * into r from public.recurring_charges where id = p_charge;
  if not r.active or r.remind_days_before is null or r.next_charge_on - r.remind_days_before <> p_today then
    return;
  end if;
  select * into a from public.accounts where id = r.account_id;
  perform public.notify(r.user_id, 'charge_reminder',
    case r.remind_days_before
      when 0 then 'Hoy se cobra ' || r.name
      when 1 then 'Mañana se cobra ' || r.name
      else 'En ' || r.remind_days_before || ' días se cobra ' || r.name end,
    case when r.is_variable then '≈ ' else '' end || public.format_cents(r.amount_cents, a.currency) || ' de ' || a.name || '.',
    '/gastos-fijos', 'charge_reminder:' || r.id || ':' || r.next_charge_on);
end;
$$;

create function public.run_due_recurring()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  v_total int := 0;
begin
  for c in
    select r.id, public.user_today(r.user_id) as today
    from public.recurring_charges r
    where r.active
  loop
    -- Primero el recordatorio (por si el aviso es "el mismo día") y luego el cobro.
    perform public.remind_recurring(c.id, c.today);
    if (select next_charge_on from public.recurring_charges where id = c.id) <= c.today then
      v_total := v_total + public.process_recurring_charge(c.id, c.today);
    end if;
  end loop;
  return v_total;
end;
$$;

revoke execute on function public.process_recurring_charge(uuid, date) from public, anon, authenticated;
revoke execute on function public.remind_recurring(uuid, date) from public, anon, authenticated;
revoke execute on function public.run_due_recurring() from public, anon, authenticated;

-- El job horario ahora también procesa los cobros.
create or replace function public.run_daily_jobs()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_savings int;
  v_charges int;
begin
  v_savings := public.run_due_savings();
  v_charges := public.run_due_recurring();
  return jsonb_build_object('savings', v_savings, 'charges', v_charges);
end;
$$;

revoke execute on function public.run_daily_jobs() from public, anon, authenticated;
