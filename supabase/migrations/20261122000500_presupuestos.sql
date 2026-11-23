-- Fase 6: presupuestos por categoría y mes.

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid not null,
  -- Primer día del mes.
  month date not null check (extract(day from month) = 1),
  limit_cents bigint not null check (limit_cents > 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month),
  foreign key (category_id, user_id) references public.categories (id, user_id) on delete cascade
);
create index budgets_user_month_idx on public.budgets (user_id, month);

alter table public.budgets enable row level security;

create policy "solo el dueño" on public.budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Solo categorías de gasto.
create function public.budgets_expense_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select kind from public.categories where id = new.category_id) <> 'expense' then
    raise exception 'Los presupuestos son solo para categorías de gasto.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger budgets_expense_category
  before insert or update of category_id on public.budgets
  for each row execute function public.budgets_expense_category();
