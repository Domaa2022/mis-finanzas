-- Tarjetas de crédito con deuda en lempiras y en dólares.
--
-- Una tarjeta bimoneda son dos cuentas `credit_card`, una por moneda. La segunda
-- apunta a la principal con `paired_account_id`. Así cada cuenta conserva una sola
-- moneda y los saldos, transferencias, aportes y reportes no cambian; la app las
-- muestra juntas como una sola tarjeta.

alter table public.accounts add column paired_account_id uuid;

-- Misma persona (FK compuesta). Si se borra la principal, la otra queda suelta.
alter table public.accounts
  add constraint accounts_paired_fk
  foreign key (paired_account_id, user_id) references public.accounts (id, user_id)
  on delete set null (paired_account_id);

-- Una tarjeta principal tiene como mucho una cuenta en la otra moneda.
create unique index accounts_paired_uidx on public.accounts (paired_account_id) where paired_account_id is not null;

create function public.check_account_pair()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_main public.accounts;
begin
  -- Como cuenta en la otra moneda de una tarjeta.
  if new.paired_account_id is not null then
    if new.paired_account_id = new.id then
      raise exception 'Una cuenta no puede emparejarse consigo misma' using errcode = '23514';
    end if;
    select * into v_main from public.accounts where id = new.paired_account_id;
    if not found then
      raise exception 'No existe la tarjeta principal' using errcode = '23503';
    end if;
    if new.type <> 'credit_card' or v_main.type <> 'credit_card' then
      raise exception 'Solo las tarjetas de crédito pueden tener deuda en dos monedas' using errcode = '23514';
    end if;
    if v_main.currency = new.currency then
      raise exception 'Las dos cuentas de la tarjeta deben ser de monedas distintas' using errcode = '23514';
    end if;
    if v_main.paired_account_id is not null then
      raise exception 'La cuenta principal no puede estar emparejada con otra' using errcode = '23514';
    end if;
  end if;

  -- Como tarjeta principal: no puede dejar de ser tarjeta ni igualar la moneda de su pareja.
  if tg_op = 'UPDATE' and exists (
    select 1 from public.accounts p
    where p.paired_account_id = new.id
      and (new.type <> 'credit_card' or p.currency = new.currency or new.paired_account_id is not null)
  ) then
    raise exception 'Esta tarjeta tiene deuda en otra moneda: quítala antes de cambiar el tipo o la moneda'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger accounts_check_pair
  before insert or update of paired_account_id, type, currency on public.accounts
  for each row execute function public.check_account_pair();
