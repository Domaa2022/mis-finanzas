-- Gastos fijos y suscripciones quincenales.
--
-- `day_rule` quincenal: primer día × 100 + segundo día (1531 = día 15 y último día;
-- 115 = día 1 y día 15). Un día que no existe en el mes cae en el último (31 = último día).

alter type public.recurring_frequency add value if not exists 'biweekly' before 'monthly';

-- El valor nuevo del enum no puede usarse como literal en esta misma transacción:
-- por eso se compara `frequency::text`.
alter table public.recurring_charges drop constraint recurring_charges_check;
alter table public.recurring_charges add constraint recurring_charges_day_rule_check check (
  case frequency::text
    when 'weekly' then day_rule between 1 and 7
    when 'biweekly' then day_rule / 100 between 1 and 30 and day_rule % 100 between day_rule / 100 + 1 and 31
    when 'monthly' then day_rule = -1 or day_rule between 1 and 31
    else day_rule / 100 between 1 and 12 and day_rule % 100 between 1 and 31
  end
);

-- Próximo cobro estrictamente posterior a p_after (igual que nextChargeDate en TS).
create or replace function public.next_charge_date(p_frequency public.recurring_frequency, p_rule int, p_after date)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_diff int;
  v_candidate date;
  v_month date;
  v_year int := extract(year from p_after)::int;
begin
  if p_frequency::text = 'weekly' then
    v_diff := (p_rule - extract(isodow from p_after)::int + 7) % 7;
    return p_after + case when v_diff = 0 then 7 else v_diff end;
  end if;

  if p_frequency::text = 'biweekly' then
    for i in 0..1 loop
      v_month := (date_trunc('month', p_after) + make_interval(months => i))::date;
      foreach v_diff in array array[p_rule / 100, p_rule % 100] loop
        v_candidate := public.day_of_month(v_month, v_diff);
        if v_candidate > p_after then
          return v_candidate;
        end if;
      end loop;
    end loop;
    raise exception 'Regla de cobro inválida';
  end if;

  for i in 0..1 loop
    if p_frequency::text = 'monthly' then
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
