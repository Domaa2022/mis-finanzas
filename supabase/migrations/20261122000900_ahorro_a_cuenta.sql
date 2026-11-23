-- Ahorro programado hacia una cuenta (sin meta).
--
-- Una programación lleva el dinero a una meta (goal_id) o a otra cuenta (to_account_id),
-- nunca a las dos. Hacia una cuenta, cada aporte es una transferencia normal: no cuenta
-- como gasto ni ingreso (regla 1) y aparece en Movimientos. Las dos cuentas deben ser de
-- la misma moneda, y "cuando complete la meta" no aplica.

alter table public.savings_schedules alter column goal_id drop not null;
alter table public.savings_schedules add column to_account_id uuid;

alter table public.savings_schedules
  add constraint savings_schedules_to_account_fk
    foreign key (to_account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  add constraint savings_schedules_destination_check check ((goal_id is null) <> (to_account_id is null)),
  add constraint savings_schedules_distinct_accounts_check check (to_account_id is distinct from account_id),
  add constraint savings_schedules_ends_check check (to_account_id is null or ends <> 'on_goal');

-- Las dos cuentas en la misma moneda (la programación no lleva tasa de cambio).
create function public.check_savings_destination()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.to_account_id is not null and (
    select count(distinct currency) from public.accounts where id in (new.account_id, new.to_account_id)
  ) > 1 then
    raise exception 'Las dos cuentas deben ser de la misma moneda.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger savings_schedules_check_destination
  before insert or update of account_id, to_account_id on public.savings_schedules
  for each row execute function public.check_savings_destination();

/*
  Procesa una programación hasta `p_today` (incluye fechas atrasadas, una por una).
  Devuelve cuántos aportes creó. Hacia una meta crea un aporte; hacia una cuenta, una transferencia.
*/
create or replace function public.process_savings_schedule(p_schedule uuid, p_today date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.savings_schedules;
  g public.savings_goals;
  a public.accounts;
  t public.accounts;
  v_name text;
  v_run date;
  v_income bigint;
  v_balance bigint;
  v_saved bigint;
  v_amount bigint;
  v_transfer uuid;
  v_created int := 0;
begin
  select * into s from public.savings_schedules where id = p_schedule for update;
  if s.id is null or not s.active then
    return 0;
  end if;
  select * into a from public.accounts where id = s.account_id;
  if s.goal_id is not null then
    select * into g from public.savings_goals where id = s.goal_id;
    v_name := g.name;
  else
    select * into t from public.accounts where id = s.to_account_id;
    v_name := t.name;
  end if;

  while s.active and s.next_run_on <= p_today loop
    v_run := s.next_run_on;

    -- Fin por fecha: no aporta después de end_date.
    if s.ends = 'on_date' and v_run > s.end_date then
      s.active := false;
      exit;
    end if;

    -- Meta o cuentas archivadas: se pausa.
    if a.archived_at is not null or g.archived_at is not null or t.archived_at is not null then
      s.active := false;
      exit;
    end if;

    if s.goal_id is not null then
      select saved_cents into v_saved from public.goal_progress where goal_id = g.id;
      if s.ends = 'on_goal' and v_saved >= g.target_cents then
        -- Regla 6: la meta ya está completa.
        s.active := false;
        exit;
      end if;
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

    if s.goal_id is not null and s.ends = 'on_goal' then
      v_amount := least(v_amount, g.target_cents - v_saved);
    end if;

    if v_amount > 0 then
      select balance_cents into v_balance from public.account_balances where account_id = a.id;
      if a.type <> 'credit_card' and v_balance < v_amount then
        -- Regla 5: sin saldo suficiente se omite y se notifica.
        perform public.notify(s.user_id, 'savings_skipped',
          'No se apartó tu ahorro para ' || v_name,
          a.name || ' no tenía saldo suficiente para apartar ' || public.format_cents(v_amount, a.currency) || '.',
          '/ahorros', 'savings_skipped:' || s.id || ':' || v_run);
      elsif s.goal_id is not null then
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
      else
        insert into public.transfers (user_id, from_account_id, to_account_id, amount_cents, to_amount_cents, occurred_on, note)
        values (s.user_id, a.id, t.id, v_amount, v_amount, v_run, 'Ahorro programado')
        returning id into v_transfer;
        insert into public.transactions (user_id, account_id, kind, amount_cents, occurred_on, note, transfer_id)
        values
          (s.user_id, a.id, 'transfer_out', v_amount, v_run, 'Ahorro programado', v_transfer),
          (s.user_id, t.id, 'transfer_in', v_amount, v_run, 'Ahorro programado', v_transfer);
        v_created := v_created + 1;
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
create or replace function public.remind_savings(p_schedule uuid, p_today date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.savings_schedules;
  v_name text;
  v_currency public.currency_code;
begin
  select * into s from public.savings_schedules where id = p_schedule;
  if not s.active or s.next_run_on <> p_today + 1 then
    return;
  end if;
  if s.goal_id is not null then
    select name, currency into v_name, v_currency from public.savings_goals where id = s.goal_id;
  else
    select name, currency into v_name, v_currency from public.accounts where id = s.to_account_id;
  end if;
  perform public.notify(s.user_id, 'savings_reminder',
    'Mañana se aparta tu ahorro para ' || v_name,
    case when s.mode = 'fixed'
      then 'Se apartarán ' || public.format_cents(s.amount_cents, v_currency) || '. Revisa que la cuenta tenga saldo.'
      else 'Se apartará el ' || trim(to_char(s.percent, 'FM990.##')) || ' % de tus ingresos.' end,
    '/ahorros', 'savings_reminder:' || s.id || ':' || s.next_run_on);
end;
$$;
