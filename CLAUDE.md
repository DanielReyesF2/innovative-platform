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
- settings
- kpis

# Nova AI Connection

- Nova AI is a SEPARATE centralized service (not embedded)
- This platform connects to Nova via NOVA_API_URL + NOVA_API_KEY
- server/modules/nova/ proxies requests to Nova API Gateway
- Frontend uses <NovaChat /> component for AI interaction

# Brand Identity

- **Client**: Innovative Group (innovativegroup-la.com)
- **Industry**: Waste management, recycling, circular economy
- **Primary color**: Blue #0067B0 (buttons, CTAs, links)
- **Sidebar**: Dark green #1B5E20 with bright green #7BC043 accents
- **Success green**: #61CE70
- **Font**: Roboto (Google Fonts)
- **Favicon**: Green leaf SVG on dark green background
- **Login**: Green gradient background with branded card

Color tokens are defined in `client/src/index.css` as HSL CSS custom properties.

# Business Rules

- Prospectos flow through stages: contacto_inicial -> presentacion -> levantamiento -> propuesta -> negociacion -> cierre_ganado / cierre_perdido
- Leads sourced from: referencia, web, evento, redes_sociales, cold_call, otro
- Levantamientos (surveys) track: waste types, infrastructure, current services, needs
- Documents have expiration tracking with alerts at 30/60/90 days
- Subproductos reports follow status workflow: pendiente -> en_proceso -> completado -> enviado
- Traceability records calculate diversion rates (diverted tons / total tons)

# Gotchas

- server/module-registry.ts is auto-generated — do not edit manually
- If you add a new module, add its router import to module-registry.ts and its page route to App.tsx
- Default port is 4000 (macOS AirPlay uses 5000)
- `dotenv/config` is imported at top of server/index.ts — required for .env loading
- Nova connector env vars (NOVA_API_URL, NOVA_API_KEY, NOVA_TENANT_ID) show warnings if unset — expected until Nova AI is connected
- Login field is `username` (not `email`) in POST /api/auth/login body
- Traceability has no list-all endpoint — query by client (`/traceability/client/:id`) or period (`/traceability/period/:period`)
- Admin user created via `npx tsx scripts/create-admin.ts` (needs DATABASE_URL env var set)
- **Stage ID vs Business Label Mismatch (deuda técnica)**: DB stage IDs don't match business names. KANBAN_STAGES labels reflect the BUSINESS flow: `contacto_inicial`="Lead", `presentacion`="Prospecto", `levantamiento`="Reunión", `propuesta`="Levantamiento", `negociacion`="Propuesta". Code referencing `stage === 'propuesta'` is actually checking for the "Levantamiento" business stage.

# Deployment — Innovative's Own Servers

Innovative Group deploys on their own infrastructure (not Railway/Docker).

## Requirements

- Node.js 20+
- PostgreSQL 15+ (their own instance or managed like Neon/Supabase)
- Reverse proxy (Nginx recommended) for HTTPS

## Environment Variables (.env)

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
JWT_SECRET=<64-char-random-hex>        # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=<64-char-random-hex>
NODE_ENV=production
PORT=5000

# Nova AI (set when ready to connect)
NOVA_API_URL=https://nova-gateway.railway.app
NOVA_API_KEY=sk-nova-xxx
NOVA_TENANT_ID=innovative-group
```

## Build & Deploy Steps

```bash
npm ci                    # Install dependencies (clean)
npm run check             # TypeScript validation
npm run db:push           # Create/update database tables
npx tsx scripts/create-admin.ts   # Create admin user (first deploy only)
npm run db:seed           # Load seed data (first deploy only)
npm run build             # Vite frontend + esbuild server → /dist/
npm start                 # NODE_ENV=production node dist/index.js
```

## Production Architecture

```
dist/
  index.js          ← Express server bundle (esbuild, ESM)
  public/           ← Vite-built React SPA
    index.html
    assets/
```

Server binds to `0.0.0.0:PORT` and serves static files from `dist/public/` in production mode. Non-API routes fall back to `index.html` (SPA routing).

## Process Management

Use PM2 or systemd to keep the process running:

```bash
# PM2
pm2 start dist/index.js --name innovative-platform
pm2 save && pm2 startup

# Or systemd service (see docs)
```

## Nginx Reverse Proxy Example

```nginx
server {
    listen 443 ssl;
    server_name app.innovative-la.com;

    ssl_certificate /etc/ssl/certs/innovative.crt;
    ssl_certificate_key /etc/ssl/private/innovative.key;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;  # SSE/WebSocket support
    }
}
```

## Seed Data Workflow

Edit JSON files in `scripts/data/` → run `npm run db:seed`. Safe to re-run (idempotent).

- `scripts/data/users.json` — Team members and areas
- `scripts/data/comercial.json` — Prospects, leads, rejection reasons, sales metrics
- `scripts/data/operaciones.json` — Documents, surveys
- `scripts/data/subproductos.json` — Service clients, traceability, reports

To reset: `npx tsx scripts/reset-db.ts` (truncates all tables)
