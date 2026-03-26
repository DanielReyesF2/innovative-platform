# Verónica Feedback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Verónica's commercial dashboard feedback — rename Pipeline→Presupuesto, simplify dashboard, add pie chart for rejections, add proposal fields, connect data to budget view.

**Architecture:** All changes are in the frontend monolith (`client/src/App.jsx` ~13K lines). Data is currently hardcoded in state arrays (not from DB). The approach is incremental by area: rename first, then simplify dashboard, then modify table, then rechazadas, then new fields.

**Tech Stack:** React, Recharts (PieChart already imported), Lucide icons, inline Tailwind-style CSS objects.

---

### Task 1: Rename UI — "Pipeline" → "Presupuesto"

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/features/comercial/page.tsx`
- Modify: `client/src/features/auth/page.tsx`

**Step 1: Rename in App.jsx — all 12 user-visible strings**

Replace each of these strings (exact locations):

| Line | Old String | New String |
|------|-----------|------------|
| ~5756 | `"Pipeline por Ejecutivo"` | `"Presupuesto por Ejecutivo"` |
| ~5794 | `"Ver Pipeline"` | `"Ver Presupuesto"` |
| ~5818 | `"Pipeline por Stage"` | `"Presupuesto por Etapa"` |
| ~6607 | `"Días en pipeline"` | `"Días en presupuesto"` |
| ~7175 | `pipeline` (in template literal after $M) | `presupuesto` |
| ~7659 | `"Tu pipeline comercial al momento"` | `"Tu presupuesto comercial al momento"` |
| ~7769 | `pipeline` (in template literal after $M) | `presupuesto` |
| ~7779 | `{ id: 'pipeline', label: 'Pipeline', icon: ClipboardList }` | `{ id: 'pipeline', label: 'Presupuesto', icon: ClipboardList }` (keep id for now, change label only) |
| ~8050 | `"Pipeline por Ejecutivo"` | `"Presupuesto por Ejecutivo"` |
| ~8115 | `"Pipeline Detallado"` | `"Presupuesto Detallado"` |
| ~8439 | `"activas en el pipeline"` | `"activas en el presupuesto"` |
| ~9200 | `"Flujo, conversión y velocidad del pipeline"` | `"Flujo, conversión y velocidad del presupuesto"` |

**Step 2: Rename in comercial/page.tsx**

| Line | Old String | New String |
|------|-----------|------------|
| ~71 | `"Pipeline Comercial"` | `"Presupuesto Comercial"` |
| ~101 | Tab label `"Pipeline"` | `"Presupuesto"` |

**Step 3: Rename in auth/page.tsx**

| Line | Old String | New String |
|------|-----------|------------|
| ~60 | `"pipeline comercial"` | `"presupuesto comercial"` |

**Step 4: Verify no visible "Pipeline" strings remain**

Run: Search all client files for user-visible "Pipeline" or "pipeline" strings and confirm none remain.

**Step 5: Commit**

```bash
git add client/src/App.jsx client/src/features/comercial/page.tsx client/src/features/auth/page.tsx
git commit -m "refactor(ui): rename Pipeline → Presupuesto across all visible UI labels"
```

---

### Task 2: Dashboard Comercial — Remove cards, keep team grid, remove tab + button

**Files:**
- Modify: `client/src/App.jsx`

**Step 1: Remove 3 mini-cards (Oportunidades, Win Rate, Propuestas Pendientes)**

Delete lines ~5796-5812 — the entire `<div className="grid grid-cols-2 lg:grid-cols-3 gap-3">` block containing the 3 cards.

**Step 2: Remove large cards (Pipeline por Stage, Top 3 Oportunidades, Historial Anual)**

Delete lines ~5814-5879 — the entire `<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">` block containing Pipeline por Stage + Top 3 + Historial.

**Step 3: Add 1 prominent Presupuesto Mensual card**

In place of the deleted cards, insert a single card:

