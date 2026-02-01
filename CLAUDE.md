# Commands

```bash
npm run dev          # Dev server (Express + Vite HMR)
npm run build        # Production build
npm run check        # TypeScript typecheck (tsc --noEmit)
npm run db:push      # Push schema changes (drizzle-kit push)
```

IMPORTANT: Always run `npm run check` after making changes across multiple files.

# Code Style

- ES modules, named exports (default only for pages)
- Wouter for routing, NOT React Router
- `apiRequest()` for all API calls, never raw fetch
- TanStack React Query for server state
- Drizzle ORM for database, never raw SQL
- Zod for validation with max() on strings
- Lucide React for icons
- shadcn/ui components only
- Path aliases: `@/*` -> `client/src/`, `@shared/*` -> `shared/`

# Architecture

- Frontend features: `client/src/features/[module]/`
- Backend modules: `server/modules/[module]/`
- Shared schemas: `shared/schema/[module].ts`
- Each module is self-contained: routes, storage, service, components
- module-loader.ts auto-discovers and mounts module routes from module.json
- module-registry.ts statically imports all routers (generated, do not edit)
- Sidebar reads from GET /api/modules for dynamic navigation

# Installed Modules

- auth
- dashboard
- comercial
- operaciones
- subproductos
- nova-connector

# Nova AI Connection

- Nova AI is a SEPARATE centralized service (not embedded)
- This platform connects to Nova via NOVA_API_URL + NOVA_API_KEY
- server/modules/nova/ proxies requests to Nova API Gateway
- Frontend uses <NovaChat /> component for AI interaction

# Business Rules

[Add project-specific business rules here]

# Gotchas

- server/module-registry.ts is auto-generated — do not edit manually
- If you add a new module, add its router import to module-registry.ts and its page route to App.tsx
