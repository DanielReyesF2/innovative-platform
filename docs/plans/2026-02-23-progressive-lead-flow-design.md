# Design: Progressive Lead Flow

## Problem

The CRM has two separate entities (`leads` and `prospects`) that overlap. The `leads` table is barely used in the frontend. Creating a new prospect requires filling too many fields upfront. There is no progressive disclosure — all tabs and fields are visible regardless of stage.

## Decision

Unify into a single `prospects` table with a new `prospecto` stage. The form, card, and detail tabs adapt based on the current stage.

## Pipeline Stages

```
LEAD → PROSPECTO → LEVANTAMIENTO → PROPUESTA → NEGOCIACION → CIERRE
                                                            ↘ RECHAZADA
```

- **LEAD**: Quick capture. Minimal fields.
- **PROSPECTO**: Qualified. Commercial data filled.
- **LEVANTAMIENTO**: Sent to operations. Technical data.
- **PROPUESTA**: Proposal created and sent.
- **NEGOCIACION**: Terms being negotiated.
- **CIERRE**: Deal won, contract signed.
- **RECHAZADA**: Lost at any point.

## Schema Changes

### 1. Add `"prospecto"` to `prospect_stage` enum

```
["lead", "prospecto", "levantamiento", "propuesta", "negociacion", "cierre", "rechazada"]
```

### 2. Add `source` field to `prospects` table

```typescript
source: leadSourceEnum("source").default("otro"),
```

This replaces the `leads.source` field.

### 3. Deprecate `leads` table

- Migration script moves existing `leads` rows to `prospects` with `stage = "lead"`
- Remove `leads` table references from frontend and backend
- Keep table in schema for backwards compatibility initially

## New Lead Form (Quick Capture)

Only these fields — creates a prospect with `stage = "lead"`:

| Field | Type | Required | Maps to |
|-------|------|----------|---------|
| Nombre empresa | text | yes | `name` |
| Nombre contacto | text | yes | `contactName` |
| Ubicacion | text | yes | `location` |
| Fuente | select | yes | `source` |
| Telefono contacto | text | no | `contactPhone` |

Defaults set on creation: `stage = "lead"`, `potential = "Medio"`, `probability = 0`, `priority = "media"`.

## Stage Transitions

### Lead → Prospecto (Qualify)

Endpoint: `POST /api/comercial/prospects/:id/qualify`

Required fields in request body:
- `industry` (string)
- `potential` ("Bajo" | "Medio" | "Alto" | "Muy Alto")
- `estimatedValue` (number, optional)
- `estimatedVolume` (string, optional)
- `probability` (number, 0-100)
- `priority` ("muy_alta" | "alta" | "media" | "baja")
- `contactRole` (string, optional)
- `contactEmail` (string, optional)
- `reason` (string, optional)
- `nextStep` (string, optional)

Guard: `prospect.stage === "lead"`

### Prospecto → Levantamiento (Send to Ops)

Already exists: `POST /api/comercial/prospects/:id/send-to-operaciones`

Guard: `prospect.stage === "prospecto"` (currently checks `"lead"` — needs update)

### Levantamiento → Propuesta

Triggered when a proposal is created for the prospect.

### Propuesta → Negociacion

Manual stage change by executive.

### Negociacion → Cierre

Manual stage change by executive.

## Progressive Card Display

### In pipeline list:

**LEAD:**
```
[Nombre empresa]                    [Lead]
Contacto • Ubicacion
```

**PROSPECTO:**
```
[Nombre empresa]                    [Prospecto] [Prioridad]
Industria • Ubicacion • $Valor
Probabilidad% • Siguiente paso
```

**LEVANTAMIENTO+:**
```
[Nombre empresa]                    [Etapa] [Prioridad]
Industria • Ubicacion • $Valor
Probabilidad% • Siguiente paso
```

**PROPUESTA+:**
```
[Nombre empresa]                    [Etapa] [Prioridad]
Industria • Ubicacion • $Valor
Propuesta: $Monto • Vence: Fecha
```

## Progressive Tabs in Detail View

| Stage | Visible Tabs |
|-------|-------------|
| lead | Info, Notas |
| prospecto | Info, Timeline, Notas, Reuniones, Docs |
| levantamiento | Info, Timeline, Notas, Reuniones, Docs, Levantamiento |
| propuesta, negociacion, cierre | Info, Timeline, Notas, Reuniones, Docs, Levantamiento, Propuestas |
| rechazada | All (read-only context) |

## Progressive Info Tab

The Info tab itself adapts:

- **Lead**: Shows only name, contact, location, source, phone
- **Prospecto+**: Adds industry, potential, value, volume, probability, priority, risk, opportunity
- **Levantamiento+**: Adds levantamiento summary
- **Propuesta+**: Adds proposal summary

## Files to Modify

### Schema
- `shared/schema/comercial.ts` — add `"prospecto"` to enum, add `source` to prospects

### Backend
- `server/modules/comercial/routes.ts` — new `/qualify` endpoint, update create prospect for minimal fields, update send-to-ops guard
- `server/modules/comercial/storage.ts` — new `qualifyProspect()`, update `createProspect()`, update `sendProspectToOperaciones()` guard

### Frontend
- `client/src/features/comercial/page.tsx` — new "Nuevo Lead" button + modal, update card rendering for progressive display, add PROSPECTO to stage labels/colors
- `client/src/features/comercial/components/ProspectDetail.tsx` — progressive tabs, qualify button for leads, progressive Info tab
- `client/src/features/comercial/api.ts` — new `useQualifyProspect()` hook

### Migration
- `scripts/migrate-leads-to-prospects.ts` — move `leads` data to `prospects`, add prospecto to enum