```jsx
{/* PRESUPUESTO MENSUAL — CARD PRINCIPAL */}
<div className="bg-gradient-to-r from-[#1c2c4a] to-[#0D47A1] rounded-xl p-6 text-white">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-lg font-bold">Presupuesto Mensual</h3>
      <p className="text-sm text-white/70">{['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][new Date().getMonth()]} {new Date().getFullYear()}</p>
    </div>
    <DollarSign size={28} className="text-white/40" />
  </div>
  <div className="grid grid-cols-3 gap-6">
    <div>
      <div className="text-xs text-white/60 mb-1">Meta del Mes</div>
      <div className="text-2xl font-bold">${(presupuestoMesEquipo / 1000000).toFixed(1)}M</div>
    </div>
    <div>
      <div className="text-xs text-white/60 mb-1">Ventas Reales</div>
      <div className="text-2xl font-bold">${(ventasRealesEquipo / 1000000).toFixed(1)}M</div>
    </div>
    <div>
      <div className="text-xs text-white/60 mb-1">Cumplimiento</div>
      <div className={`text-2xl font-bold ${presupuestoMesEquipo > 0 ? ((ventasRealesEquipo / presupuestoMesEquipo) * 100 >= 70 ? 'text-green-300' : (ventasRealesEquipo / presupuestoMesEquipo) * 100 >= 40 ? 'text-yellow-300' : 'text-red-300') : ''}`}>
        {presupuestoMesEquipo > 0 ? ((ventasRealesEquipo / presupuestoMesEquipo) * 100).toFixed(0) : 0}%
      </div>
    </div>
  </div>
  <div className="mt-4 w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
    <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${Math.min(presupuestoMesEquipo > 0 ? (ventasRealesEquipo / presupuestoMesEquipo) * 100 : 0, 100)}%` }} />
  </div>
