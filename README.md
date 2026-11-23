# Mis Finanzas

App web responsiva de finanzas personales: cuentas, gastos, transferencias, metas y ahorro programado,
suscripciones y gastos fijos, presupuestos y reportes. Next.js 16 (App Router, Cache Components),
Supabase (Postgres, Auth, RLS) y Tailwind v4.

El plan está en [`PLAN.md`](PLAN.md) y los diseños de referencia en [`disenos/`](disenos/).

## Puesta en marcha

### 1. Dependencias y variables

```bash
npm install
cp .env.example .env.local
```

Completa `.env.local` (cada variable está explicada en [`.env.example`](.env.example)). Para empezar solo
hacen falta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

### 2. Base de datos

Las migraciones están en [`supabase/migrations/`](supabase/migrations/) y se aplican **en orden**:

| Archivo | Qué crea |
|---|---|
| `…000100_cuentas_y_movimientos.sql` | `profiles`, `accounts`, `categories`, `transactions`, vista `account_balances`, categorías por defecto al registrarse |
| `…000200_transferencias.sql` | `transfers`, `create_transfer()` |
| `…000300_ahorros.sql` | `savings_goals`, `goal_progress`, `savings_schedules`, `notifications`, `contribute_to_goal()`, job de ahorro |
| `…000310_job_diario.sql` | `run_daily_jobs()` y su programación horaria con `pg_cron` |
| `…000400_gastos_fijos.sql` | `recurring_charges`, `pending_charges`, `confirm_pending_charge()`, job de cobros |
| `…000500_presupuestos.sql` | `budgets` |
| `…000600_push.sql` | `push_subscriptions` |
| `…000700_tarjeta_bimoneda.sql` | `accounts.paired_account_id`: tarjetas con deuda en lempiras y en dólares |
| `…000800_gastos_fijos_quincenales.sql` | Frecuencia quincenal para suscripciones y gastos fijos |
| `…000900_ahorro_a_cuenta.sql` | Ahorro programado hacia una cuenta, sin meta (`savings_schedules.to_account_id`) |

Dos formas de aplicarlas:

- **CLI de Supabase:** `npx supabase link --project-ref <id>` y luego `npx supabase db push`.
- **Panel:** SQL Editor → pega y ejecuta cada archivo, en orden.

Todas las tablas tienen RLS "solo el dueño". Las transferencias, aportes y confirmaciones de cobros solo
se crean con sus funciones SQL, que validan la cuenta, la moneda y el saldo.

### 3. Autenticación

En Supabase → Authentication:

- **URL Configuration:** agrega `http://localhost:3000/auth/callback` (y la de producción) a *Redirect URLs*.
- **Providers:** activa Google y Facebook con sus credenciales. En cada consola, la URL de callback es
  `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
- **Email:** si dejas activada la confirmación de correo, el registro muestra "Revisa tu correo".

### 4. Tareas programadas

Los aportes programados, los cobros fijos y los recordatorios se procesan con `public.run_daily_jobs()`,
**cada hora**, según la fecha local de cada persona (`profiles.timezone`, por defecto `America/Tegucigalpa`).
Es idempotente: correrlo de más no duplica nada.

- **Con `pg_cron`** (incluido en el plan gratis de Supabase): la migración `…000310` lo programa sola. Con
  esto ya se registran los aportes y los cobros y se crean las notificaciones dentro de la app. Si la extensión
  no está disponible, verás un aviso al aplicarla.
- **Avisos push (opcional, sin programar por ahora):** `GET /api/cron/notificaciones` con
  `Authorization: Bearer <CRON_SECRET>` corre los jobs y envía las notificaciones push pendientes. Necesita
  `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET`. Nada lo llama todavía: un cron cada hora en Vercel requiere
  el plan Pro. Para activarlo, agrega un `vercel.json` con
  `{ "crons": [{ "path": "/api/cron/notificaciones", "schedule": "10 * * * *" }] }`, o llama la ruta desde
  otro servicio de cron.

### 5. Notificaciones push (opcional)

```bash
npx web-push generate-vapid-keys
```

Pon las claves en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`. Cada persona activa los avisos en
**Perfil → Avisos en este dispositivo**. La app es instalable (PWA).

### 6. Arrancar

```bash
npm run dev   # http://localhost:3000
```

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript estricto |
| `npm test` | Unitarias, componentes y **SQL** (Vitest) |
| `npm run test:e2e` | E2E en móvil y escritorio (Playwright). La primera vez: `npx playwright install chromium` |

