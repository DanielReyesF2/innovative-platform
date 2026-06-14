# Bandeja de Cotización (Subproductos v1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando Luis aprueba un levantamiento en `operaciones`, el levantamiento aterriza automáticamente en una bandeja del módulo `subproductos` donde el equipo de soporte comercial (Sandra/Anahí/Cristina) lo cotiza, lo manda a VoBo y lo aprueba — con KPI de tiempos.

**Architecture:** Se extiende la tabla existente `economicModels` (el modelo económico ES la cotización/propuesta) con un ciclo de vida (`recibido → en_cotizacion → en_vobo → aprobado/rechazado`), referencias al levantamiento (`surveyId`, `surveyVersionId` — columnas enteras **sin FK dura** para evitar el import circular operaciones↔subproductos), y timestamps por etapa. El disparador se engancha en `approveSurvey()` de operaciones con un import unidireccional a subproductos, envuelto en try/catch para no romper la aprobación.

**Tech Stack:** TypeScript, Drizzle ORM + Neon Postgres, Express, React + TanStack Query + Wouter + shadcn/ui, Zod.

**Spec:** `docs/superpowers/specs/2026-06-13-subproductos-bandeja-cotizacion-design.md`

---

## ⚠️ Nota sobre validación (este repo NO tiene framework de tests)

`package.json` solo tiene `check` (`tsc --noEmit`) y `lint` (`biome`). No hay vitest/jest. Por eso la skill writing-plans se adapta: **cada tarea valida con `npm run check` + `npm run lint` y, donde aplica, verificación manual del flujo en la app corriendo** (`npm run dev`, puerto 4000). NO se escriben unit tests (CLAUDE.md §8: no asumir tests).

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `shared/schema/subproductos.ts` | Tabla `economicModels` extendida + `cotizacionStatusEnum` + Zod | Modificar |
| `shared/auth/permissions.ts` | Permisos `cotizaciones.*` + asignación a roles | Modificar |
| `scripts/migrate-cotizacion.sql` | Migración SQL reversible (enum + columnas) | Crear |
| `server/modules/subproductos/storage.ts` | Funciones de la bandeja/cotización | Modificar |
| `server/modules/subproductos/routes.ts` | Endpoints de cotización + Zod | Modificar |
| `server/modules/operaciones/storage.ts` | Disparador en `approveSurvey()` | Modificar |
| `client/src/features/subproductos/api.ts` | Hooks React Query de cotización | Modificar |
| `client/src/features/subproductos/page.tsx` | Pestaña "Cotizaciones" (bandeja) | Modificar |
| `client/src/features/subproductos/components/CotizacionDetail.tsx` | Detalle dos columnas | Crear |

---

## Task 0: Pre-flight — rama y estado real de datos

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Confirmar rama de trabajo**

Run: `git branch --show-current`
Expected: `subproductos-module-comercial` (árbol limpio). Si no, NO continuar — alinear con Daniel.

- [ ] **Step 2: Ver datos reales en `economic_models` antes de migrar (CLAUDE.md §5.5)**

Run (vía cliente psql de solo-lectura o script de inspección existente):
```sql
SELECT count(*) AS total, array_agg(DISTINCT status) AS estados FROM economic_models;
```
Expected: anota el resultado. Si `total = 0`, la conversión de enum es trivial. Si hay filas, el mapeo del Step de migración (Task 2) las preserva. **Si aparece un `status` distinto a `borrador/enviada/aprobada/rechazada`, PARAR y reportar a Daniel** (el mapeo no lo cubre).

---

## Task 1: Schema — extender `economicModels` + enum + permisos

**Files:**
- Modify: `shared/schema/subproductos.ts`
- Modify: `shared/auth/permissions.ts`

- [ ] **Step 1: Agregar el enum de estado de cotización**

En `shared/schema/subproductos.ts`, debajo de `reportStatusEnum` (línea ~18), agregar:
```typescript
export const cotizacionStatusEnum = pgEnum("cotizacion_status", [
  "recibido",
  "en_cotizacion",
  "en_vobo",
  "aprobado",
  "rechazado",
]);
```

- [ ] **Step 2: Extender la tabla `economicModels`**

