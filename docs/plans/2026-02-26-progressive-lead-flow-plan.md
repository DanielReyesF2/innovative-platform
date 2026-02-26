# Progressive Lead Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the lead qualification dialog collect business + waste data in 2 steps, and make ProspectDetail tabs unlock progressively by stage.

**Architecture:** Frontend-only changes to QualifyLeadDialog (add stepper) and ProspectDetail (tab visibility by stage). One backend change to pass waste data through the convert endpoint into levantamientoData JSONB.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, Express

---

### Task 1: Update backend — accept waste data in lead conversion

**Files:**
- Modify: `server/modules/comercial/routes.ts:248-265`
- Modify: `server/modules/comercial/storage.ts:112-151`

**Step 1: Update storage function signature and prospect creation**

In `server/modules/comercial/storage.ts`, update `convertLeadToProspect`:

```typescript
export async function convertLeadToProspect(
  leadId: number,
  qualifyData: {
    industry?: string;
    location?: string;
    potential?: string;
    estimatedValue?: string;
    estimatedVolume?: string;
    wasteInfo?: {
      wasteTypes: string[];
      estimatedVolume: string;
      hasCurrentProvider: boolean;
      currentProviderName?: string;
      reasonForChange?: string;
    };
  }
) {
```

In the `.values({...})` block inside the transaction, add after `estimatedValue`:

```typescript
        estimatedVolume: qualifyData.estimatedVolume || null,
        levantamientoData: qualifyData.wasteInfo ? {
          qualificationWaste: qualifyData.wasteInfo,
        } : null,
```

**Step 2: Update route to pass new fields**

In `server/modules/comercial/routes.ts:248-265`, update the destructure:

```typescript
router.post("/leads/:id/convert", async (req, res) => {
  try {
    const { industry, location, potential, estimatedValue, estimatedVolume, wasteInfo } = req.body;
    const result = await convertLeadToProspect(Number(req.params.id), {
      industry,
      location,
      potential,
      estimatedValue,
      estimatedVolume,
      wasteInfo,
    });
```

**Step 3: Commit**

```bash
git add server/modules/comercial/storage.ts server/modules/comercial/routes.ts
git commit -m "feat(comercial): accept waste data in lead conversion endpoint"
```

---

### Task 2: Update frontend API hook

**Files:**
- Modify: `client/src/features/comercial/api.ts:97-109`

**Step 1: Expand the mutation type**

```typescript
export function useConvertLead() {
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: number;
      industry?: string;
      location?: string;
      potential?: string;
      estimatedValue?: string;
      estimatedVolume?: string;
      wasteInfo?: {
        wasteTypes: string[];
        estimatedVolume: string;
        hasCurrentProvider: boolean;
        currentProviderName?: string;
        reasonForChange?: string;
      };
    }) => {
      const res = await apiRequest("POST", `/api/comercial/leads/${id}/convert`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/pipeline"] });
    },
  });
}
```

**Step 2: Commit**

```bash
git add client/src/features/comercial/api.ts
git commit -m "feat(comercial): expand convert lead hook with waste data types"
```

---

### Task 3: Redesign QualifyLeadDialog with 2-step stepper

**Files:**
- Modify: `client/src/features/comercial/components/QualifyLeadDialog.tsx` (full rewrite)

**Step 1: Replace entire QualifyLeadDialog**

The new dialog has:
- Step indicator (1/2)
- Step 1: Business data (industry select, location, potential, estimated value)
- Step 2: Waste info (waste types multi-select checkboxes, volume, current provider yes/no, provider name + reason if yes)
- Back/Next/Submit navigation

Key implementation details:
- `step` state: 1 or 2
- Industry as `<select>` with options: Manufactura, Alimentos, Retail, Logistica, Salud, Hoteleria, Construccion, Otro
- Waste types as checkboxes: Carton/Papel, Plastico, Metal, Organico, Madera, Vidrio, Peligroso, Electronico, Textil, Otro
- "Has current provider" toggle shows/hides provider name + reason fields
- Step 1 → Step 2 via "Siguiente" button
- Step 2 → Submit via "Crear Prospecto" button
- "Atras" button on step 2
- On submit: call `convertLead.mutateAsync` with all data including `wasteInfo`

**Step 2: Verify visually**

Run: `npm run dev`
1. Go to Leads tab
2. Click "Calificar" on any lead
3. Verify Step 1 shows business fields
4. Click "Siguiente" → Verify Step 2 shows waste fields
5. Fill in waste types and submit → Verify lead converts to prospect

**Step 3: Commit**

```bash
git add client/src/features/comercial/components/QualifyLeadDialog.tsx
git commit -m "feat(comercial): redesign qualify dialog with 2-step stepper"
```

---

### Task 4: Add progressive tab visibility to ProspectDetail

