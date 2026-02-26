# Guia de Pruebas - Plataforma Innovative

**Fecha:** 26 Feb 2026
**URL:** https://innovative-production-7632.up.railway.app/
**Objetivo:** Probar el flujo comercial completo (Leads → Prospectos → Pipeline) y reportar hallazgos.

---

## Acceso

Ingresa con tu usuario y contrasena en la URL de arriba. Si no puedes entrar, avisa a Daniel.

---

## Que Probar

### 1. Crear un Lead

1. Ve a **Pipeline Comercial** > pestaña **Leads**
2. Click **Nuevo Lead**
3. Llena solo datos basicos: empresa, contacto, telefono, fuente
4. Guarda

**Preguntas:**
- El formulario es claro y rapido?
- Falta algun campo importante para el primer contacto?
- El lead aparece en la lista despues de crearlo?

---

### 2. Calificar Lead → Prospecto

1. En la lista de Leads, busca el lead que creaste
2. Click **Calificar**
3. **Paso 1:** Llena datos de negocio (industria, ubicacion, potencial, valor estimado)
4. Click **Siguiente**
5. **Paso 2:** Llena info de residuos (tipos, volumen, proveedor actual)
6. Click **Crear Prospecto**

**Preguntas:**
- Los 2 pasos tienen sentido? Sobran o faltan campos?
- Las opciones de industria cubren nuestros clientes?
- Los tipos de residuo estan completos?
- El flujo se siente natural?

---

### 3. Ver Prospecto en Pipeline

1. Ve a la pestaña **Pipeline**
2. El prospecto debe aparecer en **Contacto Inicial**
3. Click en el prospecto para ver el detalle

**Preguntas:**
- Se ve bien la barra de progreso de etapas?
- Los tabs bloqueados (con candado) se entienden?
- La info del prospecto esta completa?

---

### 4. Avanzar Etapa

1. Dentro del detalle del prospecto, click **Avanzar a [siguiente etapa]**
2. Confirma
3. Observa como se desbloquean nuevos tabs

**Preguntas:**
- Se desbloquean los tabs correctos en cada etapa?
- El boton de avanzar es claro?
- La barra de progreso se actualiza?

---

### 5. Explorar Tabs del Prospecto

Segun la etapa, prueba:
- **Info:** Datos generales y de contacto
- **Timeline:** Historial de actividades
- **Notas:** Crear, editar, fijar notas
- **Reuniones:** Agendar y completar reuniones
- **Levantamiento:** Llenar datos detallados de la empresa
- **Documentos:** Subir documentos
- **Propuestas:** Crear propuestas

**Preguntas:**
- Cada seccion funciona como esperas?
- Hay algo confuso o que no funcione?

---

## Como Reportar

Usa esta plantilla para cada hallazgo:

```
SECCION: [Leads / Calificacion / Pipeline / Detalle / Otro]
TIPO: [Bug / Mejora / Pregunta / Dato faltante]
DESCRIPCION: [Que encontraste o que sugieres]
PANTALLA: [En que pantalla estabas]
PRIORIDAD: [Alta / Media / Baja]
```

**Ejemplo:**
```
SECCION: Calificacion
TIPO: Dato faltante
DESCRIPCION: No hay opcion de industria "Farmaceutica", tuve que poner "Otro"
PANTALLA: Paso 1 del dialog de calificacion
PRIORIDAD: Media
```

---

## Etapas del Pipeline (referencia)

| Etapa | Descripcion |
|---|---|
| Contacto Inicial | Primer contacto, info basica |
| Presentacion | Presentacion de servicios |
| Levantamiento | Visita y datos detallados |
| Propuesta | Cotizacion enviada |
| Negociacion | En proceso de cierre |
| Cierre Ganado | Cliente cerrado |

---

## Notas

- Esto es un ambiente de pruebas, pueden crear datos ficticios
- Si algo truena (error rojo), toma screenshot y reporta
- Cualquier duda, pregunten en el grupo