Reemplazar el bloque `status: text("status").default("borrador"), ...` y agregar columnas. La tabla `economicModels` queda (solo se muestran los cambios — añadir columnas nuevas y cambiar `status`):
```typescript
export const economicModels = pgTable(
  "economic_models",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").references(() => serviceClients.id),
    prospectName: text("prospect_name"),
    title: text("title").notNull(),
    monthlyVolume: text("monthly_volume"),
    proposedPrice: numeric("proposed_price", { precision: 12, scale: 2 }),
    estimatedCost: numeric("estimated_cost", { precision: 12, scale: 2 }),
    estimatedMargin: numeric("estimated_margin", { precision: 5, scale: 2 }),
    servicesIncluded: jsonb("services_included"),
    wasteComposition: jsonb("waste_composition"),
    // --- Bandeja de cotización (v1) ---
    status: cotizacionStatusEnum("status").notNull().default("recibido"),
    surveyId: integer("survey_id"), // sin FK dura (evita ciclo operaciones↔subproductos)
    surveyVersionId: integer("survey_version_id"), // snapshot aprobado a cotizar
    assignedToId: integer("assigned_to_id").references(() => users.id),
    voboById: integer("vobo_by_id").references(() => users.id),
    rejectionReason: text("rejection_reason"),
    needsReview: boolean("needs_review").default(false),
    receivedAt: timestamp("received_at"),
    startedAt: timestamp("started_at"),
    submittedToVoboAt: timestamp("submitted_to_vobo_at"),
    resolvedAt: timestamp("resolved_at"),
    // --- legacy ---
    approvedBy: text("approved_by"),
    approvedDate: timestamp("approved_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    clientIdIdx: index("economic_models_client_id_idx").on(table.clientId),
    surveyIdIdx: index("economic_models_survey_id_idx").on(table.surveyId),
    statusIdx: index("economic_models_status_idx").on(table.status),
  }),
);
```
Importar `users` arriba: `import { users } from "./common";` (verificar que `common.ts` exporta `users`; ya lo usa operaciones.ts). Asegurar que `pgEnum`, `boolean`, `index` estén importados (ya lo están).

- [ ] **Step 3: Actualizar el Zod insert schema de economicModels**

Reemplazar `insertEconomicModelSchema` para incluir los campos editables y omitir los de sistema:
```typescript
export const insertEconomicModelSchema = createInsertSchema(economicModels, {
  title: z.string().min(1).max(300),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  receivedAt: true,
  startedAt: true,
  submittedToVoboAt: true,
  resolvedAt: true,
});
```

- [ ] **Step 4: Agregar permisos al catálogo**

En `shared/auth/permissions.ts`, dentro de `PERMISSIONS`, agregar:
```typescript
  COTIZACIONES_VIEW: "cotizaciones.view",
  COTIZACIONES_EDIT: "cotizaciones.edit",
  COTIZACIONES_VOBO: "cotizaciones.vobo",
```
En `ROLE_PERMISSIONS`, añadir a `director` (después de `P.SURVEYS_REOPEN,`):
```typescript
    P.COTIZACIONES_VIEW,
    P.COTIZACIONES_EDIT,
    P.COTIZACIONES_VOBO,
```
Y a `comercial` (el rol de Sandra/Anahí/Cristina), reemplazar su lista por:
```typescript
  comercial: [P.PROSPECTS_DELETE, P.PROSPECTS_SEND_OPS, P.TEAM_VIEW, P.COTIZACIONES_VIEW, P.COTIZACIONES_EDIT],
```

- [ ] **Step 5: Typecheck**

Run: `npm run check`
Expected: PASS (0 errores). Si falla por `users` no exportado, ajustar el import.

- [ ] **Step 6: Commit**

```bash
git add shared/schema/subproductos.ts shared/auth/permissions.ts
git commit -m "feat(subproductos): schema bandeja cotización + permisos cotizaciones.*"
```

---

## Task 2: Migración SQL reversible (CLAUDE.md §5.5)

**Files:**
- Create: `scripts/migrate-cotizacion.sql`

> `db:push` (drizzle-kit) NO convierte de forma segura `status text → enum` con datos existentes. Por eso se hace SQL explícito y reversible. Las columnas nuevas son aditivas.

- [ ] **Step 1: Escribir la migración UP + DOWN**

Crear `scripts/migrate-cotizacion.sql`:
```sql
-- UP — Bandeja de cotización (subproductos v1). Reversible (ver DOWN abajo).
BEGIN;

-- 1. Enum de estado
CREATE TYPE cotizacion_status AS ENUM ('recibido','en_cotizacion','en_vobo','aprobado','rechazado');

-- 2. Mapear texto viejo → enum y convertir la columna
ALTER TABLE economic_models ALTER COLUMN status DROP DEFAULT;
ALTER TABLE economic_models
  ALTER COLUMN status TYPE cotizacion_status
  USING (CASE status
    WHEN 'borrador'  THEN 'en_cotizacion'
    WHEN 'enviada'   THEN 'en_vobo'
    WHEN 'aprobada'  THEN 'aprobado'
    WHEN 'rechazada' THEN 'rechazado'
    ELSE 'recibido' END)::cotizacion_status;
ALTER TABLE economic_models ALTER COLUMN status SET DEFAULT 'recibido';
ALTER TABLE economic_models ALTER COLUMN status SET NOT NULL;

-- 3. Columnas aditivas
ALTER TABLE economic_models
  ADD COLUMN IF NOT EXISTS survey_id integer,
  ADD COLUMN IF NOT EXISTS survey_version_id integer,
  ADD COLUMN IF NOT EXISTS assigned_to_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS vobo_by_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_at timestamp,
  ADD COLUMN IF NOT EXISTS started_at timestamp,
  ADD COLUMN IF NOT EXISTS submitted_to_vobo_at timestamp,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp;

-- 4. Índices
CREATE INDEX IF NOT EXISTS economic_models_survey_id_idx ON economic_models(survey_id);
CREATE INDEX IF NOT EXISTS economic_models_status_idx ON economic_models(status);

COMMIT;

-- ============ DOWN (rollback manual) ============
-- BEGIN;
-- DROP INDEX IF EXISTS economic_models_status_idx;
-- DROP INDEX IF EXISTS economic_models_survey_id_idx;
-- ALTER TABLE economic_models
--   DROP COLUMN IF EXISTS received_at, DROP COLUMN IF EXISTS started_at,
--   DROP COLUMN IF EXISTS submitted_to_vobo_at, DROP COLUMN IF EXISTS resolved_at,
--   DROP COLUMN IF EXISTS needs_review, DROP COLUMN IF EXISTS rejection_reason,
--   DROP COLUMN IF EXISTS vobo_by_id, DROP COLUMN IF EXISTS assigned_to_id,
--   DROP COLUMN IF EXISTS survey_version_id, DROP COLUMN IF EXISTS survey_id;
-- ALTER TABLE economic_models ALTER COLUMN status DROP DEFAULT;
-- ALTER TABLE economic_models ALTER COLUMN status TYPE text USING status::text;
-- ALTER TABLE economic_models ALTER COLUMN status SET DEFAULT 'borrador';
-- DROP TYPE IF EXISTS cotizacion_status;
-- COMMIT;
```

