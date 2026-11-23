-- Fase 3: transferencias entre cuentas.
-- Una transferencia crea dos movimientos (transfer_out y transfer_in) en una sola
-- función transaccional. No cuentan como gasto ni ingreso (regla 1).

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  from_account_id uuid not null,
  to_account_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  -- Monto que llega a la cuenta destino (distinto si cambia la moneda, regla 2).
  to_amount_cents bigint not null check (to_amount_cents > 0),
  -- Lempiras por 1 dólar. Solo cuando las monedas difieren.
  exchange_rate numeric(12, 4) check (exchange_rate is null or exchange_rate > 0),
  occurred_on date not null default public.user_today(),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id),
  foreign key (from_account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  foreign key (to_account_id, user_id) references public.accounts (id, user_id) on delete cascade
);
create index transfers_user_idx on public.transfers (user_id, occurred_on desc);

alter table public.transactions
  add constraint transactions_transfer_id_fkey
  foreign key (transfer_id) references public.transfers (id) on delete cascade;

alter table public.transfers enable row level security;

-- Se ven y se borran (el borrado arrastra sus dos movimientos); se crean solo con create_transfer().
create policy "solo el dueño: ver" on public.transfers
  for select to authenticated using (user_id = (select auth.uid()));
create policy "solo el dueño: borrar" on public.transfers
  for delete to authenticated using (user_id = (select auth.uid()));

-- Movimientos: el dueño ve todos los suyos, pero solo crea, edita y borra
-- gastos e ingresos. Transferencias y aportes se manejan con sus funciones.
drop policy "solo el dueño" on public.transactions;

create policy "solo el dueño: ver" on public.transactions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "solo el dueño: crear gastos e ingresos" on public.transactions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and kind in ('expense', 'income'));

create policy "solo el dueño: editar gastos e ingresos" on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()) and kind in ('expense', 'income'))
  with check (user_id = (select auth.uid()) and kind in ('expense', 'income'));

create policy "solo el dueño: borrar gastos e ingresos" on public.transactions
  for delete to authenticated
  using (user_id = (select auth.uid()) and kind in ('expense', 'income'));

-- Convierte un monto entre monedas con la tasa "lempiras por dólar" (regla 2).
create function public.convert_cents(
  p_amount_cents bigint,
  p_from public.currency_code,
  p_to public.currency_code,
  p_rate numeric
)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from = p_to then p_amount_cents
    when p_from = 'HNL' and p_to = 'USD' then round(p_amount_cents / p_rate)::bigint
    else round(p_amount_cents * p_rate)::bigint
  end;
$$;

/*
  Crea una transferencia y sus dos movimientos de forma atómica.
  - Ambas cuentas deben ser del usuario y estar activas.
  - Si las monedas difieren, exige la tasa y calcula el monto de destino (regla 2).
  - No deja la cuenta de origen en negativo, salvo tarjetas de crédito.
*/
create function public.create_transfer(
  p_from_account uuid,
  p_to_account uuid,
  p_amount_cents bigint,
  p_exchange_rate numeric default null,
  p_occurred_on date default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_from public.accounts;
  v_to public.accounts;
  v_balance bigint;
  v_rate numeric;
  v_to_amount bigint;
  v_date date := coalesce(p_occurred_on, public.user_today(v_user));
  v_transfer uuid;
begin
  if v_user is null then
    raise exception 'Inicia sesión para transferir.' using errcode = 'P0001';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'El monto debe ser mayor que cero.' using errcode = 'P0001';
  end if;
  if p_from_account = p_to_account then
    raise exception 'Elige dos cuentas distintas.' using errcode = 'P0001';
  end if;

  select * into v_from from public.accounts
    where id = p_from_account and user_id = v_user and archived_at is null
    for update;
  select * into v_to from public.accounts
    where id = p_to_account and user_id = v_user and archived_at is null;
  if v_from.id is null or v_to.id is null then
    raise exception 'No encontramos una de las cuentas.' using errcode = 'P0001';
  end if;

  if v_from.currency = v_to.currency then
    v_rate := null;
  else
    if p_exchange_rate is null or p_exchange_rate <= 0 then
      raise exception 'Escribe la tasa de cambio.' using errcode = 'P0001';
    end if;
    v_rate := round(p_exchange_rate, 4);
  end if;
  v_to_amount := public.convert_cents(p_amount_cents, v_from.currency, v_to.currency, v_rate);
  if v_to_amount <= 0 then
    raise exception 'El monto es demasiado pequeño para convertirlo.' using errcode = 'P0001';
  end if;

  if v_from.type <> 'credit_card' then
    select balance_cents into v_balance from public.account_balances where account_id = v_from.id;
    if v_balance < p_amount_cents then
      raise exception 'No hay saldo suficiente en %.', v_from.name using errcode = 'P0001';
    end if;
  end if;

  insert into public.transfers (user_id, from_account_id, to_account_id, amount_cents, to_amount_cents, exchange_rate, occurred_on, note)
  values (v_user, v_from.id, v_to.id, p_amount_cents, v_to_amount, v_rate, v_date, nullif(btrim(p_note), ''))
  returning id into v_transfer;

  insert into public.transactions (user_id, account_id, kind, amount_cents, occurred_on, note, transfer_id)
  values
    (v_user, v_from.id, 'transfer_out', p_amount_cents, v_date, nullif(btrim(p_note), ''), v_transfer),
    (v_user, v_to.id, 'transfer_in', v_to_amount, v_date, nullif(btrim(p_note), ''), v_transfer);

  return v_transfer;
end;
$$;

revoke execute on function public.create_transfer(uuid, uuid, bigint, numeric, date, text) from public, anon;
grant execute on function public.create_transfer(uuid, uuid, bigint, numeric, date, text) to authenticated;
