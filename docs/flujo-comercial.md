# Flujo Comercial — Innovative Group
### Mapa de proceso para validación con Vero

---

## El Escenario: Carmen encuentra un prospecto en LinkedIn

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FUENTE DEL LEAD                                 │
│   LinkedIn · Referencia · Evento · Web · Cold Call · Redes Sociales    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  1. LEAD NUEVO                                           Prob: 5%     ┃
┃  ─────────────────────────────────────────────────────────────────     ┃
┃  Carmen abre la plataforma → clic "Nuevo Lead" → llena formulario     ┃
┃                                                                       ┃
┃  📋 Campos del formulario:                                            ┃
┃  ┌─────────────────────────┬──────────────────────────────────────┐    ┃
┃  │ Empresa *               │ Planta (opcional)                   │    ┃
┃  │ Ciudad                  │ Industria                           │    ┃
┃  │ Contacto: Nombre        │ Contacto: Puesto                   │    ┃
┃  │ Contacto: Correo        │ Contacto: Teléfono                 │    ┃
┃  │ Servicios (multi-select)│ Tipos de residuos (texto)          │    ┃
┃  │ Volumen estimado (ton)  │ Facturación estimada ($)           │    ┃
┃  │ Comentarios             │                                    │    ┃
┃  └─────────────────────────┴──────────────────────────────────────┘    ┃
┃                                                                       ┃
┃  ✅ HOY EXISTE: Formulario de creación completo                       ┃
┃  ❌ FALTA: Fuente del lead (LinkedIn, referencia, etc.)               ┃
┃  ❌ FALTA: Fecha de primer contacto                                   ┃
┃  ❌ FALTA: Asignar ejecutivo al crear (se asigna automático?)         ┃
┃  ❌ FALTA: Prioridad (alta/media/baja)                                ┃
┃  ❌ FALTA: Tamaño de empresa (# empleados, # plantas)                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                               │
                     🔒 CANDADO: Prospecto Calificado
                     Requiere: Empresa + Industria +
                     Contacto + Puesto + Correo
                               │
                               ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  2. REUNIÓN AGENDADA                                     Prob: 20%    ┃
┃  ─────────────────────────────────────────────────────────────────     ┃
┃  Carmen agenda una reunión con el prospecto (presencial o virtual)     ┃
┃                                                                       ┃
┃  ✅ HOY EXISTE: Stage en Kanban, se mueve con drag & drop             ┃
┃  ❌ FALTA: Registro de la reunión (fecha, hora, ubicación, tipo)      ┃
┃  ❌ FALTA: Notas/minuta de la reunión                                 ┃
┃  ❌ FALTA: Calendario / integración con Google Calendar               ┃
┃  ❌ FALTA: Recordatorio automático antes de la reunión                ┃
┃  ❌ FALTA: Resultado de la reunión (exitosa, reprogramar, sin interés)┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                               │
                     🔒 CANDADO: Volumen Verificado
                     Requiere: Volumen estimado o
                     Facturación estimada
                               │
                               ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  3. LEVANTAMIENTO                                        Prob: 35%    ┃
┃  ─────────────────────────────────────────────────────────────────     ┃
┃  El equipo de operaciones visita la planta para hacer el diagnóstico   ┃
┃  técnico: tipos de residuos, volúmenes reales, infraestructura, etc.  ┃
┃                                                                       ┃
┃  ✅ HOY EXISTE: Lista de levantamientos activos                       ┃
┃  ✅ HOY EXISTE: Modal de nuevo levantamiento                          ┃
┃  ❌ FALTA: Vincular levantamiento al prospecto del Kanban             ┃
┃  ❌ FALTA: Formulario detallado (tipos residuos, fotos, volúmenes)    ┃
┃  ❌ FALTA: Status del levantamiento (programado → en curso → listo)   ┃
┃  ❌ FALTA: Fecha programada del levantamiento                         ┃
┃  ❌ FALTA: Asignar responsable de operaciones                         ┃
┃  ❌ FALTA: Checklist de información recopilada                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                               │
                     🔒 CANDADO: Levantamiento Completado
                     Requiere: Volumen + Servicios
                     seleccionados
                               │
                               ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  4. PROPUESTA ENVIADA                                    Prob: 50%    ┃
┃  ─────────────────────────────────────────────────────────────────     ┃
┃  Se genera y envía la propuesta comercial al prospecto                 ┃
┃                                                                       ┃
┃  ✅ HOY EXISTE: Campo propuesta.ventaTotal (monto)                    ┃
┃  ✅ HOY EXISTE: Campo propuesta.status (Enviada/Aceptada)             ┃
┃  ❌ FALTA: Generación/upload del documento de propuesta (PDF)         ┃
┃  ❌ FALTA: Fecha de envío de la propuesta                             ┃
┃  ❌ FALTA: Desglose de servicios y precios en la propuesta            ┃
┃  ❌ FALTA: Versiones de la propuesta (v1, v2, v3...)                  ┃
┃  ❌ FALTA: Tracking de apertura/lectura                               ┃
┃  ❌ FALTA: Fecha de vigencia de la propuesta                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                               │
                     🔒 CANDADO: Propuesta Acusada
                     Requiere: Monto de propuesta definido
                               │
                               ▼
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  5. NEGOCIACIÓN                                          Prob: 70%    ┃
┃  ─────────────────────────────────────────────────────────────────     ┃
┃  El prospecto recibió la propuesta y está negociando términos          ┃
┃                                                                       ┃
┃  ❌ FALTA: Log de negociación (objeciones, contraoferta, descuentos)  ┃
┃  ❌ FALTA: Motivo de objeción                                         ┃
┃  ❌ FALTA: Propuesta revisada (nueva versión)                         ┃
┃  ❌ FALTA: Fecha estimada de cierre                                   ┃
┃  ❌ FALTA: Probabilidad manual (override del 70% default)             ┃
┃  ❌ FALTA: Competencia (quién más está cotizando)                     ┃
┗━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━┛
                      │                         │
                      ▼                         ▼
    ┏━━━━━━━━━━━━━━━━━━━━━━━━━┓   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
    ┃  6a. GANADA (100%)      ┃   ┃  6b. RECHAZADA (0%)      ┃
    ┃  Inicio de operación    ┃   ┃  Propuesta Rechazada     ┃
    ┃                         ┃   ┃                          ┃
    ┃  ✅ Stage existe        ┃   ┃  ✅ Stage existe         ┃
    ┃  ❌ FALTA: Fecha cierre ┃   ┃  ✅ Motivo de rechazo    ┃
    ┃  ❌ FALTA: Handoff a    ┃   ┃  ✅ Detalle de rechazo   ┃
    ┃     operaciones         ┃   ┃  ❌ FALTA: Posibilidad   ┃
    ┃  ❌ FALTA: Contrato     ┃   ┃     de reactivar         ┃
    ┃  ❌ FALTA: Inicio de    ┃   ┃  ❌ FALTA: Lecciones     ┃
    ┃     facturación         ┃   ┃     aprendidas           ┃
    ┗━━━━━━━━━━━━━━━━━━━━━━━━━┛   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## FUNCIONALIDADES TRANSVERSALES (en todo el flujo)

### ✅ Lo que SÍ tenemos hoy

| Funcionalidad | Estado | Dónde |
|---|---|---|
| Kanban drag & drop | ✅ Funciona | 6 columnas + drag con dnd-kit |
| Stage gates (candados) | ✅ Funciona | 4 candados con validación |
| Vista tabla con filtros | ✅ Funciona | Filtros: servicio, ejecutivo, etapa |
| Colores por tipo servicio | ✅ Funciona | RME=azul, Biodigestores=naranja, etc. |
| Detalle de prospecto (modal) | ✅ Básico | Muestra info, checklist, contacto |
| Creación de lead | ✅ Funciona | Formulario con 11 campos |
| KPIs del equipo | ✅ Funciona | Score ponderado, sparklines, pace |
| Pipeline por ejecutivo | ✅ Funciona | Barras apiladas por etapa |
| Rechazo con motivo | ✅ Funciona | Modal con motivo + detalle |
| Notas por prospecto | ✅ Básico | Solo en panel KPI expandido |
| Hub de ejecutivo | ✅ Básico | Pipeline, notas, archivos por persona |

### ❌ Lo que FALTA (priorizado)

#### 🔴 Prioridad Alta — Sin esto el flujo está incompleto

| # | Funcionalidad | Impacto |
|---|---|---|
| 1 | **Fuente del lead** (LinkedIn, referencia, etc.) | No se puede medir de dónde vienen los mejores leads |
| 2 | **Actividad/Timeline por prospecto** | No hay historial de qué pasó con cada prospecto |
| 3 | **Agendar reuniones** (fecha, hora, tipo) | Carmen no puede registrar cuándo es la reunión |
| 4 | **Notas/minutas en cada stage** | No hay contexto de las conversaciones |
| 5 | **Vincular levantamiento → prospecto** | Ops no sabe qué levantamiento va con qué deal |
| 6 | **Upload de propuesta (PDF)** | La propuesta se maneja fuera del sistema |
| 7 | **Fecha estimada de cierre** | No se puede hacer forecast mensual real |
| 8 | **Editar prospecto** (campos después de crearlo) | Carmen no puede actualizar info nueva |

#### 🟡 Prioridad Media — Mejora significativa

| # | Funcionalidad | Impacto |
|---|---|---|
| 9 | Asignar ejecutivo al crear lead | Hoy se asigna por dato estático |
| 10 | Prioridad del lead (alta/media/baja) | No se puede priorizar el trabajo |
| 11 | Recordatorios y alertas por prospecto | Se olvidan seguimientos |
| 12 | Versiones de propuesta | No se trackea si hubo re-cotización |
| 13 | Competencia (quién más cotiza) | Info clave para negociación |
| 14 | Fecha de cierre real + handoff a ops | No hay transición formal |
| 15 | Dashboard de fuentes de leads | No se mide ROI de prospección |

#### 🟢 Prioridad Baja — Nice to have

| # | Funcionalidad | Impacto |
|---|---|---|
| 16 | Integración con calendario (Google/Outlook) | Conveniencia |
| 17 | Tracking de apertura de propuesta | Info útil pero no crítica |
| 18 | Reactivar propuestas rechazadas | Casos puntuales |
| 19 | Lecciones aprendidas en rechazos | Mejora continua |
| 20 | Templates de propuesta | Eficiencia |

---

## EL FLUJO IDEAL (lo que Carmen debería poder hacer)

```
CARMEN EN LINKEDIN
        │
        ▼
  "Vi que BIMBO Toluca
   busca proveedor de           ┌─────────────────────────────┐
   manejo de residuos"    ───▶  │  1. CREAR LEAD              │
        │                       │  • Empresa: BIMBO           │
        │                       │  • Planta: Toluca           │
        │                       │  • Fuente: LinkedIn ←NEW    │
        │                       │  • Contacto: Juan Pérez     │
        │                       │  • Servicio: RME            │
        │                       │  • Prioridad: Alta ←NEW     │
        │                       └──────────────┬──────────────┘
        │                                      │
        │                                      ▼
        │                       ┌─────────────────────────────┐
        │                       │  2. AGENDAR REUNIÓN ←NEW    │
  "Le escribo y acepta   ───▶  │  • Fecha: 15 Feb 2pm        │
   una videollamada"            │  • Tipo: Virtual (Zoom)     │
        │                       │  • Recordatorio: 1hr antes  │
        │                       └──────────────┬──────────────┘
        │                                      │
        │                                      ▼
        │                       ┌─────────────────────────────┐
        │                       │  3. REGISTRAR RESULTADO     │
  "La reunión salió bien, ───▶  │     DE REUNIÓN ←NEW         │
   necesitan manejo de          │  • Resultado: Exitosa       │
   RME para 3 plantas"         │  • Notas: Tiene 3 plantas   │
        │                       │  • Siguiente paso: Lev.     │
        │                       └──────────────┬──────────────┘
        │                                      │
        │                                      ▼
        │                       ┌─────────────────────────────┐
  "Operaciones va a       ───▶  │  4. PROGRAMAR LEVANTAMIENTO │
   hacer el levantamiento       │  • Fecha: 20 Feb            │
   la próxima semana"           │  • Planta: Toluca           │
        │                       │  • Responsable: Ops Team    │
        │                       │  • Checklist de info ←NEW   │
        │                       └──────────────┬──────────────┘
        │                                      │
        │                                      ▼
        │                       ┌─────────────────────────────┐
  "Ya tenemos los datos,  ───▶  │  5. ENVIAR PROPUESTA        │
   le mando la propuesta"       │  • Upload PDF ←NEW          │
        │                       │  • Monto: $2.5M             │
        │                       │  • Vigencia: 30 días ←NEW   │
        │                       │  • Desglose servicios ←NEW  │
        │                       └──────────────┬──────────────┘
        │                                      │
        │                                      ▼
        │                       ┌─────────────────────────────┐
  "BIMBO quiere ajustar   ───▶  │  6. NEGOCIACIÓN             │
   el precio"                   │  • Objeción: Precio ←NEW    │
        │                       │  • Contraoferta ←NEW        │
        │                       │  • Fecha est. cierre ←NEW   │
        │                       └──────────────┬──────────────┘
        │                                      │
        │                               ┌──────┴──────┐
        ▼                               ▼             ▼
  "¡Firmaron!"              ┌──────────────┐  ┌──────────────┐
                            │  ✅ GANADA    │  │  ❌ PERDIDA   │
                            │  Handoff Ops  │  │  Motivo       │
                            │  Contrato     │  │  Lecciones    │
                            │  Inicio fact. │  │  Reactivar?   │
                            └──────────────┘  └──────────────┘
```

---

## RESUMEN EJECUTIVO PARA VERO

**Lo que tiene la plataforma hoy:**
- Kanban funcional con 6 etapas y drag & drop
- Candados de calidad entre etapas
- Formulario de creación de leads
- KPIs del equipo con scores y tendencias
- Vista tabla con filtros

**Lo que le falta para que el equipo comercial lo use diario:**
1. ~~El flujo está cortado~~: Carmen crea el lead pero después no puede registrar reuniones, notas, ni subir propuestas dentro del sistema
2. No hay **timeline/historial** de cada prospecto — no se sabe qué pasó ni cuándo
3. No se puede **editar** un prospecto después de crearlo
4. No hay **fuente del lead** — no se puede medir qué canal funciona mejor
5. No hay **fecha estimada de cierre** — no se puede hacer forecast real

**Pregunta para Vero:** ¿Estas son las prioridades correctas? ¿Qué usaría Carmen primero?
