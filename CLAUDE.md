# CLAUDE.md — HUB Digital (Innovative Group)

> P0 PRODUCTION — Revenue directo, clientes lo usan diario. Reglas globales en `~/.claude/CLAUDE.md`. Stack JS en `~/.claude/STACK.md`.

## Commands

```bash
npm run dev          # Dev server (Express + Vite HMR, port 4000)
npm run build        # Production build
npm run check        # TypeScript typecheck (tsc --noEmit)
npm run db:push      # Push schema changes (drizzle-kit push)
```

IMPORTANT: Always run `npm run check` after changes across multiple files.

## Architecture — Module System

```
client/src/features/[module]/     ←→     server/modules/[module]/
        ↑                                        ↑
    page.tsx, components               routes.ts, storage.ts, service.ts
        ↑                                        ↑
    shared/schema/[module].ts  (Drizzle + Zod — source of truth)
```

- **Module Loader**: `server/module-loader.ts` auto-discovers modules from `module.json`
- **Module Registry**: `server/module-registry.ts` — static imports (auto-generated, DO NOT edit)
- **Sidebar**: Dynamic nav from `GET /api/modules`

### Installed Modules

| Module | Frontend | Backend | What it does |
|--------|----------|---------|-------------|
| auth | `features/auth/` | `modules/auth/` | JWT login, roles, bcrypt passwords |
| comercial | `features/comercial/` | `modules/comercial/` | CRM pipeline: prospectos, leads, propuestas, alerts |
| dashboard | `features/dashboard/` | `modules/dashboard/` | Sales metrics, KPI overview |
| operaciones | `features/operaciones/` | `modules/operaciones/` | Documents, surveys, waste tracking |
| subproductos | `features/subproductos/` | `modules/subproductos/` | Service clients, traceability, reports |
| kpis | `features/kpis/` | `modules/kpis/` | Team performance metrics |
| settings | `features/settings/` | `modules/settings/` | Admin user management |
| nova | `features/nova/` | `modules/nova/` | Nova AI chat proxy |

### Adding a New Module
1. Create `server/modules/[name]/module.json` (metadata: displayName, icon, basePath, apiPrefix)
2. Create `server/modules/[name]/routes.ts` (Express router)
3. Add router import to `server/module-registry.ts`
4. Create `shared/schema/[name].ts` (Drizzle tables + Zod validators)
5. Create `client/src/features/[name]/page.tsx`
6. Add route to `client/src/App.tsx`

## Key Files

| File | What it does |
|------|-------------|
| `server/index.ts` | Express entry point (port 4000), rate limiting, CSP |
| `server/module-loader.ts` | Module auto-discovery from module.json |
| `server/module-registry.ts` | Static router imports (auto-generated) |
| `server/middleware/auth.ts` | JWT verification, role checks, token generation |
| `server/utils/errors.ts` | Type-safe error helpers (`getErrorMessage`, `isErrorWithMessage`) |
| `server/db.ts` | Drizzle ORM + Neon PostgreSQL |
| `client/src/App.tsx` | Main router (Wouter + ProtectedRoute + lazy loading) |
| `client/src/lib/auth.tsx` | AuthProvider (JWT token management) |
| `client/src/lib/queryClient.ts` | React Query + `apiRequest()` |
| `shared/schema/comercial.ts` | CRM schema (prospects, leads, proposals, alerts, JSONB Zod schemas) |
| `shared/schema/common.ts` | Users, companies, areas |

## Critical Business Logic

### Commercial Pipeline (core revenue flow)
- Stages: contacto_inicial → presentacion → levantamiento → propuesta → negociacion → cierre_ganado / cierre_perdido
- Lead sources: referencia, web, evento, redes_sociales, cold_call, otro
- Levantamientos (surveys): waste types, infrastructure, current services, needs
- Documents have expiration tracking with alerts at 30/60/90 days
- Proposals follow status workflow: borrador → enviada → revisada → aceptada / rechazada
- Alerts: overdue_follow_up, stale_prospect, high_value_at_risk, scheduled_reminder

### Nova AI Connection
- Nova AI is a SEPARATE service (not embedded in this repo)
- Connection via `NOVA_API_URL` + `NOVA_API_KEY` env vars
- `server/modules/nova/routes.ts` proxies requests to Nova Gateway
- Frontend uses `<NovaChat />` component

## Code Style

- ES modules, named exports (default only for pages)
- Wouter for routing (NOT React Router)
- `apiRequest()` for all API calls (never raw fetch)
- TanStack React Query for server state
- Drizzle ORM for database (never raw SQL in app code)
- Zod schemas with `max()` on strings
- Lucide React for icons
- shadcn/ui components only
- `catch (error: unknown)` — never `catch (error: any)`. Use `getErrorMessage()` / `isErrorWithMessage()` from `server/utils/errors.ts`
- Drizzle enum casts use `Model["field"]` type (e.g., `Survey["status"]`), never `as any`

## Brand Identity

- **Client**: Innovative Group
- **Primary**: Blue #0067B0
- **Sidebar**: Dark green #1B5E20 + bright green #7BC043
- **Success**: #61CE70
- **Font**: Roboto
- Color tokens in `client/src/index.css` as HSL custom properties

## Security & Performance (Hardened 2026-05-03)

- **Rate limiting**: Global 100 req/min on `/api` (express-rate-limit). Auth routes have stricter limits (5/15min login, 3/hr register).
- **CSP**: `unsafe-eval` removed from scriptSrc. Nonce-based eval not needed by Vite in production.
- **JWT audit**: Failed token verifications logged with `console.warn('[auth]')` for monitoring.
- **FK indexes**: 94 indexes total (45 added). All FK columns indexed for JOIN performance.
- **Code splitting**: Dashboard, Operaciones, Subproductos, Settings, Profile lazy-loaded via `React.lazy()`.
- **N+1 fixed**: `getKpis()` and `getKpiSummary()` batch-load entries/categories in 2 queries instead of 2N.
- **JSONB validation**: `levantamientoData`, `attendees`, `metadata` have Zod schemas with `.passthrough()`.
- **Type safety**: All route `catch` blocks use `error: unknown` with helpers from `server/utils/errors.ts`.

## Gotchas

- Default port is 4000 (macOS AirPlay blocks 5000)
- `module-registry.ts` is auto-generated — do NOT edit manually
- `dotenv/config` imported at top of server/index.ts — required for .env loading
- Nova connector env vars (NOVA_API_URL, NOVA_API_KEY, NOVA_TENANT_ID) warn if unset — expected until connected
- Comercial module has 60+ endpoints — read relevant section before editing
- `db:push` may show divergences (columns in DB not in schema) — use direct SQL for additive-only changes when in doubt
- Schema-DB divergence: `prospects.surveyId` cannot have FK to `surveys` (circular import between comercial↔operaciones)

## What NOT To Do

- Don't edit `server/module-registry.ts` manually
- Don't use react-router-dom — this uses Wouter
- Don't use raw fetch — use `apiRequest()`
- Don't use useState for server data — use React Query
- Don't skip Zod validation on routes
- Don't push to main without verifying build
- Don't use EcoNova branding — this is Innovative Group's brand
- Don't use `catch (error: any)` — use `catch (error: unknown)` with error helpers
- Don't use `as any` for Drizzle enum comparisons — use `Model["field"]` types

## Production

- **Deploy**: Railway auto-deploy from main
- **Repo**: /Users/danielreyes/Innovative
- **GitHub**: github.com/DanielReyesF2/innovative-platform
