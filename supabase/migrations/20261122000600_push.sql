-- Fase 7: notificaciones push web (recordatorios de aportes y cobros).

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "solo el dueño" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Marca qué notificaciones ya se enviaron por push.
alter table public.notifications add column pushed_at timestamptz;
create index notifications_unpushed_idx on public.notifications (created_at) where pushed_at is null;
