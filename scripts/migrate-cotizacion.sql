-- Migración: Bandeja de cotización (subproductos v1). Reversible (ver DOWN abajo).
-- Convierte economic_models.status de text → enum y agrega columnas de ciclo de vida.
-- CLAUDE.md §5.5: probar en dev primero, verificar con datos reales antes de prod.

-- ============ UP ============
BEGIN;

-- 1. Enum de estado
CREATE TYPE cotizacion_status AS ENUM ('recibido','en_cotizacion','en_vobo','aprobado','rechazado');

-- 2. Mapear texto viejo → enum y convertir la columna
ALTER TABLE economic_models ALTER COLUMN status DROP DEFAULT;
ALTER TABLE economic_models
  ALTER COLUMN status TYPE cotizacion_status
  USING (CASE status
    WHEN 'borrador'  THEN 'en_cotizacion'
    WHEN 'enviada'   THEN 'en_vobo'
    WHEN 'aprobada'  THEN 'aprobado'
    WHEN 'rechazada' THEN 'rechazado'
    ELSE 'recibido' END)::cotizacion_status;
ALTER TABLE economic_models ALTER COLUMN status SET DEFAULT 'recibido';
ALTER TABLE economic_models ALTER COLUMN status SET NOT NULL;

-- 3. Columnas aditivas
ALTER TABLE economic_models
  ADD COLUMN IF NOT EXISTS survey_id integer,
  ADD COLUMN IF NOT EXISTS survey_version_id integer,
  ADD COLUMN IF NOT EXISTS assigned_to_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS vobo_by_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS received_at timestamp,
  ADD COLUMN IF NOT EXISTS started_at timestamp,
  ADD COLUMN IF NOT EXISTS submitted_to_vobo_at timestamp,
  ADD COLUMN IF NOT EXISTS resolved_at timestamp;

-- 4. Índices
CREATE INDEX IF NOT EXISTS economic_models_survey_id_idx ON economic_models(survey_id);
CREATE INDEX IF NOT EXISTS economic_models_status_idx ON economic_models(status);

COMMIT;

-- ============ DOWN (rollback manual — descomentar para revertir) ============
-- BEGIN;
-- DROP INDEX IF EXISTS economic_models_status_idx;
-- DROP INDEX IF EXISTS economic_models_survey_id_idx;
-- ALTER TABLE economic_models
--   DROP COLUMN IF EXISTS received_at, DROP COLUMN IF EXISTS started_at,
--   DROP COLUMN IF EXISTS submitted_to_vobo_at, DROP COLUMN IF EXISTS resolved_at,
--   DROP COLUMN IF EXISTS needs_review, DROP COLUMN IF EXISTS rejection_reason,
--   DROP COLUMN IF EXISTS vobo_by_id, DROP COLUMN IF EXISTS assigned_to_id,
--   DROP COLUMN IF EXISTS survey_version_id, DROP COLUMN IF EXISTS survey_id;
-- ALTER TABLE economic_models ALTER COLUMN status DROP DEFAULT;
-- ALTER TABLE economic_models ALTER COLUMN status TYPE text USING status::text;
-- ALTER TABLE economic_models ALTER COLUMN status SET DEFAULT 'borrador';
-- DROP TYPE IF EXISTS cotizacion_status;
-- COMMIT;
