# Progressive Lead Flow Design

## Overview

Redesign the lead creation and qualification workflow so information fills progressively as the prospect advances through stages. The initial lead form captures only contact info. Qualification adds business and waste data. Prospect detail tabs unlock as the stage advances.

## Flow

```
Create Lead (quick) → Qualify (business+waste) → Progressive tabs by stage
```

### 1. Lead Creation (LeadForm - no changes)

Existing form captures:
- Company name (required)
- Contact name (required)
- Phone, email, source, notes

### 2. Lead Qualification (QualifyLeadDialog - enhanced)

Two-step dialog replaces the current simple form:

**Step 1 - Business Data:**
- Industry (select: manufactura, alimentos, retail, logistica, salud, otro)
- Location (text)
- Potential (select: Bajo, Medio, Alto, Muy Alto)
- Estimated monthly value ($)

**Step 2 - Waste Info:**
- Waste types generated (multi-select: carton, plastico, metal, organico, peligroso, electronico, otro)
- Estimated monthly volume (text, e.g. "120 ton/mes")
- Has current provider? (yes/no)
- If yes: provider name, reason for change

Waste data stored in `prospects.levantamientoData` JSONB (no schema changes needed).

On qualification:
- Lead marked inactive (isActive=false)
- Prospect created at stage `contacto_inicial`
- Probability: 10%, Priority: media

### 3. Progressive Tabs by Stage (ProspectDetail - modified)

| Stage | Available Tabs |
|---|---|
| contacto_inicial | Info, Timeline, Notas |
| presentacion | + Reuniones |
| levantamiento | + Levantamiento, + Documentos |
| propuesta | + Propuestas |
| negociacion | All tabs available |
| cierre_ganado / cierre_perdido | All tabs (readonly) |

Locked tabs show:
- Gray text + lock icon
- Tooltip: "Se desbloquea en etapa [stage_name]"
- Not clickable

### 4. What Does NOT Change

- Lead creation form (LeadForm.tsx)
- API routes for leads/prospects (only QualifyLeadDialog data mapping changes)
- Stage advancement logic (button "Avanzar etapa")
- Send to Operations flow
- Database schema (levantamientoData JSONB already exists)

## Files to Modify

1. `client/src/features/comercial/components/QualifyLeadDialog.tsx` - Add stepper with 2 steps
2. `client/src/features/comercial/components/ProspectDetail.tsx` - Tab visibility logic by stage
3. `server/modules/comercial/routes.ts` - Update lead conversion endpoint to save waste data

## Dependencies

- No DB schema changes
- No new packages needed
