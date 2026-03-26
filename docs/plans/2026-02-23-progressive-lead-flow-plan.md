# Progressive Lead Flow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify leads/prospects into a single entity with progressive disclosure — form, cards, and tabs adapt based on the pipeline stage.

**Architecture:** Single `prospects` table with new `prospecto` stage between `lead` and `levantamiento`. New `/qualify` endpoint transitions lead→prospecto. Frontend uses stage-aware rendering for cards, tabs, and info display. DB migration adds `prospecto` to enum and `source` column to prospects.

**Tech Stack:** Drizzle ORM + PostgreSQL, Express routes, React + TanStack Query, shadcn/ui components, Zod validation.

---

## Task 1: Schema — Add `prospecto` stage and `source` column

**Files:**
- Modify: `shared/schema/comercial.ts:7-14` (prospectStageEnum)
- Modify: `shared/schema/comercial.ts:83-122` (prospects table)
- Modify: `shared/schema/comercial.ts:264-270` (insertProspectSchema)

**Step 1: Add "prospecto" to prospectStageEnum**

In `shared/schema/comercial.ts`, change line 7-14 from:

```typescript
export const prospectStageEnum = pgEnum("prospect_stage", [
  "lead",
  "levantamiento",
  "propuesta",
  "negociacion",
  "cierre",
  "rechazada",
]);
```

To:

```typescript
export const prospectStageEnum = pgEnum("prospect_stage", [
  "lead",
  "prospecto",
  "levantamiento",
  "propuesta",
  "negociacion",
  "cierre",
  "rechazada",
]);
```

**Step 2: Add `source` column to prospects table**

In `shared/schema/comercial.ts`, inside the `prospects` table definition, after line 97 (`contactEmail`), add:

```typescript
  source: leadSourceEnum("source").default("otro"),
```

**Step 3: Update insertProspectSchema for minimal lead creation**

The current `insertProspectSchema` requires `industry` and `potential`. For lead creation we need those to be optional. Change lines 264-270 from:

```typescript
export const insertProspectSchema = createInsertSchema(prospects, {
  name: z.string().min(1).max(200),
  industry: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  potential: z.string().min(1).max(20),
  probability: z.number().min(0).max(100).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
```

To:

```typescript
export const insertProspectSchema = createInsertSchema(prospects, {
  name: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  location: z.string().min(1).max(200),
  potential: z.string().max(20).optional(),
  probability: z.number().min(0).max(100).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
```

**Step 4: Add qualifyProspectSchema validator**

After the `insertProspectSchema` definition (around line 270), add:

```typescript
export const qualifyProspectSchema = z.object({
  industry: z.string().min(1).max(100),
  potential: z.string().min(1).max(20),
  estimatedValue: z.union([z.string(), z.number()]).optional(),
  estimatedVolume: z.string().max(100).optional(),
  probability: z.number().min(0).max(100),
  priority: z.enum(["muy_alta", "alta", "media", "baja"]),
  contactRole: z.string().max(200).optional(),
  contactEmail: z.string().email().max(200).optional(),
  reason: z.string().max(500).optional(),
  nextStep: z.string().max(500).optional(),
});
```

**Step 5: Export the new type**

After the existing type exports (around line 358), add:

```typescript
export type QualifyProspectData = z.infer<typeof qualifyProspectSchema>;
```

**Step 6: Run TypeScript check**

Run: `npm run check` from project root.
Expected: May have errors in storage.ts/routes.ts that reference old lead functions — that's OK, we'll fix those in subsequent tasks.

**Step 7: Commit**

```bash
git add shared/schema/comercial.ts
git commit -m "feat(schema): add prospecto stage, source column, and qualify schema"
```

---

## Task 2: DB Migration — Add prospecto enum value and source column

**Files:**
- Create: `scripts/migrate-progressive-lead.ts`

**Step 1: Create the migration script**

Create `scripts/migrate-progressive-lead.ts`:

