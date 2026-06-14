# Diseño: Puente Levantamiento → Bandeja → Cotización (Subproductos v1)

**Fecha:** 2026-06-13
**Módulo:** `subproductos` (HUB Digital — Innovative Group)
**Prioridad:** P0 — revenue directo
**Origen:** Junta "Hub Digital Soporte Comercial" (jue 11 jun 2026) con Juan Manuel Moreno (dir. comercial), Sandra Ríos, Anahí Lugardo, Verónica Arias, Ricardo Maciel, Cristina Rodríguez.

---

## 1. Problema (en palabras del cliente)

Juan Manuel, min 14:40 de la junta:

> "Que en la plataforma tengamos la información clara del prospecto: el alcance de la licitación, los volúmenes, los tipos de residuos, los servicios que se necesitan, las frecuencias de recolección — todo el levantamiento operativo con el detalle de la calidad de los materiales — para que nosotros podamos hacer la cotización de manera correcta."

Hoy ese traspaso ocurre por **correo y WhatsApp**. La plataforma anterior falló por: subida de archivos rota, notificaciones que no llegaban, no aguantó volumen, y era tediosa (abrir varias plataformas/tickets).

### Causa raíz en el código actual

1. **No hay puente.** El levantamiento vive en el módulo `operaciones` (tabla `surveys` + 12 colecciones hijas + versionado con aprobación de Luis). El trabajo de cotización vive en `subproductos` (`economicModels`). **No están ligados** — `economicModels` no tiene `surveyId`.
2. **No hay bandeja.** La página de subproductos solo muestra trazabilidad de clientes ya activos. El equipo de Sandra **no tiene dónde "recibir"** un levantamiento aprobado para cotizarlo.

---

## 2. Alcance v1

**Dentro:**
- Disparador automático: al aprobar Luis un levantamiento → aparece en la bandeja de subproductos.
- Bandeja con ciclo de vida de 4 estados + KPI de tiempos.
- Detalle a dos columnas: levantamiento (solo-lectura) + formulario de modelo económico/cotización.
- VoBo (visto bueno) por rol director, con rechazo-y-regreso.
- Notificación in-app (badge de "Recibidos").

**Fuera (explícito):**
- ❌ Manifiestos y permisos → Fase 2 (el cliente lo aplazó).
- ❌ Subida de archivos / bucket GCS → no lo toca este puente; las fotos viven en el snapshot de operaciones.
- ❌ Notificación por correo/push → v1 es in-app. Email después.

---

## 3. Flujo de punta a punta

```
OPERACIONES (Luis)                    SUBPRODUCTOS (Sandra, Anahí, Cristina)
─────────────────                     ──────────────────────────────────────
Levantamiento "completado"
   ↓
Luis aprieta "Aprobar"  ──────────►  Aparece automático en la BANDEJA
(approveSurvey congela versión vN)       estado: RECIBIDO  ⏱️ arranca cronómetro
                                              ↓ alguien lo toma
                                         EN_COTIZACION (arma modelo económico)
                                              ↓ modelo listo
                                         EN_VOBO (espera visto bueno)
                                              ↓ Juan Manuel / Vero aprueban
                                         APROBADO  ⏱️ para cronómetro → se envía
```

### Punto de enganche
`server/modules/operaciones/storage.ts` → función `approveSurvey(id, approvedById, notes)` (línea ~812). Hoy: cambia survey a `pendiente_revision`, fija `approvedAt`, y llama `resolveLatestPendingVersion(id, "aprobado", approvedById)`.

**Inyección:** justo después de resolver la versión como `aprobado`, llamar a una función de subproductos `createCotizacionFromApprovedSurvey(survey, approvedVersion)`.

- Import unidireccional `operaciones/storage → subproductos/storage`. No hay ciclo (subproductos no importa operaciones).
- Si la creación falla, **no debe romper la aprobación** (envolver en try/catch con `console.error('[operaciones→subproductos]', ...)`; la aprobación es la operación crítica).

### Qué "se manda"
No se duplican datos. El levantamiento completo ya queda congelado en `surveyVersions.snapshot` (JSONB con survey + 12 colecciones hijas). La bandeja **referencia** `surveyId` + `surveyVersionId`. El detalle renderiza ese snapshot de solo-lectura.

---

## 4. Modelo de datos — Extender `economicModels`

Decisión: **el modelo económico ES la propuesta/cotización** (confirmado por Daniel). El ítem de la bandeja y el modelo son la misma entidad moviéndose por estados. Una tabla, un ciclo de vida.

### Cambios a `shared/schema/subproductos.ts` → `economicModels`

Columnas nuevas:
- `surveyId integer` — **sin FK dura** (columna entera simple, igual que `prospects.surveyId`, para evitar el import circular operaciones↔subproductos documentado en CLAUDE.md).
- `surveyVersionId integer` — id de la fila `surveyVersions` aprobada (el snapshot a cotizar). Sin FK dura.
- `assignedToId integer references users.id` — quién tomó la cotización.
- `voboById integer references users.id` — quién dio/negó el VoBo.
- `rejectionReason text` — comentario al rechazar VoBo.
- `needsReview boolean default false` — se prende si el levantamiento se reabrió y re-aprobó con cambios (ver §5).
- Timestamps de ciclo de vida (para KPI):
  - `receivedAt timestamp` — entró a la bandeja (= aprobación de Luis).
  - `startedAt timestamp` — pasó a `en_cotizacion`.
  - `submittedToVoboAt timestamp` — pasó a `en_vobo`.
  - `resolvedAt timestamp` — pasó a `aprobado` o `rechazado`.