</div>
```

**Step 4: Remove Pipeline tab from tab bar**

At line ~7778-7781, change the tab array from 3 items to 2 — remove the pipeline entry:

```jsx
{[
  { id: 'presupuesto', label: 'Presupuesto', icon: DollarSign },
  { id: 'rechazadas', label: 'Rechazadas', icon: RotateCcw, badge: kanbanProspectos.filter(p => p.status === 'Propuesta Rechazada').length },
].map(tab => (
```

Also update the default `comercialTab` state init from `'pipeline'` to `'presupuesto'`. Search for `useState('pipeline')` near line ~4900 and change to `useState('presupuesto')`.

**Step 5: Remove "+Nuevo Lead" button**

Delete the button at line ~7662-7668:
```jsx
<button onClick={() => setShowNuevoLead(true)} className="...">
  <Plus size={16} /> Nuevo Lead
</button>
```

Also remove the one at line ~6891-6895 in the Hub Ejecutivo section (same pattern).

**Step 6: Confirm team grid is intact**

Verify lines ~6042-6093 (team table with Pipeline $M, Opps, Leads/S, etc.) are untouched. Rename the "Pipeline" column header to "Presupuesto" in that table.

**Step 7: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat(comercial): simplify dashboard — 1 presupuesto card, remove pipeline tab + nuevo lead button"
```

---

### Task 3: Presupuesto Detallado — Remove Kanban, keep only Table + add Venta Total column

**Files:**
- Modify: `client/src/App.jsx`

**Step 1: Remove the view toggle (Kanban/Tabla)**

Delete lines ~8117-8137 — the entire view toggle div. Also remove the `pipelineViewMode` state usage or force it to always be `'tabla'`.

**Step 2: Remove the Kanban view**

Delete lines ~8236-8337 — the entire `{/* KANBAN VIEW */}` block including the DndContext wrapper.

**Step 3: Make table always visible**

Change line ~8341 from:
```jsx
{pipelineViewMode === 'tabla' && (() => {
```
to just render unconditionally (remove the condition, keep the IIFE or convert to direct JSX).

**Step 4: Add "Venta Total" column to the table**

In the `<thead>` at lines ~8358-8365, add after the Ejecutivo column:
```jsx
<th className="px-3 py-3 text-right text-xs font-semibold text-[#6b7280]">Venta Total</th>
```

In the `<tbody>` row at lines ~8374-8411, add after the Ejecutivo `<td>` (after line ~8403):
```jsx
<td className="px-3 py-2.5 text-right">
  <span className="text-sm font-semibold text-[#0D47A1]">
    {p.propuesta?.ventaTotal
      ? `$${(p.propuesta.ventaTotal / 1000000).toFixed(2)}M`
      : p.facturacionEstimada
        ? `$${(p.facturacionEstimada / 1000000).toFixed(2)}M`
        : '—'}
  </span>
</td>
```

Update the footer colSpan from 5 to 6 at line ~8418.

**Step 5: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat(comercial): remove kanban view, add Venta Total column to presupuesto table"
```

---

### Task 4: Rechazadas — Remove sub-sections, add Pie Chart

**Files:**
- Modify: `client/src/App.jsx`

**Step 1: Remove 3 summary cards (Recuperables, En Seguimiento, Vencidas)**

At lines ~8458-8479, change the grid from `grid-cols-4` to a single card. Keep only the "Total Rechazadas" card (lines 8459-8463). Delete the other 3 cards (lines 8464-8478).

Change the container from `grid grid-cols-2 md:grid-cols-4` to just a single element or a `flex` with one card.

**Step 2: Remove Recovery Funnel**

Delete lines ~8481-8502 — the entire "Funnel de Recuperacion" div.

**Step 3: Add Pie Chart**

After the Total Rechazadas card and before the category list, insert:

```jsx
{/* PIE CHART — Distribución de Rechazos */}
<div className="bg-white rounded-xl border border-[#e5e7eb] p-4">
  <h4 className="text-xs font-semibold text-[#1c2c4a] mb-3">Distribución de Rechazos</h4>
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={Object.entries(byCat).map(([catId, items]) => ({
            name: RECHAZO_CATEGORIES[catId].label,
            value: items.length,
            color: RECHAZO_CATEGORIES[catId].color,
          })).filter(d => d.value > 0)}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {Object.entries(byCat).filter(([, items]) => items.length > 0).map(([catId]) => (
            <Cell key={catId} fill={RECHAZO_CATEGORIES[catId].color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value} rechazadas`, '']} />
      </PieChart>
    </ResponsiveContainer>
  </div>
</div>
```

Note: `PieChart`, `Pie`, `Cell`, `Tooltip`, `ResponsiveContainer` are already imported at line ~13.

**Step 4: Clean up unused variables**

Remove the `byRecovery`, `overdue`, `recoverable` variables from lines ~8443-8450 since they're no longer used. Keep `byCat` and `totalValue`.

**Step 5: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat(rechazadas): replace recovery funnel with pie chart, remove sub-section cards"
```

---

### Task 5: New Lead Form — Add date field

**Files:**
- Modify: `client/src/App.jsx`

**Step 1: Add fechaPrimerContacto to nuevoLeadForm state**

At line ~4856-4860, add the new field:

```jsx
const [nuevoLeadForm, setNuevoLeadForm] = useState({
  empresa: '', ciudad: '',
  contactoNombre: '', contactoCorreo: '', contactoTelefono: '',
  fuente: 'otro', comentarios: '', ejecutivo: '',
  fechaPrimerContacto: new Date().toISOString().split('T')[0],
});
```

**Step 2: Add date field to the modal form**

After the "SECCIÓN 2: CONTACTO" block (after line ~11455) and before "SECCIÓN 3: FUENTE" (line ~11457), add a new section:

```jsx
{/* SECCIÓN: FECHA */}
<div>
  <h4 className="text-sm font-semibold text-[#1c2c4a] mb-3 flex items-center gap-2">
    <Calendar size={16} className="text-[#F59E0B]" />
    Fecha
  </h4>
  <div>
    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Fecha de Primer Contacto *</label>
    <input type="date" value={nuevoLeadForm.fechaPrimerContacto}
      onChange={e => setNuevoLeadForm(prev => ({...prev, fechaPrimerContacto: e.target.value}))}
      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]" />
  </div>
</div>
```

**Step 3: Include date in the submit handler**

At the submit handler near line ~5321-5352, add `fechaPrimerContacto` to the new prospect object:

```jsx
fecha: nuevoLeadForm.fechaPrimerContacto || null,
```

**Step 4: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat(leads): add fecha de primer contacto field to new lead form"
```

---

### Task 6: Proposal Fields — Mes de cierre, Venta Total editable, % Margen

**Files:**
- Modify: `client/src/App.jsx`

**Step 1: Add fields to prospect data structure**

In the existing `kanbanProspectos` array (hardcoded data starting ~line 280), add to each prospect's `propuesta` object:

```javascript
propuesta: {
  status: '...',
  ventaTotal: ...,
  utilidad: ...,
  mesCierre: null,    // NEW — format: '2026-04' (year-month string)
  carton: null,
  playo: null,
}
```

Add `mesCierre` to at least the prospects that have propuestas (IDs 1, 2, 3, etc.) with sample values like `'2026-04'`, `'2026-05'`.

**Step 2: Add editable fields to the Proposal Modal**

In the Propuesta Modal at lines ~12542-12623, after the existing 3 info cards (Valor, Volumen, Status — lines 12557-12572), add a new editable section:

```jsx
{/* CAMPOS EDITABLES — Propuesta */}
<div className="grid grid-cols-3 gap-4 mb-6">
  <div>
    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Mes de Cierre Estimado</label>
    <input type="month"
      value={selectedProspecto.propuesta?.mesCierre || ''}
      onChange={e => {
        const updated = { ...selectedProspecto, propuesta: { ...selectedProspecto.propuesta, mesCierre: e.target.value } };
        setSelectedProspecto(updated);
        setKanbanProspectos(prev => prev.map(p => p.id === updated.id ? updated : p));
      }}
      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]" />
  </div>
  <div>
    <label className="text-xs font-medium text-[#6b7280] mb-1 block">Venta Total ($)</label>
    <input type="number"
      value={selectedProspecto.propuesta?.ventaTotal || ''}
      onChange={e => {
        const updated = { ...selectedProspecto, propuesta: { ...selectedProspecto.propuesta, ventaTotal: Number(e.target.value) || 0 } };
        setSelectedProspecto(updated);
        setKanbanProspectos(prev => prev.map(p => p.id === updated.id ? updated : p));
      }}
      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
      placeholder="0" />
  </div>
  <div>
    <label className="text-xs font-medium text-[#6b7280] mb-1 block">% Margen de Utilidad</label>
    <input type="number" step="0.1" min="0" max="100"
      value={selectedProspecto.propuesta?.utilidad ? (selectedProspecto.propuesta.utilidad * 100).toFixed(1) : ''}
      onChange={e => {
        const updated = { ...selectedProspecto, propuesta: { ...selectedProspecto.propuesta, utilidad: Number(e.target.value) / 100 } };
        setSelectedProspecto(updated);
        setKanbanProspectos(prev => prev.map(p => p.id === updated.id ? updated : p));
      }}
      className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a8a8]/50 focus:border-[#00a8a8]"
      placeholder="10.5" />
  </div>
</div>
```

**Step 3: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat(propuesta): add mes de cierre, venta total, margen de utilidad editable fields"
```

---

### Task 7: Presupuesto Tab — "Cuentas del Mes" table connected to proposals

**Files:**
- Modify: `client/src/App.jsx`

**Step 1: Add "Cuentas del Mes" table to Presupuesto tab**

In the Presupuesto tab section (after the existing ventas reales table, around line ~8014 before the Volumen por Material section at ~8016), add:

```jsx
{/* CUENTAS DEL MES — Prospectos agrupados por mes de cierre */}
<div className="bg-white rounded-xl border border-[#e5e7eb] shadow-sm overflow-hidden">
  <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-between bg-[#f9fafb]">
    <h4 className="text-sm font-semibold text-[#1c2c4a] flex items-center gap-2">
      <Users size={15} className="text-[#00a8a8]" />
      Cuentas del Mes
    </h4>
    <span className="text-xs text-[#6b7280]">Prospectos activos con propuesta</span>
  </div>
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-[#f3f4f6] border-b border-[#e5e7eb]">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6b7280]">Empresa</th>
          <th className="px-3 py-3 text-left text-xs font-semibold text-[#6b7280]">Ejecutivo</th>
          <th className="px-3 py-3 text-left text-xs font-semibold text-[#6b7280]">Etapa</th>
          <th className="px-3 py-3 text-left text-xs font-semibold text-[#6b7280]">Mes Cierre</th>
          <th className="px-3 py-3 text-right text-xs font-semibold text-[#6b7280]">Venta Total</th>
          <th className="px-3 py-3 text-right text-xs font-semibold text-[#6b7280]">% Margen</th>
        </tr>
      </thead>
      <tbody>
        {kanbanProspectos
          .filter(p => p.status !== 'Propuesta Rechazada' && p.propuesta?.mesCierre)
          .sort((a, b) => (a.propuesta?.mesCierre || '').localeCompare(b.propuesta?.mesCierre || ''))
          .map(p => {
            const ejecutivo = salesTeamData.find(e => e.codigo === p.ejecutivo);
            const stage = KANBAN_STAGES.find(s => s.id === p.status);
            const [y, m] = (p.propuesta?.mesCierre || '').split('-');
            const mesLabel = m ? `${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(m, 10) - 1]} ${y}` : '—';
            return (
              <tr key={p.id} className="border-b border-[#e5e7eb] hover:bg-[#f9fafb] cursor-pointer transition-colors"
                onClick={() => { setSelectedProspecto(p); setMostrarDetallesProspecto(true); }}>
                <td className="px-4 py-2.5">
                  <div className="text-sm font-semibold text-[#1c2c4a]">{p.empresa}</div>
                  {p.planta && <div className="text-[11px] text-[#9ca3af]">{p.planta}</div>}
                </td>
                <td className="px-3 py-2.5 text-xs text-[#6b7280]">{ejecutivo?.name?.split(' ').slice(0, 2).join(' ') || p.ejecutivo}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${stage?.color}15`, color: stage?.color, border: `1px solid ${stage?.color}30` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage?.color }}></span>
                    {stage?.label || p.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs font-medium text-[#1c2c4a]">{mesLabel}</td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-[#0D47A1]">
                  {p.propuesta?.ventaTotal ? `$${(p.propuesta.ventaTotal / 1000000).toFixed(2)}M` : '—'}
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-medium text-[#1c2c4a]">
                  {p.propuesta?.utilidad ? `${(p.propuesta.utilidad * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
            );
          })}
      </tbody>
      <tfoot className="bg-[#f3f4f6] border-t-2 border-[#e5e7eb]">
        <tr>
          <td className="px-4 py-3 text-sm font-bold text-[#1c2c4a]" colSpan={4}>
            Total: {kanbanProspectos.filter(p => p.status !== 'Propuesta Rechazada' && p.propuesta?.mesCierre).length} cuentas
          </td>
          <td className="px-3 py-3 text-right text-sm font-bold text-[#0D47A1]">
            ${(kanbanProspectos
              .filter(p => p.status !== 'Propuesta Rechazada' && p.propuesta?.mesCierre)
              .reduce((s, p) => s + (p.propuesta?.ventaTotal || 0), 0) / 1000000).toFixed(2)}M
          </td>
          <td className="px-3 py-3"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</div>
```

**Step 2: Add mesCierre data to existing prospects**

In the hardcoded `kanbanProspectos` / `topProspectos` array, add `mesCierre` values to prospects that have propuestas:

- Liverpool Plan (ID 1): `mesCierre: '2026-04'`
- Grupo Alsea (ID 2): `mesCierre: '2026-03'`
- FEMSA (ID 3): `mesCierre: '2026-05'`
- Add to any other prospects with active propuestas

**Step 3: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat(presupuesto): add Cuentas del Mes table connected to proposal data"
```

---

### Task 8: Final verification and cleanup

**Files:**
- Modify: `client/src/App.jsx` (if needed)

**Step 1: Search for remaining "Pipeline" strings**

Search all client files for any remaining user-visible "Pipeline" or "pipeline" strings that were missed.

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: No type errors.

**Step 3: Run dev server and verify**

Run: `npm run dev`

Manual verification checklist:
- [ ] No "Pipeline" text visible anywhere in UI
- [ ] Dashboard Comercial shows 1 Presupuesto Mensual card (no mini-cards, no Pipeline/Top3/Historial)
- [ ] Team grid visible with all ejecutivos including Verónica
- [ ] Only 2 tabs: Presupuesto | Rechazadas
- [ ] No "+Nuevo Lead" button
- [ ] Presupuesto Detallado shows only table (no Kanban toggle)
- [ ] Table has Venta Total column
- [ ] Rechazadas shows Total card + Pie Chart + Category list (no Recuperables/Seguimiento/Vencidas/Funnel)
- [ ] New Lead form has date field
- [ ] Proposal modal has Mes Cierre, Venta Total, % Margen fields
- [ ] Cuentas del Mes table appears in Presupuesto tab with data from proposals

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: final cleanup and verification of Verónica feedback changes"
```