```typescript
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function migrate() {
  console.log("Starting progressive lead migration...");

  // 1. Add 'prospecto' to prospect_stage enum
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "prospect_stage" ADD VALUE IF NOT EXISTS 'prospecto' AFTER 'lead';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("✓ Added 'prospecto' to prospect_stage enum");

  // 2. Add 'source' column to prospects table
  await db.execute(sql`
    ALTER TABLE "prospects" ADD COLUMN IF NOT EXISTS "source" "lead_source" DEFAULT 'otro';
  `);
  console.log("✓ Added 'source' column to prospects");

  // 3. Migrate existing leads to prospects
  // For each active lead, create a prospect in stage 'lead' if not already converted
  const existingLeads = await db.execute(sql`
    SELECT * FROM "leads" WHERE "is_active" = true AND "converted_to_prospect_id" IS NULL
  `);

  let migratedCount = 0;
  for (const lead of existingLeads.rows) {
    await db.execute(sql`
      INSERT INTO "prospects" ("name", "contact_name", "location", "source", "industry", "stage", "potential", "probability", "priority")
      VALUES (
        ${(lead as any).company_name},
        ${(lead as any).contact_name},
        ${(lead as any).location || 'Sin ubicación'},
        ${(lead as any).source || 'otro'},
        ${(lead as any).industry || null},
        'lead',
        'Medio',
        0,
        'media'
      )
    `);
    migratedCount++;
  }
  console.log(`✓ Migrated ${migratedCount} leads to prospects`);

  // 4. Add index on source column
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "idx_prospects_source" ON "prospects"("source");
  `);
  console.log("✓ Created index on prospects.source");

  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
```

**Step 2: Run the migration**

Run: `npx tsx scripts/migrate-progressive-lead.ts`
Expected: Success messages for each step.

**Step 3: Commit**

```bash
git add scripts/migrate-progressive-lead.ts
git commit -m "feat(migration): add prospecto enum, source column, migrate existing leads"
```

---

## Task 3: Backend — Add `qualifyProspect` storage function

**Files:**
- Modify: `server/modules/comercial/storage.ts:55-58` (createProspect)
- Modify: `server/modules/comercial/storage.ts:131-152` (getPipelineSummary)
- Modify: `server/modules/comercial/storage.ts:176-277` (sendProspectToOperaciones)
- Add new function after line 87

**Step 1: Add qualifyProspect function**

In `server/modules/comercial/storage.ts`, after the `rejectProspect` function (after line 87), add:

```typescript
// --- Qualify Lead → Prospecto ---

export async function qualifyProspect(id: number, data: {
  industry: string;
  potential: string;
  estimatedValue?: string | number;
  estimatedVolume?: string;
  probability: number;
  priority: string;
  contactRole?: string;
  contactEmail?: string;
  reason?: string;
  nextStep?: string;
}) {
  // Verify prospect exists and is in 'lead' stage
  const prospect = await db.query.prospects.findFirst({
    where: eq(prospects.id, id),
  });
  if (!prospect) throw new Error("NOT_FOUND");
  if (prospect.stage !== "lead") {
    throw new Error("CONFLICT:El prospecto no esta en etapa 'lead'");
  }

  const [updated] = await db
    .update(prospects)
    .set({
      stage: "prospecto",
      industry: data.industry,
      potential: data.potential,
      estimatedValue: data.estimatedValue ? String(data.estimatedValue) : null,
      estimatedVolume: data.estimatedVolume || null,
      probability: data.probability,
      priority: data.priority as any,
      contactRole: data.contactRole || null,
      contactEmail: data.contactEmail || null,
      reason: data.reason || null,
      nextStep: data.nextStep || null,
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, id))
    .returning();

  return updated;
}
```

**Step 2: Update getPipelineSummary to include "prospecto" stage**

In `server/modules/comercial/storage.ts`, change line 132 from:

```typescript
  const stages = ["lead", "levantamiento", "propuesta", "negociacion", "cierre"];
```

To:

```typescript
  const stages = ["lead", "prospecto", "levantamiento", "propuesta", "negociacion", "cierre"];
```

**Step 3: Update sendProspectToOperaciones guard**

In `server/modules/comercial/storage.ts`, change the stage guard in `sendProspectToOperaciones` (line 184) from:

```typescript
  if (prospect.stage !== "lead") {
    throw new Error("CONFLICT:El prospecto no esta en etapa 'lead'");
  }
```

To:

```typescript
  if (prospect.stage !== "prospecto") {
    throw new Error("CONFLICT:El prospecto no esta en etapa 'prospecto'");
  }
