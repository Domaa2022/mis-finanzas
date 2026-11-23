-- Job programado: corre cada hora y procesa lo que vence según la fecha local
-- de cada usuario (por eso no basta una vez al día en UTC). Es idempotente:
-- cada programación avanza su próxima fecha al procesarse.

create or replace function public.run_daily_jobs()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_savings int;
begin
  v_savings := public.run_due_savings();
  return jsonb_build_object('savings', v_savings);
end;
$$;

revoke execute on function public.run_daily_jobs() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    -- Si ya existe un job con este nombre, cron.schedule lo actualiza.
    perform cron.schedule('mis-finanzas-jobs', '5 * * * *', 'select public.run_daily_jobs()');
  else
    raise notice 'pg_cron no está disponible: llama a public.run_daily_jobs() cada hora por otro medio.';
  end if;
end;
$$;
