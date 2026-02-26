# Guia de Pruebas - Hub Digital Innovative

**Fecha:** 26 Feb 2026
**URL:** https://innovative-production-7632.up.railway.app

---

## Acceso

- **Usuario:** Pruebas
- **Contrasenya:** Pruebas2026
- Al abrir la URL, los campos ya vienen pre-llenados. Solo dale click a **Iniciar Sesion**.

---

## Que Probar

### 1. Dashboard

Al entrar veras el dashboard ejecutivo con KPIs generales de pipeline, ingresos operativos, economia circular y alertas.

**Revisar:**
- Los numeros se ven correctos?
- Las graficas cargan bien?
- La info es util para una vista rapida?

---

### 2. Crear un Nuevo Lead

1. En el menu lateral, click en **Nuevas Cuentas** > **Pipeline & Prospectos**
2. Click en el boton **+ Nuevo Lead**
3. Llena el formulario:
   - **Asesor Comercial** (obligatorio): selecciona a que ejecutivo se asigna
   - **Empresa** (obligatorio): nombre de la empresa
   - **Ciudad**: donde esta ubicada
   - **Contacto** (obligatorio): nombre de la persona
   - **Telefono y Correo**: datos de contacto
   - **Fuente**: como llego el lead (referencia, llamada, etc.)
   - **Notas**: comentarios adicionales
4. Click **Crear Lead**

**Preguntas:**
- El formulario es rapido y claro?
- Falta algun campo importante para el primer contacto?
- El lead aparece en el kanban del asesor despues de crearlo?

---

### 3. Ver el Kanban del Asesor

1. En la vista de Pipeline, click sobre uno de los asesores del equipo
2. Veras su kanban personal con columnas: Lead > Prospecto > Reunion > Levantamiento > Propuesta > Cliente Nuevo
3. Las tarjetas se pueden arrastrar entre columnas

**Preguntas:**
- Las columnas y etapas tienen sentido?
- El kanban es facil de entender?
- Al hacer click en una tarjeta, se ve bien el detalle?

---

### 4. Detalle de un Prospecto

Click en cualquier tarjeta del kanban para ver su detalle con tabs:
- **Info:** datos generales, contacto, servicios
- **Timeline:** historial de actividades
- **Notas:** crear y ver notas
- **Reuniones:** agendar reuniones
- **Docs:** documentos adjuntos
- **Propuestas:** propuestas enviadas

**Preguntas:**
- La info esta completa?
- Los tabs funcionan bien?
- Es facil navegar entre secciones?

---

## Como Reportar

Usa este formato para cada hallazgo en el grupo de WhatsApp:

```
SECCION: [Dashboard / Nuevo Lead / Kanban / Detalle / Otro]
TIPO: [Bug / Mejora / Pregunta]
QUE PASO: [Descripcion breve]
SCREENSHOT: [Adjuntar foto si aplica]
```

**Ejemplo:**
```
SECCION: Nuevo Lead
TIPO: Mejora
QUE PASO: Faltaria un campo para seleccionar el tipo de industria desde el inicio
SCREENSHOT: (adjunto)
```

---

## Notas Importantes

- Es ambiente de pruebas, pueden crear datos ficticios
- Si la pantalla se pone en blanco o sale un error rojo, tomen screenshot y reportenlo
- Los datos de los prospectos que ya estan cargados son de ejemplo
- Solo estan habilitados **Dashboard** y **Nuevas Cuentas** por ahora
- Cualquier duda, pregunten en el grupo
