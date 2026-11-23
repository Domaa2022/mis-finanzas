-- El ahorro programado espera a que entre el ingreso del periodo.
--
-- Con wait_for_income (por defecto), en la fecha del aporte solo se aparta si ya se
-- registró un ingreso en la cuenta de origen después del aporte anterior. Si todavía
-- no, el aporte espera y se hace en cuanto entre el ingreso (con la fecha de ese día).
-- Si llega la fecha del siguiente aporte sin ingreso, ese periodo se omite y se avisa.

alter table public.savings_schedules add column wait_for_income boolean not null default true;

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
  v_next date;
  v_exec date;
  v_income_on date;
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
    v_next := public.next_schedule_date(s.frequency, s.days, v_run);
    v_exec := v_run;

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

    if s.wait_for_income then
      -- Primer ingreso del periodo: después del aporte anterior y antes del siguiente aporte.
      select min(occurred_on) into v_income_on
      from public.transactions
      where account_id = a.id and kind = 'income'
        and occurred_on > s.last_run_on and occurred_on < v_next and occurred_on <= p_today;

      if v_income_on is null then
        if v_next <= p_today then
          -- Ya pasó el periodo sin ingreso: se omite este aporte y se avisa.
          perform public.notify(s.user_id, 'savings_skipped',
            'No se apartó tu ahorro para ' || v_name,
            'No entró ningún ingreso en ' || a.name || ' antes del siguiente aporte.',
            '/ahorros', 'savings_skipped:' || s.id || ':' || v_run);
          s.last_run_on := v_run;
          s.next_run_on := v_next;
          if s.ends = 'on_date' and s.next_run_on > s.end_date then
            s.active := false;
          end if;
          continue;
        end if;
        -- Todavía puede entrar: el aporte espera (se vuelve a revisar en la siguiente corrida).
        perform public.notify(s.user_id, 'savings_waiting',
          'Tu ahorro para ' || v_name || ' espera tu ingreso',
          'Se apartará en cuanto registres un ingreso en ' || a.name || '.',
          '/ahorros', 'savings_waiting:' || s.id || ':' || v_run);
        exit;
      end if;
      v_exec := greatest(v_run, v_income_on);
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
      where account_id = a.id and kind = 'income' and occurred_on > s.last_run_on and occurred_on <= v_exec;
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
        values (s.user_id, a.id, 'goal_contribution', v_amount, v_exec, g.id);
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
        values (s.user_id, a.id, t.id, v_amount, v_amount, v_exec, 'Ahorro programado')
        returning id into v_transfer;
        insert into public.transactions (user_id, account_id, kind, amount_cents, occurred_on, note, transfer_id)
        values
          (s.user_id, a.id, 'transfer_out', v_amount, v_exec, 'Ahorro programado', v_transfer),
          (s.user_id, t.id, 'transfer_in', v_amount, v_exec, 'Ahorro programado', v_transfer);
        v_created := v_created + 1;
      end if;
    end if;

    -- Regla 4: si no hubo ingresos, no se crea movimiento.
    s.last_run_on := v_exec;
    s.next_run_on := v_next;
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
      then 'Se apartarán ' || public.format_cents(s.amount_cents, v_currency)
      else 'Se apartará el ' || trim(to_char(s.percent, 'FM990.##')) || ' % de tus ingresos' end
    || case when s.wait_for_income
      then ' cuando entre tu ingreso.'
      else '. Revisa que la cuenta tenga saldo.' end,
    '/ahorros', 'savings_reminder:' || s.id || ':' || s.next_run_on);
end;
$$;
