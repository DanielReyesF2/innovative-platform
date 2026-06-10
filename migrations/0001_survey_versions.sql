-- Hueco 2/3 (Feature de Luis) — Versionado de levantamientos.
-- ADITIVA: tabla + enum nuevos, cero cambios a tablas existentes, cero riesgo de datos.
-- Aplicar en prod ANTES del deploy del código que la usa (patrón H14).
--
-- UNIQUE (survey_id, version) es el guard que mata el bug de numeración count+1
-- de proposal_versions y protege contra una doble-numeración por carrera.

-- === UP ===
CREATE TYPE survey_version_status AS ENUM ('pendiente_aprobacion', 'aprobado', 'rechazado');

CREATE TABLE survey_versions (
  id                serial PRIMARY KEY,
  survey_id         integer NOT NULL REFERENCES surveys(id),
  version           integer NOT NULL,
  snapshot          jsonb   NOT NULL,
  status            survey_version_status NOT NULL DEFAULT 'pendiente_aprobacion',
  submitted_by_id   integer REFERENCES users(id),
  submitted_at      timestamp DEFAULT now(),
  reviewed_by_id    integer REFERENCES users(id),
  reviewed_at       timestamp,
  rejection_reason  text,
  created_at        timestamp DEFAULT now()
);

CREATE INDEX survey_versions_survey_id_idx ON survey_versions (survey_id);
CREATE UNIQUE INDEX survey_versions_survey_version_uniq ON survey_versions (survey_id, version);

-- === DOWN (reversible) ===
-- DROP TABLE IF EXISTS survey_versions;
-- DROP TYPE IF EXISTS survey_version_status;
