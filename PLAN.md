# Mis Finanzas: plan de implementación

Este documento es para Claude Code. Describe qué construir, en qué orden y con qué reglas. Los diseños de referencia están en `disenos/`: un archivo `.dc.html` por pantalla.

## Cómo trabajar con este plan

- Trabaja **por fases, en orden**. Al terminar cada fase, corre lint, typecheck y tests, haz commit y resume lo hecho antes de seguir.
- **Antes de crear o cambiar tablas en Supabase**, muestra la migración y espera aprobación.
- Si el repositorio ya tiene código de Mis Finanzas, **adáptalo en lugar de reescribirlo**. Primero revisa la estructura existente y propón cómo encaja este plan.
- Los diseños son la referencia visual. Copia la estructura, los espacios, los colores y los textos, pero escribe componentes React propios. **No copies el runtime de los `.dc.html`** (`<x-dc>`, `support.js`, `DCLogic`).
- Los textos de la interfaz van en **español**. Los montos de ejemplo de los diseños (`L 0.00`, `[Banco]`, `[límite]`) son marcadores: en la app salen de los datos reales.

## Stack

- **Next.js** (App Router) + **TypeScript** estricto
- **Supabase**: Postgres, Auth y Row Level Security
- **Tailwind CSS** con los tokens de abajo
- Formularios: React Hook Form + Zod
- Fechas: date-fns con locale `es`
- Tests: Vitest para la lógica de negocio y Playwright para los flujos principales
- Tareas programadas: Supabase `pg_cron` + funciones SQL, o Edge Functions

Es **una sola app web responsiva**:
- Menos de 768 px: barra de navegación inferior con el botón central "Registrar gasto".
- 1024 px o más: menú lateral, con "Registrar gasto" como píldora arriba.

Hacerla instalable (PWA) es opcional.

## Sistema de diseño

| Token | Valor | Uso |
|---|---|---|
| `primary` | `#B91C1C` | Marca, botón principal, franjas superiores |
| `primary-dark` | `#7F1D1D` | Hover de enlaces |
| `primary-soft` | `#FEF2F2` | Ítem activo del menú lateral |
| `on-primary-muted` | `#FECACA` | Texto secundario sobre fondo rojo |
| `ink` | `#18181B` | Texto principal |
| `ink-2` | `#3F3F46` / `#52525B` | Texto secundario |
| `muted` | `#71717A` | Texto terciario |
| `line` | `#E4E4E7` / `#D4D4D8` | Bordes y campos |
| `surface` | `#FAFAF9` / `#F4F4F5` | Tarjetas de resumen, controles segmentados |
| `warn` | `#B45309` (texto), `#D97706` (barra), `#FFFBEB` / `#FCD34D` (aviso) | Errores y alertas. **Nunca rojo**, para no confundirse con la marca |

- **Colores de cuenta y categoría:** `#0F766E`, `#1D4ED8`, `#6D28D9`, `#334155`, `#A16207`, `#BE185D`
- **Tipografía:** Geist para la interfaz y **Geist Mono para todos los montos, fechas cortas y etiquetas en mayúsculas**. Usa `next/font/google`.
- **Radios:** campos y botones 8 px, tarjetas 12–14 px, hojas y tarjetas de login 24–28 px (solo esquinas superiores), píldoras 999 px.
- **Patrón de pantalla:** franja superior roja con título y cifra principal, y debajo una hoja blanca con `border-radius: 28px 28px 0 0` que se monta sobre la franja.
- **Reglas:** sin gradientes, sin sombras decorativas, sin emojis. Íconos de línea con trazo de 1.75 (por ejemplo `lucide-react`). Áreas táctiles de al menos 44 px. Contraste AA.
- **Moneda:** guarda los montos como enteros en centavos (`bigint`). Formatea con `Intl.NumberFormat('es-HN')`: `L 1,234.50` y `$ 1,234.50`.

## Modelo de datos (Supabase)

Todas las tablas llevan `user_id uuid references auth.users` y una **política RLS de "solo el dueño"** para select, insert, update y delete.