```

**Step 4: Update generateAlerts to include "prospecto" stage**

In `server/modules/comercial/storage.ts`, in the `generateAlerts` function, the queries for overdue and stale prospects filter by stage. Add `"prospecto"` to both stage filters. Find the two blocks that have:

```typescript
        eq(prospects.stage, "lead"),
```

And add after each one:

```typescript
        eq(prospects.stage, "prospecto"),
```

**Step 5: Run TypeScript check**

Run: `npm run check`
Expected: Errors related to routes.ts not importing `qualifyProspect` — will fix in next task.

**Step 6: Commit**

```bash
git add server/modules/comercial/storage.ts
git commit -m "feat(backend): add qualifyProspect, update pipeline and guards for prospecto stage"
```

---

## Task 4: Backend — Add `/qualify` route and update imports

**Files:**
- Modify: `server/modules/comercial/routes.ts:7-60` (imports)
- Modify: `server/modules/comercial/routes.ts:61` (schema import)
- Add new route after line 187

**Step 1: Add qualifyProspect to storage imports**

In `server/modules/comercial/routes.ts`, add `qualifyProspect` to the import from `./storage` (after line 22, with the other prospect functions):

```typescript
  qualifyProspect,
```

**Step 2: Add qualifyProspectSchema to schema imports**

In `server/modules/comercial/routes.ts`, update line 61 to also import the qualify schema:

```typescript
import { insertProspectSchema, insertLeadSchema, insertVentaRealSchema, insertKpiMensualSchema, qualifyProspectSchema } from "../../../shared/schema/comercial";
```

**Step 3: Add the /qualify route**

After the reject route (after line 187), add:

```typescript
// --- Qualify Lead → Prospecto ---

router.post("/prospects/:id/qualify", async (req, res) => {
  try {
    const parsed = qualifyProspectSchema.parse(req.body);
    const updated = await qualifyProspect(Number(req.params.id), parsed);
    res.json(updated);
  } catch (error: any) {
    console.error("[comercial] Qualify prospect error:", error);
    const msg = error.message || "Internal server error";
    if (msg.startsWith("NOT_FOUND")) return res.status(404).json({ message: "Prospecto no encontrado" });
    if (msg.startsWith("CONFLICT:")) return res.status(409).json({ message: msg.slice(9) });
    if (error.name === "ZodError") return res.status(400).json({ message: "Datos invalidos", errors: error.errors });
    res.status(500).json({ message: "Internal server error" });
  }
});
```

**Step 4: Run TypeScript check**

Run: `npm run check`
Expected: PASS (or only pre-existing warnings).

**Step 5: Commit**

```bash
git add server/modules/comercial/routes.ts
git commit -m "feat(backend): add /qualify endpoint for lead-to-prospecto transition"
```

---

## Task 5: Frontend API — Add useQualifyProspect and useCreateQuickLead hooks

**Files:**
- Modify: `client/src/features/comercial/api.ts:26-37` (useCreateProspect)
- Add new hook after line 37

**Step 1: Update useCreateProspect for quick lead creation**

No change needed — `useCreateProspect` already posts to `/api/comercial/prospects` with whatever data is passed. The schema change in Task 1 makes `industry` and `potential` optional, so the existing hook works for quick lead creation.

**Step 2: Add useQualifyProspect hook**

In `client/src/features/comercial/api.ts`, after `useCreateProspect` (after line 37), add:

```typescript
export function useQualifyProspect() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const res = await apiRequest("POST", `/api/comercial/prospects/${id}/qualify`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/prospects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comercial/pipeline"] });
    },
  });
}
```

**Step 3: Run TypeScript check**

Run: `npm run check`
Expected: PASS.

**Step 4: Commit**

```bash
git add client/src/features/comercial/api.ts
git commit -m "feat(frontend): add useQualifyProspect API hook"
```

---

## Task 6: Frontend — New Lead button + quick capture modal in pipeline page

**Files:**
- Modify: `client/src/features/comercial/page.tsx:18` (imports from api)
- Modify: `client/src/features/comercial/page.tsx:24-31` (STAGE_LABELS)
- Modify: `client/src/features/comercial/page.tsx:33-39` (STAGE_COLORS)
- Modify: `client/src/features/comercial/page.tsx:110-302` (PipelineView)

**Step 1: Add "prospecto" to STAGE_LABELS**

In `client/src/features/comercial/page.tsx`, change STAGE_LABELS (lines 24-31) to add prospecto:

```typescript
const STAGE_LABELS: Record<string, string> = {
  lead: "Leads",
  prospecto: "Prospectos",
  levantamiento: "Levantamientos",
  propuesta: "Propuestas",
  negociacion: "Negociación",
  cierre: "Cierre",
  rechazada: "Rechazadas",
};
```

**Step 2: Add "prospecto" to STAGE_COLORS**

```typescript
const STAGE_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800",
  prospecto: "bg-cyan-100 text-cyan-800",
  levantamiento: "bg-yellow-100 text-yellow-800",
  propuesta: "bg-purple-100 text-purple-800",
  negociacion: "bg-orange-100 text-orange-800",
  cierre: "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800",
};
```

**Step 3: Add imports for the new lead modal**

Update imports at top of file. Add `useCreateProspect` to the api import (line 18):

```typescript
import { useProspects, usePipeline, useLeads, useCreateProspect } from "./api";
```

Add `Plus` to the lucide imports, and add `Dialog` from shadcn if available, or we'll use a simple modal pattern consistent with ProspectDetail.

**Step 4: Update pipeline funnel grid**

The pipeline funnel grid (line 180) currently uses `grid-cols-5`. Change to `grid-cols-6` to accommodate the new "prospecto" column:

```typescript
<div className="grid grid-cols-6 gap-3">
```

**Step 5: Add "Nuevo Lead" button + modal state in PipelineView**

In the `PipelineView` function, add state for the new lead modal and the `useCreateProspect` hook. After line 117 (`const [selectedProspect, setSelectedProspect] = useState<any>(null);`), add:

```typescript
  const [showNewLead, setShowNewLead] = useState(false);
  const createProspect = useCreateProspect();
