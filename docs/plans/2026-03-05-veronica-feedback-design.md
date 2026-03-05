# Feedback Verónica — Diseño de Cambios

**Fecha**: 2026-03-05
**Solicitado por**: Verónica Arias (Directora Comercial)
**Enfoque**: Incremental por área

---

## Resumen

Verónica envió feedback sobre la app comercial. Los cambios simplifican la interfaz, renombran "Pipeline" a "Presupuesto", eliminan secciones innecesarias, y agregan campos clave para que los ejecutivos registren datos de propuesta que alimentan el dashboard de presupuesto.

---

## Sección 1: Rename UI — "Pipeline" → "Presupuesto"

**Alcance**: Solo textos visibles al usuario. No se tocan variables internas, rutas API, ni schema.

**Archivos afectados** (5 archivos cliente):
- `App.jsx` — ~76 ocurrencias
- `comercial/page.tsx` — ~14
- `ProspectDetail.tsx` — ~15
- `comercial/api.ts` — ~9 (solo comentarios)
- `auth/page.tsx` — ~2

**Cambios concretos**:

| Texto actual | Texto nuevo |
|---|---|
| "Pipeline Total" | "Presupuesto Total" |
| "Pipeline por Ejecutivo" | "Presupuesto por Ejecutivo" |
| "Pipeline por Stage" | "Presupuesto por Etapa" |
| Tab "Pipeline" | Tab "Presupuesto" (este tab se elimina en sección 2) |
| "Pipeline Comercial" | "Presupuesto Comercial" |
| "Pipelined Ponderado" | "Presupuesto Ponderado" |

---

## Sección 2: Dashboard Comercial — Simplificar

**Componente**: PipelineComercialView en `App.jsx` (~líneas 7487-8556)

### 2a. Cards del header
- **Quitar**: 3 mini-cards genéricas (Oportunidades, Win Rate, Propuestas Pendientes)
- **Quitar**: Cards grandes (Pipeline por Stage, Top 3 Oportunidades, Historial Anual)
- **Dejar**: 1 sola card prominente de **Presupuesto Mensual** (meta vs real, % cumplimiento)

### 2b. Tarjetas del equipo — SE QUEDAN + agregar Verónica
- Mantener la tabla/grid de ejecutivos con métricas
- Agregar a Verónica como miembro del equipo con su tarjeta y métricas
- Renombrar columna "Pipeline" por "Presupuesto"

### 2c. Eliminar tab "Pipeline"
- Quedan solo 2 tabs: **Presupuesto** | **Rechazadas**

### 2d. Quitar botón "+Nuevo Lead"
- Eliminar del header del dashboard comercial

### 2e. Pestaña Presupuesto — agregar tabla de cuentas
- **Mantener**: Gráfica mensual + tabla ventas reales por ejecutivo
- **Agregar**: Tabla "Cuentas del Mes" — todos los prospectos activos agrupados por mes de cierre estimado
  - Columnas: Empresa, Ejecutivo, Etapa, Mes cierre, Venta Total, % Margen

---

## Sección 3: Presupuesto Detallado — Solo Tabla

**Componente**: Vista de Pipeline Detallado en `App.jsx`

### 3a. Quitar vista Kanban
- Eliminar toggle Kanban/Tabla
- Dejar únicamente la vista de tabla

### 3b. Agregar columna "Venta Total"
- Mostrar `propuesta.ventaTotal` por prospecto
- Formato moneda (ej: $1,358,778)
- Fallback a `facturacionEstimada` o "—" si no hay dato

---

## Sección 4: Pestaña Rechazadas — Simplificar + Pie Chart

**Componente**: Tab Rechazadas en `App.jsx` (~líneas 8432-8551)

### 4a. Quitar sub-secciones
- **Eliminar**: Cards "Recuperables", "En Seguimiento", "Vencidas"
- **Eliminar**: Funnel de Recuperación completo
- **Mantener**: Card "Total Rechazadas"
- **Mantener**: Lista detallada por categoría

### 4b. Agregar gráfica de pastel
- Distribución de razones de rechazo por categoría
- Ej: 60% Precios, 25% Propuesta, 15% Operativo
- Colores: Precios (#F59E0B), Propuesta (#3B82F6), Operativo (#6b7280)

**Resultado final**: Card Total → Pie Chart → Lista por categoría

---

## Sección 5: Tarjeta Ejecutivo — Campos Nuevos

### 5a. Campo de fecha al crear nuevo lead
- Agregar date picker al formulario de nuevo lead
- Campo: "Fecha de primer contacto" (default: hoy, editable)
- Aplica en: `NewLeadModal` (App.jsx) y `LeadForm.tsx`

### 5b. Campos nuevos en Propuesta
Agregar al modal/formulario de propuesta del ejecutivo:

| Campo | Tipo | Descripción |
|---|---|---|
| Mes de cierre estimado | Selector mes/año | Mes en que piensan cerrar (ej: "Abril 2026") |
| Venta Total | Input numérico | Monto total de la venta ($) |
| % Margen de utilidad | Input numérico | Porcentaje de margen (ej: 10.7%) |

### 5c. Conexión con Dashboard Presupuesto
- **Mes de cierre** → determina en qué mes aparece el prospecto en "Cuentas del Mes"
- **Venta total** y **% margen** → se muestran en columnas correspondientes
- Flujo: Ejecutivo llena propuesta → datos aparecen automáticamente en Dashboard Comercial > Presupuesto > Cuentas del Mes

---

## Orden de Implementación

1. Rename UI "Pipeline" → "Presupuesto" (bajo riesgo, impacto visual inmediato)
2. Dashboard Comercial (simplificar cards, quitar tab, quitar botón, agregar cuentas)
3. Presupuesto Detallado (quitar Kanban, agregar columna)
4. Rechazadas (quitar sub-secciones, agregar pie chart)
5. Tarjeta Ejecutivo (campos fecha + propuesta + conexión datos)