```
accounts           id, user_id, name, type (savings|checking|credit_card|cash),
                   bank_name, currency (HNL|USD), color, include_in_total bool,
                   initial_balance_cents, archived_at, created_at

categories         id, user_id, name, icon, color, kind (expense|income)
                   -- se crean las categorías por defecto al registrarse

transactions       id, user_id, account_id, category_id null, kind (expense|income|transfer_out|transfer_in|goal_contribution),
                   amount_cents (>0), occurred_on date, note, transfer_id null,
                   recurring_id null, goal_id null, created_at

transfers          id, user_id, from_account_id, to_account_id, amount_cents,
                   to_amount_cents, exchange_rate numeric null, occurred_on, note
                   -- crea 2 transactions (out/in) en una sola función SQL transaccional

savings_goals      id, user_id, name, icon, color, target_cents, target_date null,
                   currency, archived_at

savings_schedules  id, user_id, goal_id, account_id, mode (fixed|percent),
                   amount_cents null, percent numeric null, frequency (weekly|biweekly|monthly),
                   days int[] (ej. {15,-1} = día 15 y último día), ends (on_goal|on_date|never),
                   end_date null, active bool, next_run_on date

recurring_charges  id, user_id, kind (subscription|fixed), name, icon, color,
                   account_id, category_id, amount_cents, is_variable bool,
                   frequency (weekly|monthly|yearly), day_rule, next_charge_on date,
                   remind_days_before int null, auto_register bool, active bool

budgets            id, user_id, category_id, month date (primer día), limit_cents
```

- **Saldo de una cuenta** = `initial_balance_cents` + ingresos + `transfer_in` − gastos − `transfer_out` − `goal_contribution`. Créalo como **vista SQL** (`account_balances`), no como columna.
- **Ahorrado en una meta** = suma de sus `goal_contribution`.

## Reglas de negocio (con tests unitarios)

1. **Las transferencias no son gasto ni ingreso.** Se excluyen de los totales del mes, de los reportes y de los presupuestos.
2. **Transferencia entre monedas distintas:** pide la tasa de cambio y guarda los dos montos.
3. **Total en Inicio:** suma solo las cuentas con `include_in_total`. Lempiras y dólares se muestran por separado; no se suman sin una tasa.
4. **Ahorro programado por porcentaje:** se aplica sobre los ingresos (`kind = income`) que entraron a la cuenta **desde el aporte anterior**. Si no hubo ingresos, no se aparta nada y no se crea el movimiento.
5. **Ahorro programado sin saldo suficiente:** se omite el aporte y se notifica. Nunca deja la cuenta en negativo, salvo las tarjetas de crédito.
6. **Fin del ahorro programado:** con "Cuando complete la meta", se desactiva solo al llegar a `target_cents`.
7. **Días como "último día del mes"** (`-1`) deben funcionar en febrero y en meses de 30 días.
8. **Gasto fijo con `auto_register`:** el día del cobro se crea la transacción. Si no tiene `auto_register`, se crea una pendiente de confirmar. Con `is_variable`, el monto es un estimado y se puede editar al confirmar.
9. **Estado del presupuesto:** menos del 80 % es "Vas bien"; del 80 % al 100 % es "Cerca del límite" (ámbar); más del 100 % es "Te pasaste del límite" (barra ámbar llena).
10. **"Quedan N días"** se calcula hasta el último día del mes en la zona horaria del usuario (`America/Tegucigalpa` por defecto).

## Pantallas y rutas

| Ruta | Diseño móvil | Diseño web |
|---|---|---|
| `/login` | `Movil`, `Movil-error` | `Main` |
| `/` (Inicio) | `Inicio-cuentas` (y `Inicio` para el estado vacío) | `Web-inicio` |
| `/cuentas` | `Mis-cuentas` | `Web-cuentas` |
| `/cuentas/nueva` | `Nueva-cuenta` | `Web-nueva-cuenta` |
| `/transferir` | `Transferir` | `Web-transferir` |
| `/ahorros` | `Ahorros` | `Web-ahorros` |
| `/ahorros/programar` | `Ahorro-programado` | `Web-ahorro-programado` |
| `/gastos-fijos` | `Gastos-fijos` | `Web-gastos-fijos` |
| `/gastos-fijos/nuevo` | `Nuevo-gasto-fijo` | `Web-nuevo-gasto-fijo` |
| `/presupuestos` | `Presupuestos` | `Web-reportes` (columna izquierda) |
| `/reportes` | `Reportes` | `Web-reportes` |
| `/registrar` | *(sin diseño, ver Fase 2)* | *(sin diseño)* |

