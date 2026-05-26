-- Migra sub-campos de surveys.personnel_policies a su nueva ubicación.
-- Idempotente: solo copia si el campo destino aún es NULL.
-- La columna personnel_policies se mantiene intacta como respaldo (deprecated, no se borra).

-- 1) Shifts (turnos) → columna directa surveys.shifts
UPDATE surveys
SET
  shifts = CASE
    WHEN shifts IS NULL AND jsonb_typeof(personnel_policies -> 'shifts') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(personnel_policies -> 'shifts'))
    ELSE shifts
  END,
  shifts_obs = COALESCE(shifts_obs, personnel_policies ->> 'shiftsObs')
WHERE personnel_policies IS NOT NULL;

-- 2) Comedor / Sanitarios / Hidratación / Transporte → installations JSONB
UPDATE surveys
SET installations = COALESCE(installations, '{}'::jsonb) || jsonb_build_object(
  'diningArea',         COALESCE(installations -> 'diningArea',         personnel_policies -> 'diningArea'),
  'diningObs',          COALESCE(installations -> 'diningObs',          personnel_policies -> 'diningObs'),
  'restroomsAvailable', COALESCE(installations -> 'restroomsAvailable', personnel_policies -> 'restroomsAvailable'),
  'restroomsObs',       COALESCE(installations -> 'restroomsObs',       personnel_policies -> 'restroomsObs'),
  'hydrationProvided',  COALESCE(installations -> 'hydrationProvided',  personnel_policies -> 'hydrationProvided'),
  'hydrationObs',       COALESCE(installations -> 'hydrationObs',       personnel_policies -> 'hydrationObs'),
  'transportProvided',  COALESCE(installations -> 'transportProvided',  personnel_policies -> 'transportProvided'),
  'transportObs',       COALESCE(installations -> 'transportObs',       personnel_policies -> 'transportObs')
)
WHERE personnel_policies IS NOT NULL
  AND (
    personnel_policies ? 'diningArea' OR personnel_policies ? 'restroomsAvailable'
    OR personnel_policies ? 'hydrationProvided' OR personnel_policies ? 'transportProvided'
  );

-- 3) EPP / Credencial / Uniforme → legal_requirements JSONB
UPDATE surveys
SET legal_requirements = COALESCE(legal_requirements, '{}'::jsonb) || jsonb_build_object(
  'ppeRequired',        COALESCE(legal_requirements -> 'ppeRequired',        personnel_policies -> 'ppeRequired'),
  'ppeObs',             COALESCE(legal_requirements -> 'ppeObs',             personnel_policies -> 'ppeObs'),
  'credentialRequired', COALESCE(legal_requirements -> 'credentialRequired', personnel_policies -> 'credentialRequired'),
  'credentialObs',      COALESCE(legal_requirements -> 'credentialObs',      personnel_policies -> 'credentialObs'),
  'uniformRequired',    COALESCE(legal_requirements -> 'uniformRequired',    personnel_policies -> 'uniformRequired'),
  'uniformObs',         COALESCE(legal_requirements -> 'uniformObs',         personnel_policies -> 'uniformObs')
)
WHERE personnel_policies IS NOT NULL
  AND (
    personnel_policies ? 'ppeRequired' OR personnel_policies ? 'credentialRequired'
    OR personnel_policies ? 'uniformRequired'
  );

-- Sanity: cuántas filas tocó cada bloque
SELECT
  count(*) FILTER (WHERE shifts IS NOT NULL) AS surveys_with_shifts,
  count(*) FILTER (WHERE installations ? 'diningArea') AS surveys_with_dining,
  count(*) FILTER (WHERE legal_requirements ? 'ppeRequired') AS surveys_with_ppe,
  count(*) FILTER (WHERE personnel_policies IS NOT NULL) AS legacy_personnel_rows
FROM surveys;