- [ ] **Step 2: Aplicar la migración (preguntar a Daniel antes — toca prod, §5.5/§6)**

> **GATE:** esto es un cambio de schema. Confirmar con Daniel antes de correrlo y contra qué DB (dev primero). Aplicar con el cliente psql del entorno correspondiente apuntando a `DATABASE_URL`.

Run: aplicar `scripts/migrate-cotizacion.sql`.
Expected: `COMMIT` sin error.

- [ ] **Step 3: Verificar post-migración**

```sql
\d economic_models
SELECT DISTINCT status FROM economic_models;
```
Expected: columna `status` tipo `cotizacion_status`; columnas nuevas presentes; índices creados; ningún valor de status fuera del enum.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-cotizacion.sql
git commit -m "chore(subproductos): migración SQL reversible bandeja cotización"
```

---

## Task 3: Backend — funciones de storage de cotización

**Files:**
- Modify: `server/modules/subproductos/storage.ts`

- [ ] **Step 1: Importar dependencias del disparador**

Al inicio de `server/modules/subproductos/storage.ts`, ampliar imports:
```typescript
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
```
(Se mantienen los imports existentes de `../../../shared/schema/subproductos`.)

- [ ] **Step 2: Disparador idempotente — crear/actualizar cotización desde levantamiento aprobado**

Agregar al final de la sección Economic Models:
```typescript
// Llamado por operaciones/approveSurvey cuando Luis aprueba un levantamiento.
// Idempotente: un economicModel por surveyId. Si ya existe (reapertura), no pisa
// el trabajo del equipo: actualiza el puntero de versión y prende needsReview.
export async function createCotizacionFromApprovedSurvey(params: {
  surveyId: number;
  surveyVersionId: number;
  clientName: string;
}) {
  const existing = await db.query.economicModels.findFirst({
    where: eq(economicModels.surveyId, params.surveyId),
  });

  if (existing) {
    const [updated] = await db
      .update(economicModels)
      .set({
        surveyVersionId: params.surveyVersionId,
        needsReview: true,
        updatedAt: new Date(),
      })
      .where(eq(economicModels.id, existing.id))
      .returning();
    console.warn(`[subproductos] Cotización ${existing.id} marcada needsReview (levantamiento ${params.surveyId} re-aprobado)`);
    return updated;
  }

  const [created] = await db
    .insert(economicModels)
    .values({
      surveyId: params.surveyId,
      surveyVersionId: params.surveyVersionId,
      prospectName: params.clientName,
      title: `Cotización — ${params.clientName}`,
      status: "recibido",
      receivedAt: new Date(),
    })
    .returning();
  console.log(`[subproductos] Cotización ${created.id} creada desde levantamiento ${params.surveyId}`);
  return created;
}
```

- [ ] **Step 3: Listar la bandeja + detalle**

```typescript
// Bandeja: todas las cotizaciones (opcional filtro por estado), más recientes primero.
export async function getCotizaciones(status?: string) {
  return db.query.economicModels.findMany({
    where: status ? eq(economicModels.status, status as "recibido") : isNotNull(economicModels.surveyId),
    orderBy: [desc(economicModels.receivedAt)],
  });
}

export async function getCotizacionById(id: number) {
  return db.query.economicModels.findFirst({ where: eq(economicModels.id, id) });
}
```

- [ ] **Step 4: Transiciones de estado (cada una sella su timestamp)**

```typescript
// Tomar: recibido → en_cotizacion. Asigna responsable y arranca el sub-cronómetro.
export async function takeCotizacion(id: number, userId: number) {
  const [updated] = await db
    .update(economicModels)
    .set({ status: "en_cotizacion", assignedToId: userId, startedAt: new Date(), updatedAt: new Date() })
    .where(eq(economicModels.id, id))
    .returning();
  return updated;
}

