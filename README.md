# Mis Finanzas

App web responsiva de finanzas personales. Next.js 16 (App Router, Cache Components) + Supabase + Tailwind v4.
El plan de implementación está en [`PLAN.md`](PLAN.md) y los diseños de referencia en [`disenos/`](disenos/).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completa con los datos de tu proyecto de Supabase
npm run dev                  # http://localhost:3000
```

- `/`: página de muestra de Inicio (datos de ejemplo hasta la Fase 2)
- `/dev/ui`: catálogo de componentes (solo en desarrollo)

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript estricto |
| `npm test` | Tests unitarios y de componentes (Vitest) |
| `npm run test:e2e` | Pruebas E2E en móvil y escritorio (Playwright). La primera vez: `npx playwright install chromium` |

Para generar capturas de las pantallas: `SCREENSHOTS=1 npx playwright test screenshots` (quedan en `test-results/capturas/`).

## Estructura

```
app/(app)/            Pantallas privadas dentro del AppShell
components/layout/    AppShell, Sidebar, BottomNav, Logo, rutas del menú
components/ui/        Componentes base (Button, Field, Select, MoneyInput…)
lib/money.ts          Montos en centavos: formato es-HN y lectura de lo que escribe la persona
lib/supabase/         Clientes de Supabase para servidor y navegador
lib/accounts/meta.ts  Tipos de cuenta, íconos y paleta de colores
```

## Notas

- **Montos:** siempre enteros en centavos. Usa `formatMoney` / `<Money>` para mostrarlos y `<MoneyInput>` para capturarlos.
- **Cache Components está activo:** cualquier componente que lea `cookies()` (por ejemplo, el cliente de Supabase del servidor) debe ir dentro de un `<Suspense>`.
- **npm y rolldown (Vitest):** si `npm test` falla con *Cannot find native binding*, es el bug de npm con dependencias opcionales ([npm/cli#4828](https://github.com/npm/cli/issues/4828)). Borra `node_modules` y `package-lock.json` y vuelve a correr `npm install`. Revisa que el lockfile siga incluyendo las entradas `node_modules/@rolldown/binding-*` después de agregar paquetes.