```

**Step 6: Add the "Nuevo Lead" button**

In the header area of PipelineView, before the search bar section (before line 202), add:

```typescript
      {/* New Lead button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowNewLead(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lead
        </Button>
      </div>
```

**Step 7: Add NewLeadModal component**

At the bottom of the file (before the closing of the file, after the `MetricCard` component), add:

```typescript
function NewLeadModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    location: "",
    source: "otro",
    contactPhone: "",
  });

  const set = (key: string, val: string) => setForm({ ...form, [key]: val });

  const handleSubmit = () => {
    if (!form.name || !form.contactName || !form.location) return;
    onSubmit({
      name: form.name,
      contactName: form.contactName,
      location: form.location,
      source: form.source,
      contactPhone: form.contactPhone || undefined,
      stage: "lead",
      potential: "Medio",
      industry: "Por definir",
      probability: 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h3 className="text-lg font-bold">Nuevo Lead</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura rápida — solo datos básicos
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Nombre empresa *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej: ACME Corp"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Nombre contacto *</Label>
            <Input
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Ubicación *</Label>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Ej: CDMX, Monterrey"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Fuente</Label>
            <select
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="referido">Referido</option>
              <option value="web">Web</option>
              <option value="linkedin">LinkedIn</option>
              <option value="evento">Evento</option>
              <option value="cold_call">Cold Call</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Teléfono contacto</Label>
            <Input
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
              placeholder="Opcional"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !form.name || !form.contactName || !form.location}
          >
            {isPending ? "Creando..." : "Crear Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 8: Render the modal in PipelineView**

At the end of the PipelineView return (before the closing `</>`), add:

```typescript
      {showNewLead && (
        <NewLeadModal
          onClose={() => setShowNewLead(false)}
          isPending={createProspect.isPending}
          onSubmit={async (data) => {
            await createProspect.mutateAsync(data);
            setShowNewLead(false);
          }}
        />
      )}
```

**Step 9: Update prospect card for progressive display**

Replace the prospect card rendering (the button inside the `filtered.map`, approximately lines 243-285) with stage-aware content. The card should show different info based on stage:

```typescript
                <button
                  key={prospect.id}
                  onClick={() => setSelectedProspect(prospect)}
                  className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{prospect.name}</span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STAGE_COLORS[prospect.stage] || ""
                        }`}
                      >
                        {STAGE_LABELS[prospect.stage] || prospect.stage}
                      </span>
                      {prospect.stage !== "lead" && prospect.priority && (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            PRIORITY_COLORS[prospect.priority] || ""
                          }`}
                        >
                          {prospect.priority.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {/* Lead: minimal info */}
                    {prospect.stage === "lead" && (
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        {prospect.contactName && <span>{prospect.contactName}</span>}
                        <span>{prospect.location}</span>
                      </div>
                    )}
                    {/* Prospecto+: commercial info */}
                    {prospect.stage !== "lead" && (
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{prospect.industry}</span>
                        <span>{prospect.location}</span>
                        {prospect.estimatedValue && (
                          <span className="font-medium">
                            ${Number(prospect.estimatedValue).toLocaleString("es-MX")}
                          </span>
                        )}
                        {prospect.probability > 0 && (
                          <span>{prospect.probability}% prob.</span>
                        )}
                      </div>
                    )}
                    {/* Next step for prospecto+ */}
                    {prospect.stage !== "lead" && prospect.nextStep && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Siguiente: {prospect.nextStep}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
```

**Step 10: Add Label import**

Add `Label` to the shadcn imports at the top if not already there. Check current imports — the file uses `Input` but may not import `Label`. Add if needed:

```typescript
import { Label } from "@/components/ui/label";
```

**Step 11: Run TypeScript check**

Run: `npm run check`
Expected: PASS.

**Step 12: Commit**

```bash
git add client/src/features/comercial/page.tsx
git commit -m "feat(frontend): add Nuevo Lead modal, prospecto stage labels, progressive cards"
```

---

## Task 7: Frontend — Progressive tabs and qualify button in ProspectDetail

**Files:**
- Modify: `client/src/features/comercial/components/ProspectDetail.tsx`

**Step 1: Add useQualifyProspect import**

At line 24, add `useQualifyProspect` to the api import:

```typescript
import { useUpdateProspect, useSendToOperaciones, useQualifyProspect } from "../api";
```

**Step 2: Add "prospecto" to STAGE_LABELS and STAGE_COLORS**

Update STAGE_LABELS (line 32-39) and STAGE_COLORS (line 41-48) to include prospecto, same as in page.tsx:

```typescript
const STAGE_LABELS: Record<string, string> = {
  lead: "Leads",
  prospecto: "Prospectos",
  levantamiento: "Levantamientos",
  propuesta: "Propuestas",
  negociacion: "Negociacion",
  cierre: "Cierre",
  rechazada: "Rechazadas",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "bg-blue-100 text-blue-800",
  prospecto: "bg-cyan-100 text-cyan-800",
  levantamiento: "bg-yellow-100 text-yellow-800",
  propuesta: "bg-purple-100 text-purple-800",
  negociacion: "bg-orange-100 text-orange-800",
  cierre: "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800",
};
```

**Step 3: Add qualify state and hook**

Inside the `ProspectDetail` component, after line 64 (`const { toast } = useToast();`), add:

```typescript
  const qualifyProspect = useQualifyProspect();
  const [showQualify, setShowQualify] = useState(false);
```

**Step 4: Define stage-aware tabs**

Replace the static tab array (lines 131-139) with a dynamic one based on stage:

```typescript
          {(() => {
            const stage = prospect.stage;
            const allTabs = [
              { id: "info", label: "Info", icon: Building2, minStage: "lead" },
              { id: "timeline", label: "Timeline", icon: Clock, minStage: "prospecto" },
              { id: "notas", label: "Notas", icon: StickyNote, minStage: "lead" },
              { id: "reuniones", label: "Reuniones", icon: Users, minStage: "prospecto" },
              { id: "documentos", label: "Docs", icon: FileText, minStage: "prospecto" },
              { id: "propuestas", label: "Propuestas", icon: FileCheck, minStage: "propuesta" },
              { id: "levantamiento", label: "Levantamiento", icon: Target, minStage: "levantamiento" },
            ];

            const stageOrder = ["lead", "prospecto", "levantamiento", "propuesta", "negociacion", "cierre", "rechazada"];
            const currentIdx = stageOrder.indexOf(stage);
            // Rechazada shows all tabs
            const isRechazada = stage === "rechazada";

            return allTabs
              .filter((tab) => isRechazada || currentIdx >= stageOrder.indexOf(tab.minStage))
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ));
          })()}