// Guardar campos del modelo económico (precio, costo, margen, composición…).
export async function updateCotizacion(id: number, data: Record<string, unknown>) {
  const [updated] = await db
    .update(economicModels)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(economicModels.id, id))
    .returning();
  return updated;
}

// Enviar a VoBo: en_cotizacion → en_vobo.
export async function submitCotizacionToVobo(id: number) {
  const [updated] = await db
    .update(economicModels)
    .set({ status: "en_vobo", submittedToVoboAt: new Date(), updatedAt: new Date() })
    .where(eq(economicModels.id, id))
    .returning();
  return updated;
}

// Resolver VoBo: aprobar (→aprobado, sella resolvedAt) o rechazar (→en_cotizacion con motivo).
export async function resolveCotizacionVobo(
  id: number,
  userId: number,
  decision: "aprobar" | "rechazar",
  rejectionReason?: string,
) {
  const set =
    decision === "aprobar"
      ? { status: "aprobado" as const, voboById: userId, resolvedAt: new Date(), updatedAt: new Date() }
      : {
          status: "en_cotizacion" as const,
          voboById: userId,
          rejectionReason: rejectionReason ?? null,
          updatedAt: new Date(),
        };
  const [updated] = await db.update(economicModels).set(set).where(eq(economicModels.id, id)).returning();
  return updated;
}
```

- [ ] **Step 5: KPI de la bandeja**

```typescript
// KPI: conteo por estado + tiempo promedio recibido→aprobado (días).
export async function getCotizacionKpis() {
  const rows = await db.query.economicModels.findMany({ where: isNotNull(economicModels.surveyId) });
  const byStatus: Record<string, number> = {};
  let totalDays = 0;
  let resolvedCount = 0;
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.status === "aprobado" && r.receivedAt && r.resolvedAt) {
      totalDays += (r.resolvedAt.getTime() - r.receivedAt.getTime()) / 86_400_000;
      resolvedCount += 1;
    }
  }
  return {
    byStatus,
    avgDaysToApprove: resolvedCount > 0 ? totalDays / resolvedCount : null,
    pendingReception: byStatus["recibido"] || 0,
  };
}
```

- [ ] **Step 6: Typecheck**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/modules/subproductos/storage.ts
git commit -m "feat(subproductos): storage de bandeja de cotización + KPI"
```

---

## Task 4: Backend — endpoints de cotización

**Files:**
- Modify: `server/modules/subproductos/routes.ts`

- [ ] **Step 1: Importar permisos, helpers y las nuevas funciones**

En `routes.ts`, agregar imports:
```typescript
import { PERMISSIONS } from "../../../shared/auth/permissions";
import { requireAuth, requirePermission } from "../../middleware/auth";
import { getErrorMessage } from "../../utils/errors";
```
(Ya importa `requireAuth`; consolidar en una sola línea.) Y agregar al import de `./storage`:
```typescript
  getCotizaciones,
  getCotizacionById,
  getCotizacionKpis,
  takeCotizacion,
  updateCotizacion,
  submitCotizacionToVobo,
  resolveCotizacionVobo,
```

- [ ] **Step 2: Schemas Zod inline para las acciones**

Después de `insertConciliationSchema`:
```typescript
const cotizacionUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  monthlyVolume: z.string().max(200).optional(),
  proposedPrice: z.union([z.string(), z.number()]).optional(),
  estimatedCost: z.union([z.string(), z.number()]).optional(),
  estimatedMargin: z.union([z.string(), z.number()]).optional(),
  servicesIncluded: z.any().optional(),
  wasteComposition: z.any().optional(),
  notes: z.string().max(2000).optional(),
});

const voboDecisionSchema = z.object({
  decision: z.enum(["aprobar", "rechazar"]),
  rejectionReason: z.string().max(2000).optional(),
});
```

- [ ] **Step 3: Rutas de la bandeja**

Antes de `export default router;`:
```typescript
// --- Cotizaciones (bandeja) ---

router.get("/cotizaciones", requirePermission(PERMISSIONS.COTIZACIONES_VIEW), async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    res.json(await getCotizaciones(status));
  } catch (error: unknown) {
    console.error("[subproductos] Get cotizaciones error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/cotizaciones/kpis", requirePermission(PERMISSIONS.COTIZACIONES_VIEW), async (_req, res) => {
  try {
    res.json(await getCotizacionKpis());
  } catch (error: unknown) {
    console.error("[subproductos] Cotización KPIs error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/cotizaciones/:id", requirePermission(PERMISSIONS.COTIZACIONES_VIEW), async (req, res) => {
  try {
    const cot = await getCotizacionById(Number(req.params.id));
    if (!cot) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(cot);
  } catch (error: unknown) {
    console.error("[subproductos] Get cotización error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/cotizaciones/:id/take", requirePermission(PERMISSIONS.COTIZACIONES_EDIT), async (req, res) => {
  try {
    const updated = await takeCotizacion(Number(req.params.id), req.user!.id);
    if (!updated) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(updated);
  } catch (error: unknown) {
    console.error("[subproductos] Take cotización error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/cotizaciones/:id", requirePermission(PERMISSIONS.COTIZACIONES_EDIT), async (req, res) => {
  try {
    const parsed = cotizacionUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    const updated = await updateCotizacion(Number(req.params.id), parsed.data);
    if (!updated) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(updated);
  } catch (error: unknown) {
    console.error("[subproductos] Update cotización error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/cotizaciones/:id/submit-vobo", requirePermission(PERMISSIONS.COTIZACIONES_EDIT), async (req, res) => {
  try {
    const updated = await submitCotizacionToVobo(Number(req.params.id));
    if (!updated) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(updated);
  } catch (error: unknown) {
    console.error("[subproductos] Submit VoBo error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/cotizaciones/:id/vobo", requirePermission(PERMISSIONS.COTIZACIONES_VOBO), async (req, res) => {
  try {
    const parsed = voboDecisionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    const updated = await resolveCotizacionVobo(
      Number(req.params.id),
      req.user!.id,
      parsed.data.decision,
      parsed.data.rejectionReason,
    );
    if (!updated) return res.status(404).json({ message: "Cotización no encontrada" });
    res.json(updated);
  } catch (error: unknown) {
    console.error("[subproductos] VoBo decision error:", getErrorMessage(error));
    res.status(500).json({ message: "Internal server error" });
  }
});
```