### Estado: nuevo enum `cotizacionStatusEnum`
`recibido | en_cotizacion | en_vobo | aprobado | rechazado`

Reemplaza el `status text default "borrador"` actual.

**Migración (reversible, §5.5):**
- Crear el enum.
- Mapear valores de texto existentes → enum:
  `borrador → en_cotizacion`, `enviada → en_vobo`, `aprobada → aprobado`, `rechazada → rechazado`.
  (Verificar primero `SELECT DISTINCT status FROM economic_models;` por si hay datos reales antes de migrar.)
- Agregar columnas nuevas (nullable / con default).
- Índices: `economic_models_survey_id_idx`, `economic_models_status_idx`.
- Down: revertir enum a text, drop de columnas nuevas.

---

## 5. Comportamiento fino

- **Idempotencia:** `createCotizacionFromApprovedSurvey` no crea duplicados. Guard: si ya existe un `economicModel` con ese `surveyId`, no inserta otro.
- **Reapertura (decisión de Daniel: avisar sin pisar):** si Luis reabre y re-aprueba un levantamiento que ya tiene cotización en curso:
  - NO se sobrescribe el trabajo del equipo.
  - Se actualiza `surveyVersionId` al snapshot nuevo.
  - Se prende `needsReview = true` → la bandeja muestra "Levantamiento actualizado, revisar".
- **VoBo (DECISIÓN PENDIENTE CON CLIENTE — confirmar jueves 18):** v1 = un rol director (Juan Manuel/Vero) aprueba o rechaza-con-comentario. Rechazo → regresa a `en_cotizacion` y guarda `rejectionReason`. Fácil de volver "ambos obligatorios" después.

---

## 6. Backend (subproductos)

`server/modules/subproductos/storage.ts` + `routes.ts`:
- `createCotizacionFromApprovedSurvey(survey, approvedVersion)` — usada por el disparador. Crea/actualiza el `economicModel` en estado `recibido`, prellenando `prospectName` (= `survey.clientName`), `surveyId`, `surveyVersionId`, `receivedAt`.
- `getCotizaciones(filtros)` — lista para la bandeja (por estado).
- `getCotizacionById(id)` — detalle (incluye el snapshot del levantamiento vía `surveyVersionId`).
- Transiciones de estado (cada una sella su timestamp):
  - `takeCotizacion(id, userId)` → `en_cotizacion`, `startedAt`, `assignedToId`.
  - `submitToVobo(id)` → `en_vobo`, `submittedToVoboAt`.
  - `resolveVobo(id, userId, decision, reason?)` → `aprobado`|`en_cotizacion` (si rechaza), `resolvedAt`/`rejectionReason`.
  - `updateCotizacion(id, data)` — campos del modelo económico (precio, costo, margen, composición…).
- `getCotizacionKpis()` — tiempo promedio `receivedAt → resolvedAt (aprobado)`, conteo por estado.
- Validación Zod en todas las rutas. `catch (error: unknown)` + helpers de `server/utils/errors.ts`.

---

## 7. Frontend (subproductos)

Nueva pestaña **"Cotizaciones"** en `client/src/features/subproductos/page.tsx` (junto a Trazabilidad y KPIs).

- **Bandeja:** lista por estado con prospecto, fecha recibido, **días en espera** (KPI a la vista), responsable, indicador `needsReview`.
- **Detalle a dos columnas:**
  - Izquierda: levantamiento completo de solo-lectura (todas las secciones del snapshot: residuos, volúmenes, servicios, instalaciones…).
  - Derecha: formulario del modelo económico/cotización.
  - Botones según estado y rol: *Tomar* → *Guardar* → *Enviar a VoBo* → (director) *Aprobar / Rechazar*.
- **Badge "Recibidos"** sin tomar = notificación in-app (mata el dolor #2 de la plataforma vieja).
- Patrones obligados (CLAUDE.md): `apiRequest()`, React Query, Wouter, shadcn/ui, Lucide, marca Innovative (azul #0067B0, no EcoNova).

---

## 8. KPI + Permisos + Observabilidad

- **KPI:** "tiempo promedio levantamiento aprobado → cotización lista" (pedido por Verónica) + conteo por estado.
- **Permisos** (reusar sistema de permisos existente, Opción B):
  - `subproductos.cotizaciones.view` / `.edit` → Sandra, Anahí, Cristina.
  - `subproductos.cotizaciones.vobo` → rol director (Juan Manuel, Vero).
- **Observabilidad (§5.3):** logging estructurado en el disparador y transiciones; badge de pendientes; toasts de éxito/error en el frontend.

---

## 9. Decisiones pendientes con el cliente (jueves 18 jun)

1. VoBo: ¿ambos (Juan Manuel **y** Vero) obligatorios, o con uno basta? (v1 asume: uno basta.)
2. ¿Qué campos exactos del modelo económico necesitan Cristina/Ricardo? (validar que el snapshot del levantamiento los alimenta).
3. ¿"Aprobado" debe disparar algo más (p. ej. generar la propuesta en el módulo comercial)? — posible Fase 1.5.

---

## 10. Orden de implementación (alto nivel)

1. Schema + migración (`economicModels` extendido, enum, índices).
2. Backend subproductos (storage + routes + Zod).
3. Disparador en `operaciones/storage.ts approveSurvey` (con try/catch que no rompe la aprobación).
4. Frontend: pestaña Cotizaciones (bandeja + detalle dos columnas).
5. Permisos + KPI + badge.
6. `npm run check` + verificación manual del flujo completo.

El plan detallado (tareas atómicas, archivos exactos, validación por paso) se genera con el siguiente paso (writing-plans).