```

**Step 5: Update canSend guard**

Change line 102 from:

```typescript
  const canSend = prospect.stage === "lead" && !prospect.surveyId;
```

To:

```typescript
  const canSend = prospect.stage === "prospecto" && !prospect.surveyId;
  const canQualify = prospect.stage === "lead";
```

**Step 6: Add qualify button in footer**

Update the footer section (lines 169-186). Currently it only shows for the "levantamiento" tab. Change to also show a qualify button when the stage is "lead":

```typescript
        {/* Footer */}
        {(activeTab === "levantamiento" || canQualify) && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <div className="text-xs text-muted-foreground">
              {isSaving ? "Guardando..." : ""}
            </div>
            <div className="flex gap-2">
              {activeTab === "levantamiento" && (
                <>
                  <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                    Guardar
                  </Button>
                  {canSend && (
                    <Button onClick={() => setShowConfirmSend(true)} disabled={sendToOps.isPending}>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar a Operaciones
                    </Button>
                  )}
                </>
              )}
              {canQualify && (
                <Button onClick={() => setShowQualify(true)}>
                  <Target className="mr-2 h-4 w-4" />
                  Calificar como Prospecto
                </Button>
              )}
            </div>
          </div>
        )}
```

**Step 7: Add QualifyModal component and render it**

After the confirm send dialog (after line 207), add the qualify modal:

```typescript
      {showQualify && (
        <QualifyModal
          onClose={() => setShowQualify(false)}
          isPending={qualifyProspect.isPending}
          onSubmit={async (data) => {
            try {
              await qualifyProspect.mutateAsync({ id: prospect.id, ...data });
              toast({ title: "Lead calificado como Prospecto" });
              setShowQualify(false);
              onClose();
            } catch (err: any) {
              toast({ title: err?.message || "Error al calificar", variant: "destructive" });
            }
          }}
        />
      )}