- [ ] **Step 4: Typecheck + lint**

Run: `npm run check && npm run lint`
Expected: PASS. (Verificar que `req.user!.id` tipa — el patrón ya se usa en operaciones/routes.ts.)

- [ ] **Step 5: Commit**

```bash
git add server/modules/subproductos/routes.ts
git commit -m "feat(subproductos): endpoints bandeja de cotización + permisos"
```

---

## Task 5: Disparador en operaciones `approveSurvey`

**Files:**
- Modify: `server/modules/operaciones/storage.ts` (función `approveSurvey`, ~línea 812)

- [ ] **Step 1: Importar la función de subproductos**

En la zona de imports de `server/modules/operaciones/storage.ts`, agregar:
```typescript
import { createCotizacionFromApprovedSurvey } from "../subproductos/storage";
```
> Import unidireccional operaciones→subproductos. Verificar que subproductos/storage NO importe operaciones (hoy no lo hace, así que no hay ciclo).

- [ ] **Step 2: Disparar el handoff tras aprobar (sin romper la aprobación)**

En `approveSurvey`, después de `await resolveLatestPendingVersion(id, "aprobado", approvedById);` y antes de `return updated;`, insertar:
```typescript
  // Handoff automático a subproductos: el levantamiento aprobado aterriza en la
  // bandeja de cotización. Envuelto para que un fallo aquí NO rompa la aprobación.
  try {
    const approvedVersion = await db.query.surveyVersions.findFirst({
      where: and(eq(surveyVersions.surveyId, id), eq(surveyVersions.status, "aprobado")),
      orderBy: [desc(surveyVersions.version)],
      columns: { id: true },
    });
    if (approvedVersion) {
      await createCotizacionFromApprovedSurvey({
        surveyId: id,
        surveyVersionId: approvedVersion.id,
        clientName: survey.clientName,
      });
    } else {
      console.warn(`[operaciones→subproductos] No se encontró versión aprobada para survey ${id}; no se creó cotización.`);
    }
  } catch (error: unknown) {
    console.error(`[operaciones→subproductos] Falló handoff de cotización para survey ${id}:`, getErrorMessage(error));
  }
```
Verificar que `and`, `desc`, `eq`, `surveyVersions`, `getErrorMessage` ya están importados en el archivo (lo están: se usan en `resolveLatestPendingVersion` y otras funciones).

- [ ] **Step 3: Typecheck**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/modules/operaciones/storage.ts
git commit -m "feat(operaciones): handoff automático levantamiento aprobado → bandeja subproductos"
```

---

## Task 6: Frontend — hooks React Query

**Files:**
- Modify: `client/src/features/subproductos/api.ts`

- [ ] **Step 1: Agregar hooks de cotización**

Al final de `api.ts`, antes de la sección Summary (o al final):
```typescript
// --- Cotizaciones (bandeja) ---

export function useCotizaciones(status?: string) {
  const url = status ? `/api/subproductos/cotizaciones?status=${status}` : "/api/subproductos/cotizaciones";
  return useQuery<any[]>({ queryKey: [url] });
}

export function useCotizacion(id: number) {
  return useQuery<any>({
    queryKey: [`/api/subproductos/cotizaciones/${id}`],
    enabled: !!id,
  });
}

export function useCotizacionKpis() {
  return useQuery<any>({ queryKey: ["/api/subproductos/cotizaciones/kpis"] });
}

function invalidateCotizaciones() {
  queryClient.invalidateQueries({ queryKey: ["/api/subproductos/cotizaciones"] });
}

