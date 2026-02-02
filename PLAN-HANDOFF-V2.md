# Plan v2: Handoff Comercial → Operaciones

## Problemas del plan anterior

1. **Sin transacciones** — `sendProspectToOperaciones` hace 6 operaciones DB sin atomicidad. Si falla a la mitad, queda data inconsistente
2. **Sin guardas de estado** — Se puede aceptar un survey ya aceptado, rechazar uno ya rechazado, o enviar un prospecto que ya fue enviado
3. **`scheduledDate` NOT NULL con placeholder** — El schema exige fecha pero metemos `new Date()` como basura temporal
4. **Sin validacion Zod en endpoints** — Accept y reject no validan body con schema
5. **Sin control de roles** — Cualquier usuario autenticado puede enviar, aceptar o rechazar
6. **Sin idempotencia** — Doble-click en "Enviar" crea surveys duplicados
7. **Sin indexes** — `prospect_id` y `survey_id` se consultan frecuentemente sin index

---

## Cambios respecto al plan anterior

### 1. Migration: `scheduledDate` pasa a nullable

```sql
ALTER TABLE surveys ALTER COLUMN scheduled_date DROP NOT NULL;
```

Asi un survey en `pendiente_revision` tiene `scheduledDate = NULL` (dato real, no placeholder). El schema de Drizzle se actualiza quitando `.notNull()`.

### 2. Transacciones con `db.transaction()`

Drizzle soporta `db.transaction()`. Las operaciones multi-tabla se envuelven:

```typescript
// sendProspectToOperaciones
const result = await db.transaction(async (tx) => {
  const [survey] = await tx.insert(surveys).values({...}).returning();
  // ... inserts relacionados con tx ...
  const [updated] = await tx.update(prospects).set({...}).where(...).returning();
  return { prospect: updated, surveyId: survey.id };
});

// rejectSurvey
const result = await db.transaction(async (tx) => {
  const [survey] = await tx.update(surveys).set({...}).where(...).returning();
  if (survey.prospectId) {
    await tx.update(prospects).set({...}).where(...);
  }
  return { survey };
});
```

Si cualquier operacion falla, todo se revierte.

### 3. Guardas de maquina de estado (server-side)

Cada operacion valida el estado actual antes de proceder:

```
sendProspectToOperaciones:
  REQUIERE: prospect.stage === "lead" && prospect.surveyId === null
  RESULTADO: prospect.stage → "levantamiento"

acceptSurvey:
  REQUIERE: survey.status === "pendiente_revision"
  RESULTADO: survey.status → "agendado"

rejectSurvey:
  REQUIERE: survey.status === "pendiente_revision"
  RESULTADO: survey.status → "rechazado", prospect.stage → "lead"
```

Si el estado no es el esperado, retorna 409 Conflict.

### 4. Validacion Zod en endpoints

Schemas nuevos para validar body de requests:

```typescript
// Validacion del body de accept
const acceptSurveySchema = z.object({
  scheduledDate: z.string().datetime({ offset: true }).or(z.string().date()),
  assignedToId: z.number().int().positive(),
  schedulingNotes: z.string().max(500).optional(),
});

// Validacion del body de reject
const rejectSurveySchema = z.object({
  rejectionReason: z.string().min(10, "El motivo debe tener al menos 10 caracteres").max(1000),
});

// Validacion de levantamientoData antes de enviar
const levantamientoDataSchema = z.object({
  generalInfo: z.object({
    razonSocial: z.string().min(1),
  }).passthrough(),
  wasteTypes: z.array(z.object({
    wasteType: z.string().min(1),
  }).passthrough()).min(1, "Se requiere al menos un tipo de residuo"),
}).passthrough();
```

### 5. Control de roles con `requireRole()`

El middleware ya existe en `auth.ts`. Se aplica a las rutas del handoff:

```typescript
// Comercial: solo rol "admin" o "comercial"
router.post("/prospects/:id/send-to-operaciones", requireRole("admin", "comercial"), ...)

// Operaciones: solo rol "admin" o "operaciones"
router.post("/surveys/:id/accept", requireRole("admin", "operaciones"), ...)
router.post("/surveys/:id/reject", requireRole("admin", "operaciones"), ...)
router.get("/surveys/pending-review", requireRole("admin", "operaciones"), ...)
```

### 6. Idempotencia en envio

Antes de crear el survey, verificar que no existe uno activo:

```typescript
if (prospect.surveyId) {
  // Verificar si el survey existente esta rechazado
  const existingSurvey = await tx.query.surveys.findFirst({
    where: eq(surveys.id, prospect.surveyId),
  });
  if (existingSurvey && existingSurvey.status !== "rechazado") {
    throw new ConflictError("Este prospecto ya tiene una solicitud activa");
  }
}
```

### 7. Indexes en migracion

```sql
CREATE INDEX IF NOT EXISTS idx_surveys_prospect_id ON surveys(prospect_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_prospects_survey_id ON prospects(survey_id);
CREATE INDEX IF NOT EXISTS idx_prospects_stage ON prospects(stage);
```

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `shared/schema/operaciones.ts` | `scheduledDate` → nullable |
| `server/modules/comercial/storage.ts` | Transaction + guardas de estado + idempotencia |
| `server/modules/comercial/routes.ts` | `requireRole` + validacion Zod |
| `server/modules/operaciones/storage.ts` | Transaction en reject + guardas de estado |
| `server/modules/operaciones/routes.ts` | `requireRole` + validacion Zod (accept/reject) |
| `scripts/migrate-handoff.ts` | DROP NOT NULL en scheduledDate + indexes |

Los demas archivos (frontend, api hooks, ProspectDetail, ReviewSurveyModal) **no cambian** — ya estan correctos.

---

## Orden de implementacion

1. Schema: `scheduledDate` nullable
2. Migration: agregar DROP NOT NULL + indexes
3. Backend comercial: transaction + guardas + idempotencia + requireRole + Zod
4. Backend operaciones: transaction + guardas + requireRole + Zod
5. `npm run check`
6. Ejecutar migracion
7. Reiniciar server + test manual

---

## Verificacion

1. `npm run check` — sin errores nuevos
2. Migracion ejecuta sin errores
3. Enviar prospecto en stage "lead" → funciona
4. Enviar prospecto en stage "levantamiento" → 409 Conflict
5. Aceptar survey pendiente → funciona, scheduledDate ya no es placeholder
6. Aceptar survey ya aceptado → 409 Conflict
7. Rechazar survey → prospecto vuelve a "lead" atomicamente
8. Rechazar survey ya rechazado → 409 Conflict
9. Enviar sin datos minimos → 400 con mensaje claro
10. Usuario sin rol correcto → 403