```

**Step 8: Create QualifyModal component**

At the bottom of the file (before the `LevantamientoTab` function), add:

```typescript
function QualifyModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    industry: "",
    potential: "Medio",
    estimatedValue: "",
    estimatedVolume: "",
    probability: 50,
    priority: "media",
    contactRole: "",
    contactEmail: "",
    reason: "",
    nextStep: "",
  });

  const set = (key: string, val: any) => setForm({ ...form, [key]: val });

  const handleSubmit = () => {
    if (!form.industry) return;
    onSubmit({
      industry: form.industry,
      potential: form.potential,
      estimatedValue: form.estimatedValue || undefined,
      estimatedVolume: form.estimatedVolume || undefined,
      probability: form.probability,
      priority: form.priority,
      contactRole: form.contactRole || undefined,
      contactEmail: form.contactEmail || undefined,
      reason: form.reason || undefined,
      nextStep: form.nextStep || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-lg bg-background p-6 shadow-lg">
        <h3 className="text-lg font-bold">Calificar Lead</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Agrega la información comercial para convertirlo en Prospecto
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Industria *</Label>
            <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Ej: Manufactura" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Potencial</Label>
            <select value={form.potential} onChange={(e) => set("potential", e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="Bajo">Bajo</option>
              <option value="Medio">Medio</option>
              <option value="Alto">Alto</option>
              <option value="Muy Alto">Muy Alto</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Valor estimado</Label>
            <Input type="number" value={form.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)} placeholder="$" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Volumen estimado</Label>
            <Input value={form.estimatedVolume} onChange={(e) => set("estimatedVolume", e.target.value)} placeholder="Ej: 50 ton/mes" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Probabilidad %</Label>
            <Input type="number" min={0} max={100} value={form.probability} onChange={(e) => set("probability", Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Prioridad</Label>
            <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="muy_alta">Muy Alta</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Rol del contacto</Label>
            <Input value={form.contactRole} onChange={(e) => set("contactRole", e.target.value)} placeholder="Ej: Director de Operaciones" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Email contacto</Label>
            <Input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="correo@empresa.com" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Razón de interés</Label>
            <Input value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="¿Por qué están interesados?" className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Siguiente paso</Label>
            <Input value={form.nextStep} onChange={(e) => set("nextStep", e.target.value)} placeholder="Ej: Agendar presentación" className="mt-1" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending || !form.industry}>
            {isPending ? "Calificando..." : "Calificar como Prospecto"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 9: Update InfoTab for progressive display**

Replace the `InfoTab` function (lines 212-253) to show fields based on stage:

```typescript
function InfoTab({ prospect }: { prospect: any }) {
  const isLead = prospect.stage === "lead";

  return (
    <div className="space-y-4">
      {/* Always shown: basic info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <InfoRow label="Empresa" value={prospect.name} />
        <InfoRow label="Ubicacion" value={prospect.location} />
        {prospect.source && <InfoRow label="Fuente" value={prospect.source} />}
      </div>

      {/* Contact info — always shown */}
      {prospect.contactName && (
        <div className="rounded-lg border p-3">
          <h3 className="mb-2 text-sm font-semibold">Contacto</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoRow label="Nombre" value={prospect.contactName} />
            {!isLead && <InfoRow label="Rol" value={prospect.contactRole} />}
            <InfoRow label="Telefono" value={prospect.contactPhone} />
            {!isLead && <InfoRow label="Email" value={prospect.contactEmail} />}
          </div>
        </div>
      )}

      {/* Commercial info — only for prospecto+ */}
      {!isLead && (
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoRow label="Industria" value={prospect.industry} />
          <InfoRow label="Potencial" value={prospect.potential} />
          <InfoRow label="Probabilidad" value={`${prospect.probability}%`} />
          <InfoRow
            label="Valor Estimado"
            value={prospect.estimatedValue ? `$${Number(prospect.estimatedValue).toLocaleString("es-MX")}` : undefined}
          />
          <InfoRow label="Volumen Estimado" value={prospect.estimatedVolume} />
          <InfoRow label="Tiempo Cierre" value={prospect.estimatedCloseTime} />
          <InfoRow label="Prioridad" value={prospect.priority?.replace("_", " ")} />
        </div>
      )}

      {!isLead && prospect.lastActivity && (
        <InfoRow label="Ultima actividad" value={prospect.lastActivity} />
      )}
      {!isLead && prospect.nextStep && (
        <InfoRow label="Siguiente paso" value={prospect.nextStep} />
      )}
      {!isLead && prospect.reason && (
        <InfoRow label="Razon de interes" value={prospect.reason} />
      )}
      {!isLead && prospect.risk && <InfoRow label="Riesgo" value={prospect.risk} />}
      {!isLead && prospect.opportunity && <InfoRow label="Oportunidad" value={prospect.opportunity} />}
    </div>
  );
}
```

**Step 10: Run TypeScript check**

Run: `npm run check`
Expected: PASS.

**Step 11: Commit**

```bash
git add client/src/features/comercial/components/ProspectDetail.tsx
git commit -m "feat(frontend): progressive tabs, qualify modal, and stage-aware info display"
```

---

## Task 8: Verify everything works — run dev server and test

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on port 4000 without errors.

**Step 2: Manual test checklist**

1. Open pipeline page → verify "Nuevo Lead" button is visible
2. Click "Nuevo Lead" → modal shows only 5 fields (empresa, contacto, ubicacion, fuente, telefono)
3. Create a lead → appears in pipeline under "Leads" column, card shows only name + contacto + ubicacion
4. Click the lead → detail opens with only Info + Notas tabs
5. Info tab shows only basic fields (no industria, no valor, no probabilidad)
6. Click "Calificar como Prospecto" → qualify modal opens with commercial fields
7. Fill in industry, potential, probability → submit → prospect moves to "Prospecto" stage
8. Card now shows industry, value, probability
9. Detail now shows Timeline, Reuniones, Docs tabs
10. Verify pipeline funnel shows 6 columns including "Prospectos"

**Step 3: Run TypeScript check one final time**

Run: `npm run check`
Expected: PASS with no new errors.

**Step 4: Final commit**

If any small fixes were needed during testing, commit them:

```bash
git add -A
git commit -m "fix: adjustments from progressive lead flow testing"
```