export function useTakeCotizacion() {
  return useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/subproductos/cotizaciones/${id}/take`, {})).json(),
    onSuccess: invalidateCotizaciones,
  });
}

export function useUpdateCotizacion() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      (await apiRequest("PATCH", `/api/subproductos/cotizaciones/${id}`, data)).json(),
    onSuccess: invalidateCotizaciones,
  });
}

export function useSubmitVobo() {
  return useMutation({
    mutationFn: async (id: number) =>
      (await apiRequest("POST", `/api/subproductos/cotizaciones/${id}/submit-vobo`, {})).json(),
    onSuccess: invalidateCotizaciones,
  });
}

export function useResolveVobo() {
  return useMutation({
    mutationFn: async ({ id, decision, rejectionReason }: { id: number; decision: "aprobar" | "rechazar"; rejectionReason?: string }) =>
      (await apiRequest("POST", `/api/subproductos/cotizaciones/${id}/vobo`, { decision, rejectionReason })).json(),
    onSuccess: invalidateCotizaciones,
  });
}
```
> Nota: `queryClient.invalidateQueries({ queryKey: ["/api/subproductos/cotizaciones"] })` invalida por prefijo, así también refresca el detalle y los KPIs cuyas keys empiezan igual.

- [ ] **Step 2: Typecheck + lint**

Run: `npm run check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/features/subproductos/api.ts
git commit -m "feat(subproductos): hooks React Query de cotización"
```

---

## Task 7: Frontend — pestaña "Cotizaciones" (bandeja)

**Files:**
- Modify: `client/src/features/subproductos/page.tsx`

- [ ] **Step 1: Agregar la tercera pestaña**

Cambiar el tipo de `mainTab` y agregar el botón. En `SubproductosPage`:
```typescript
  const [mainTab, setMainTab] = useState<"trazabilidad" | "cotizaciones" | "kpis">("cotizaciones");
```
Agregar el botón de pestaña (entre Trazabilidad y KPIs), siguiendo el patrón existente:
```tsx
        <button
          onClick={() => setMainTab("cotizaciones")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
            mainTab === "cotizaciones"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Cotizaciones
        </button>
```
Y el render condicional al final:
```tsx
      {mainTab === "trazabilidad" && <TrazabilidadView />}
      {mainTab === "cotizaciones" && <CotizacionesView />}
      {mainTab === "kpis" && <KpiSection moduleSlug="subproductos" compact />}
```
(`FileText` ya está importado de lucide-react.)

- [ ] **Step 2: Componente `CotizacionesView` (bandeja + KPI)**

Agregar en el mismo archivo (importar hooks arriba: `import { useCotizaciones, useCotizacionKpis } from "./api";` y `import { CotizacionDetail } from "./components/CotizacionDetail";`):
```tsx
const COTIZACION_STATUS: Record<string, { label: string; color: string }> = {
  recibido: { label: "Recibido", color: "bg-blue-100 text-blue-800" },
  en_cotizacion: { label: "En cotización", color: "bg-yellow-100 text-yellow-800" },
  en_vobo: { label: "En VoBo", color: "bg-purple-100 text-purple-800" },
  aprobado: { label: "Aprobado", color: "bg-green-100 text-green-800" },
  rechazado: { label: "Rechazado", color: "bg-red-100 text-red-800" },
};

function daysSince(date?: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

function CotizacionesView() {
  const { data: cotizaciones = [], isError } = useCotizaciones();
  const { data: kpis } = useCotizacionKpis();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="text-red-500 text-4xl">⚠</div>
        <h2 className="text-lg font-semibold text-[#1c2c4a]">Error al cargar cotizaciones</h2>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#0067B0] rounded-lg hover:bg-[#00558f]"
        >
          Recargar
        </button>
      </div>
    );
  }

  const recibidos = cotizaciones.filter((c: any) => c.status === "recibido").length;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Recibidos sin tomar"
          value={String(kpis?.pendingReception ?? recibidos)}
          description="Levantamientos por cotizar"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Tiempo prom. a aprobación"
          value={kpis?.avgDaysToApprove != null ? `${kpis.avgDaysToApprove.toFixed(1)} d` : "—"}
          description="Recibido → aprobado"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="En VoBo"
          value={String(kpis?.byStatus?.en_vobo ?? 0)}
          description="Esperando visto bueno"
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Aprobadas"
          value={String(kpis?.byStatus?.aprobado ?? 0)}
          description="Listas para enviar"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bandeja de cotización ({cotizaciones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {cotizaciones.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <AlertCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No hay levantamientos en la bandeja todavía</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cotizaciones.map((c: any) => {
                const st = COTIZACION_STATUS[c.status] ?? { label: c.status, color: "bg-gray-100 text-gray-800" };
                const dias = daysSince(c.receivedAt);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{c.prospectName || c.title}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${st.color}`}>{st.label}</span>
                        {c.needsReview && (
                          <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                            Levantamiento actualizado
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {dias != null ? `Recibido hace ${dias} día${dias === 1 ? "" : "s"}` : "Sin fecha"}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedId != null && <CotizacionDetail id={selectedId} onClose={() => setSelectedId(null)} />}
    </>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run check && npm run lint`
Expected: PASS (el `CotizacionDetail` se crea en Task 8 — si typecheck falla por el import faltante, hacer Task 8 antes del check final).

- [ ] **Step 4: Commit**

```bash
git add client/src/features/subproductos/page.tsx
git commit -m "feat(subproductos): pestaña Cotizaciones con bandeja y KPIs"
```

---

## Task 8: Frontend — detalle a dos columnas

**Files:**
- Create: `client/src/features/subproductos/components/CotizacionDetail.tsx`

- [ ] **Step 1: Crear el componente de detalle**

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  useCotizacion,
  useResolveVobo,
  useSubmitVobo,
  useTakeCotizacion,
  useUpdateCotizacion,
} from "../api";

// El snapshot del levantamiento aprobado vive en operaciones; se consulta por surveyVersionId.
function useSurveySnapshot(surveyId?: number | null, versionId?: number | null) {
  return useCotizacion; // placeholder no usado — ver fetch directo abajo
}

export function CotizacionDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: cot } = useCotizacion(id);
  const { hasPermission } = useAuth();
  const take = useTakeCotizacion();
  const update = useUpdateCotizacion();
  const submitVobo = useSubmitVobo();
  const resolveVobo = useResolveVobo();
  const [form, setForm] = useState<{ proposedPrice?: string; estimatedCost?: string; estimatedMargin?: string; notes?: string }>({});
  const [rejectReason, setRejectReason] = useState("");

  if (!cot) return null;

  const canEdit = hasPermission?.("cotizaciones.edit");
  const canVobo = hasPermission?.("cotizaciones.vobo");
  const snapshot = (cot.surveyVersionId && (cot as any).snapshot) || null; // ver Step 2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[88vh] w-full max-w-5xl overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{cot.prospectName || cot.title}</h2>
            <p className="text-sm text-muted-foreground">Estado: {cot.status}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {cot.needsReview && (
          <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
            El levantamiento se reabrió y volvió a aprobarse. Revisa los cambios antes de seguir cotizando.
          </div>
        )}
        {cot.rejectionReason && cot.status === "en_cotizacion" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            VoBo rechazado: {cot.rejectionReason}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Izquierda: levantamiento de solo-lectura */}
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Levantamiento</h3>
            {snapshot ? (
              <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">Cargando levantamiento…</p>
            )}
          </section>

          {/* Derecha: formulario del modelo económico */}
          <section className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Modelo económico</h3>
            <div className="space-y-3">
              <LabeledInput label="Precio propuesto" defaultValue={cot.proposedPrice ?? ""} disabled={!canEdit}
                onChange={(v) => setForm((f) => ({ ...f, proposedPrice: v }))} />
              <LabeledInput label="Costo estimado" defaultValue={cot.estimatedCost ?? ""} disabled={!canEdit}
                onChange={(v) => setForm((f) => ({ ...f, estimatedCost: v }))} />
              <LabeledInput label="Margen estimado (%)" defaultValue={cot.estimatedMargin ?? ""} disabled={!canEdit}
                onChange={(v) => setForm((f) => ({ ...f, estimatedMargin: v }))} />
              <div>
                <label className="text-xs text-muted-foreground">Notas</label>
                <textarea
                  className="w-full rounded-md border p-2 text-sm"
                  defaultValue={cot.notes ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Acciones según estado y permisos */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {cot.status === "recibido" && canEdit && (
            <Button onClick={() => take.mutate(id)}>Tomar</Button>
          )}
          {cot.status === "en_cotizacion" && canEdit && (
            <>
              <Button variant="outline" onClick={() => update.mutate({ id, data: form })}>Guardar</Button>
              <Button onClick={() => { update.mutate({ id, data: form }); submitVobo.mutate(id); }}>
                Enviar a VoBo
              </Button>
            </>
          )}
          {cot.status === "en_vobo" && canVobo && (
            <>
              <Button onClick={() => resolveVobo.mutate({ id, decision: "aprobar" })}>Aprobar VoBo</Button>
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Motivo de rechazo"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <Button variant="destructive"
                onClick={() => resolveVobo.mutate({ id, decision: "rechazar", rejectionReason: rejectReason })}>
                Rechazar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, defaultValue, disabled, onChange }: {
  label: string; defaultValue: string | number; disabled?: boolean; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        className="w-full rounded-md border p-2 text-sm"
        defaultValue={String(defaultValue ?? "")}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Exponer el snapshot del levantamiento en el detalle (backend)**

El detalle necesita el snapshot del levantamiento. Ampliar `getCotizacionById` en `server/modules/subproductos/storage.ts` para adjuntar el snapshot leyendo `survey_versions` por `surveyVersionId` con SQL crudo (evita import del schema de operaciones y el ciclo):
```typescript
export async function getCotizacionById(id: number) {
  const cot = await db.query.economicModels.findFirst({ where: eq(economicModels.id, id) });
  if (!cot || !cot.surveyVersionId) return cot ?? null;
  const rows = await db.execute(
    sql`SELECT snapshot FROM survey_versions WHERE id = ${cot.surveyVersionId} LIMIT 1`,
  );
  const snapshot = (rows.rows?.[0] as { snapshot?: unknown } | undefined)?.snapshot ?? null;
  return { ...cot, snapshot };
}
```
> Verificar la forma del retorno de `db.execute` en este driver (Neon): usar `rows.rows`. Si difiere, ajustar (algunos retornan el array directo). Confirmar con un `console.log` temporal en dev.

- [ ] **Step 3: Verificar `hasPermission` en el AuthProvider del cliente**

Confirmar que `client/src/lib/auth.tsx` expone `hasPermission(perm: string)`. Si no existe pero expone los permisos del usuario, ajustar el uso a la API real (p. ej. `permissions.includes("cotizaciones.edit")`). NO inventar la API: leer `auth.tsx` primero y adaptar.

- [ ] **Step 4: Typecheck + lint**

Run: `npm run check && npm run lint`
Expected: PASS. Quitar el helper `useSurveySnapshot` placeholder si biome lo marca como no usado.

- [ ] **Step 5: Commit**

```bash
git add client/src/features/subproductos/components/CotizacionDetail.tsx server/modules/subproductos/storage.ts client/src/features/subproductos/page.tsx
git commit -m "feat(subproductos): detalle de cotización a dos columnas (levantamiento + modelo)"
```

---

## Task 9: Seed de permisos en roles existentes

**Files:**
- Verificar: `server/modules/settings/storage.ts` (seed de roles), `scripts/reconcile-roles.ts`

- [ ] **Step 1: Reconciliar permisos de roles con el catálogo**

Los permisos `cotizaciones.*` se agregaron al baseline en Task 1, pero los roles en DB se siembran/reconcilian aparte. Correr el script de reconciliación (confirmar nombre exacto):

Run: `npx tsx scripts/reconcile-roles.ts`
Expected: agrega `cotizaciones.view/edit` a `comercial` y `cotizaciones.*` a `director`. Si el script no aplica baseline automáticamente, el admin los asigna desde Settings → Roles. **Documentar a Daniel cuál fue el camino.**

- [ ] **Step 2: Verificar**

```sql
SELECT r.name, rp.permission FROM roles r JOIN role_permissions rp ON rp.role_id = r.id
WHERE rp.permission LIKE 'cotizaciones%';
```
Expected: filas para `comercial` y `director`.

---

## Task 10: Verificación manual end-to-end (Definition of Done)

**Files:** ninguno

- [ ] **Step 1: Build/typecheck/lint limpios**

Run: `npm run check && npm run lint`
Expected: PASS ambos.

- [ ] **Step 2: Levantar la app**

Run: `npm run dev` (puerto 4000).

- [ ] **Step 3: Probar el flujo completo (los 4 estados)**

1. Como **operaciones/director**: tomar un levantamiento en `completado` y aprobarlo (`POST /api/operaciones/surveys/:id/approve`).
2. Como **comercial** (Sandra): abrir Subproductos → pestaña **Cotizaciones** → confirmar que el levantamiento aparece en **Recibido** con badge de pendientes.
3. **Tomar** → pasa a En cotización; llenar precio/costo/margen → **Guardar**.
4. **Enviar a VoBo** → pasa a En VoBo.
5. Como **director**: **Aprobar VoBo** → pasa a Aprobado; verificar que el KPI "tiempo prom. a aprobación" se calcula.
6. Caso rechazo: en otra cotización, **Rechazar** con motivo → regresa a En cotización mostrando el motivo.
7. Caso reapertura: reabrir el levantamiento aprobado, re-aprobar → la cotización muestra "Levantamiento actualizado" (`needsReview`) **sin perder** los datos cargados.

Expected: cada transición persiste y refresca la bandeja. Revisar la consola del server: logs `[subproductos] Cotización N creada…` y `[operaciones→subproductos]`.

- [ ] **Step 4: Reporte a Daniel (plantilla VALIDACIÓN §2)**

Confirmar qué se probó, con qué datos, y qué quedó pendiente para la junta del jueves 18 (las decisiones abiertas del spec §9).

---

## Self-Review (cobertura del spec)

- Spec §3 disparador → Task 5. ✅
- Spec §4 modelo de datos (extender economicModels, sin FK dura) → Task 1 + Task 2. ✅
- Spec §5 idempotencia + reapertura (avisar sin pisar) → Task 3 Step 2. ✅
- Spec §5 VoBo (1 director, rechazo regresa) → Task 3 Step 4 + Task 4. ✅
- Spec §6 backend (todas las funciones) → Tasks 3-4. ✅
- Spec §7 frontend (pestaña + dos columnas + badge) → Tasks 7-8. ✅
- Spec §8 KPI + permisos + observabilidad → Task 3 Step 5, Task 1 Step 4, Task 9, logs en Tasks 3/5. ✅
- Spec §2 fuera de scope (manifiestos, GCS, email) → no se tocan. ✅

**Riesgos conocidos marcados en el plan:**
- Task 2 Step 2: GATE de migración (cambio de schema, confirmar con Daniel y correr en dev primero).
- Task 8 Step 2: forma de `db.execute` en el driver Neon — verificar en dev.
- Task 8 Step 3: API real de `hasPermission` en `auth.tsx` — leer antes de usar.
- Task 9: mecanismo exacto de reconciliación de roles — confirmar nombre del script.