**Files:**
- Modify: `client/src/features/comercial/components/ProspectDetail.tsx:228-251`

**Step 1: Add tab visibility config and lock logic**

Add this config after the existing `PIPELINE_STAGES` constant (around line 66):

```typescript
// Stage at which each tab becomes available
const TAB_UNLOCK_STAGE: Record<string, string> = {
  info: "contacto_inicial",
  timeline: "contacto_inicial",
  notas: "contacto_inicial",
  reuniones: "presentacion",
  levantamiento: "levantamiento",
  documentos: "levantamiento",
  propuestas: "propuesta",
};

function isTabUnlocked(tabId: string, currentStage: string): boolean {
  const unlockStage = TAB_UNLOCK_STAGE[tabId];
  if (!unlockStage) return true;
  const unlockIndex = PIPELINE_STAGES.indexOf(unlockStage as any);
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage as any);
  // Terminal stages or stages past negociacion unlock everything
  if (currentIndex < 0) return true; // unknown stage = show all
  return currentIndex >= unlockIndex;
}
```

**Step 2: Update the tabs rendering block**

Replace the tabs `<div>` (lines 228-251) with locked tab logic:

```tsx
<div className="flex gap-1 border-b px-6 overflow-x-auto">
  {[
    { id: "info", label: "Info", icon: Building2 },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "notas", label: "Notas", icon: StickyNote },
    { id: "reuniones", label: "Reuniones", icon: Users },
    { id: "levantamiento", label: "Levantamiento", icon: Target },
    { id: "documentos", label: "Docs", icon: FileText },
    { id: "propuestas", label: "Propuestas", icon: FileCheck },
  ].map((tab) => {
    const unlocked = isTabUnlocked(tab.id, currentStage);
    return (
      <button
        key={tab.id}
        onClick={() => unlocked && setActiveTab(tab.id as TabType)}
        disabled={!unlocked}
        title={
          !unlocked
            ? `Se desbloquea en ${STAGE_LABELS[TAB_UNLOCK_STAGE[tab.id]] || tab.id}`
            : undefined
        }
        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
          !unlocked
            ? "text-muted-foreground/40 cursor-not-allowed"
            : activeTab === tab.id
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <tab.icon className="h-4 w-4" />
        {tab.label}
        {!unlocked && <Lock className="h-3 w-3 ml-1" />}
      </button>
    );
  })}
</div>
```

Note: Add `Lock` to the lucide-react import at the top of the file.

**Step 3: Handle activeTab reset on stage change**

If the user is viewing a tab that becomes locked after stage change (shouldn't happen with forward progression, but safety net), add this after `const currentStage = normalizeStage(prospect.stage)`:

```typescript
// If current tab is locked for this stage, reset to info
const tabUnlocked = isTabUnlocked(activeTab, currentStage);
if (!tabUnlocked && activeTab !== "info") {
  setActiveTab("info");
}
```

Actually this needs to be a useEffect to avoid setting state during render. Add:

```typescript
import { useState, useCallback, useEffect } from "react";

// Inside the component, after currentStage:
useEffect(() => {
  if (!isTabUnlocked(activeTab, currentStage)) {
    setActiveTab("info");
  }
}, [currentStage, activeTab]);
```

**Step 4: Move tab order**

Reorder tabs to match the natural flow: Info → Timeline → Notas → Reuniones → Levantamiento → Docs → Propuestas (Levantamiento moved before Docs, which makes sense because levantamiento unlocks at the same stage as docs).

**Step 5: Verify visually**

Run: `npm run dev`
1. Open a prospect in `contacto_inicial` → Should see: Info, Timeline, Notas (others locked with lock icon)
2. Advance to `presentacion` → Reuniones unlocks
3. Advance to `levantamiento` → Levantamiento + Docs unlock
4. Advance to `propuesta` → Propuestas unlocks
5. Hover locked tabs → Tooltip shows "Se desbloquea en [stage]"

**Step 6: Commit**

```bash
git add client/src/features/comercial/components/ProspectDetail.tsx
git commit -m "feat(comercial): progressive tab visibility by stage"
```

---

### Task 5: Final integration test and push

**Step 1: Full flow test**

1. Create new lead (basic contact info only)
2. Click "Calificar" → fill step 1 (business) + step 2 (waste)
3. Verify prospect created in `contacto_inicial` with only Info/Timeline/Notas tabs
4. Advance through stages and verify tabs unlock progressively
5. Verify levantamiento tab shows the waste data from qualification under `qualificationWaste`

**Step 2: Push**

```bash
git push origin claude/lead-workflow-stages-eeHO4
```

**Step 3: Deploy and share with Vero**

The branch should auto-deploy or be manually deployed to Railway for Vero to test.