- En móvil, los formularios se ven a pantalla completa con el botón principal fijo abajo.
- En web, los formularios van a dos columnas con vista previa o resumen a la derecha.

## Fases

### Fase 0: Base
- Proyecto Next.js + Tailwind con los tokens, las fuentes Geist y el cliente de Supabase (servidor y navegador).
- `AppShell` responsivo: `BottomNav` con el botón central y `Sidebar`.
- Componentes base: `Button`, `Field`, `Select`, `SegmentedControl`, `Switch`, `MoneyInput`, `Money`, `ProgressBar`, `AccountTile`, `Sheet` (hoja blanca redondeada) y `PageHeader` (franja roja).
- **Listo cuando:** se ve una página de muestra con todos los componentes y Storybook o una ruta `/dev/ui` los muestra.

### Fase 1: Autenticación
- Login con correo y contraseña, más Google y Facebook (Supabase OAuth) con los **logos oficiales** de cada marca.
- Mostrar/ocultar contraseña, recuperar contraseña, registro.
- Estado de error en ámbar con ícono, como en `Movil-error`.
- Middleware que protege las rutas privadas.
- **Listo cuando:** un usuario se registra, entra y sale. Las rutas privadas redirigen a `/login`.

### Fase 2: Cuentas y movimientos
- Migración de `accounts`, `categories`, `transactions` y la vista `account_balances`, con RLS.
- `/cuentas`, `/cuentas/nueva` y edición/archivo de cuentas.
- **Inicio:** selector "Todas las cuentas", fila o cuadrícula de cuentas, totales del mes y últimos movimientos.
- **Registrar gasto:** no tiene diseño aún. Hacerlo con el mismo patrón de formulario: monto grande, categoría, cuenta (con la última usada preseleccionada), fecha y nota. Se abre desde el botón central o la píldora.
- **Listo cuando:** se crean cuentas, se registran gastos y los saldos y totales cuadran. Hay tests de la vista de saldos.

### Fase 3: Transferencias
- Tabla `transfers` y función SQL `create_transfer()` atómica.
- Pantalla `/transferir` con intercambio de cuentas, "Todo el saldo" y tasa de cambio cuando las monedas difieren.
- **Listo cuando:** se cumplen las reglas 1–2 y las transferencias no aparecen en gastos ni en reportes.

### Fase 4: Ahorros
- `savings_goals` y aportes (Aportar = `goal_contribution` desde una cuenta).
- `savings_schedules` con monto fijo o porcentaje.
- Job diario que ejecuta los aportes que vencen y recalcula `next_run_on`.
- Pantallas `/ahorros` (metas, programados con interruptor de pausa, aportes recientes) y `/ahorros/programar` con el resumen de los próximos 3 aportes.
- **Listo cuando:** se cumplen las reglas 4–7, con tests de fechas (fin de mes, febrero, año bisiesto).

### Fase 5: Suscripciones y gastos fijos
- `recurring_charges` y job diario de cobros y recordatorios.
- Lista con filtro, aviso de "cobros en los próximos 7 días" y formulario.
- **Listo cuando:** se cumple la regla 8 y los gastos pendientes se pueden confirmar o descartar.

### Fase 6: Presupuestos y reportes
- `budgets` por categoría y mes.
- Pantallas de presupuestos con estados y navegación entre meses.
- Reportes: ingresos contra gastos, barras de los últimos 6 meses (mes actual en `primary`), distribución por categoría (barra apilada en móvil, dona en web) y exportar a CSV.
- Para las gráficas, usa Recharts o SVG propio, respetando los colores de categoría.
- **Listo cuando:** se cumplen las reglas 9–10 y los totales de reportes cuadran con los movimientos.

### Fase 7: Pulido
- Estados vacíos y de carga (skeletons) en cada pantalla.
- Revisión de accesibilidad: etiquetas, foco visible, `aria-current` en la navegación, roles de las barras de progreso.
- Notificaciones de recordatorios: push web o correo.
- Pruebas E2E de los flujos: registro → crear cuenta → registrar gasto → transferir → programar ahorro.

## Fuera de alcance por ahora
- Conexión directa con bancos
- Multiusuario o cuentas compartidas
- Modo oscuro