### Qué cubren las pruebas

- **SQL en Postgres real, sin Docker:** [`supabase/tests/`](supabase/tests/) aplica todas las migraciones en
  [PGlite](https://pglite.dev) (Postgres compilado a WASM) con un stub mínimo de `auth` y prueba RLS, saldos,
  transferencias y las reglas 4–8 del job. También compara las fechas de aporte y de cobro calculadas en SQL
  con las de TypeScript, día por día, de 2026 a 2028.
- **Lógica de negocio:** montos, fechas, saldos, ahorro programado, cobros, presupuestos y CSV (`lib/**/*.test.ts`).
- **E2E:** pantallas públicas, redirecciones, accesibilidad WCAG AA con axe y capturas
  (`SCREENSHOTS=1 npx playwright test screenshots`).
- **Flujo completo** (registro → cuenta → gasto → transferencia → ahorro programado): necesita un proyecto de
  Supabase de prueba con la confirmación de correo desactivada y `E2E_SUPABASE=1` en el entorno.

## Desarrollo

- `/dev/ui`: catálogo de componentes y gráficas. `/dev/formularios/<nombre>`: cada formulario con datos de
  ejemplo. Solo existen en desarrollo y no piden sesión.
- **Montos:** siempre enteros en centavos. `formatMoney`/`<Money>` para mostrarlos, `<MoneyInput>` para capturarlos.
- **Cache Components está activo:** lo que lee la sesión (`cookies()`), `params` o `searchParams` va dentro de
  un `<Suspense>`; el fallback es el esqueleto de carga de la pantalla.
- **Tipos de la base:** [`lib/supabase/database.types.ts`](lib/supabase/database.types.ts) se mantiene a mano
  junto a las migraciones (o se regenera con `npx supabase gen types typescript`).
- **npm y rolldown (Vitest):** si `npm test` falla con *Cannot find native binding*, es el bug de npm con
  dependencias opcionales ([npm/cli#4828](https://github.com/npm/cli/issues/4828)). Borra `node_modules` y
  `package-lock.json` y vuelve a correr `npm install`. Pasa al agregar paquetes; revisa que el lockfile
  conserve las entradas `node_modules/@rolldown/binding-*`.

## Estructura

```
app/(auth)/            Login, registro, recuperar y nueva contraseña
app/(main)/            Pantallas con barra inferior (Inicio, cuentas, ahorros, reportes…)
app/(form)/            Formularios a pantalla completa en móvil
app/api/cron/          Tarea programada (jobs + push)
components/            UI base (ui/), layout, y componentes por sección
lib/                   Lógica de dominio, acciones de servidor (actions/) y lecturas (data/)
supabase/migrations/   Esquema, RLS, funciones y jobs
supabase/tests/        Pruebas SQL con PGlite
e2e/                   Playwright
```

## Decisiones respecto al plan

- **Contraste:** el texto secundario sobre la franja roja usa `#FEE2E2` en vez de `#FECACA` (4.47:1, no llega
  a AA). `#FECACA` se mantiene en la barra del logo.
- **Navegación:** la barra inferior se usa hasta 1023 px; el menú lateral desde 1024 px.
- **Transferencias y aportes** no dejan una cuenta en negativo (salvo tarjetas de crédito), igual que el
  ahorro programado.
- **Tarjetas bimoneda:** una tarjeta con deuda en lempiras y en dólares se guarda como dos cuentas
  `credit_card`, una por moneda (la segunda apunta a la principal con `paired_account_id`). La app las muestra
  como una sola tarjeta con las dos deudas; al registrar un gasto o transferir aparecen por separado
  ("Visa · Lempiras" y "Visa · Dólares") para elegir en qué moneda se cargó.
- **Ahorro programado a una cuenta:** cada aporte es una transferencia normal ("Ahorro programado"), no cuenta
  como gasto y aparece en Movimientos. Las dos cuentas deben ser de la misma moneda.
- **Gasto fijo con monto variable:** siempre queda pendiente para indicar el monto real; no se registra solo.
- **Tasa de cambio:** se escribe como lempiras por 1 dólar.
- **Reportes y presupuestos** se calculan en lempiras; los gastos en dólares se indican aparte.
- Agregados sin diseño: Movimientos, Perfil (nombre, zona horaria, avisos), Notificaciones, Nueva meta,
  Aportar y el formulario de presupuesto.
