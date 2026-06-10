-- Hueco 2/3 (Feature de Luis) — Permiso surveys.reopen para reabrir un
-- levantamiento aprobado (decisión de Daniel: opción A, solo el rol director,
-- "él aprobó, él reabre").
--
-- Append QUIRÚRGICO e idempotente: solo agrega surveys.reopen al rol director si
-- no lo tiene, SIN pisar permisos afinados en la UI (a diferencia del reconcile,
-- que reescribe el baseline completo). roles es tabla sensible (auth) → write
-- versionado, no ad-hoc (§5.5).
--
-- La caché role→permisos del app se refresca sola en el redeploy de Cloud Run.

-- === UP ===
UPDATE roles
SET permissions = permissions || '["surveys.reopen"]'::jsonb
WHERE name = 'director' AND NOT (permissions @> '["surveys.reopen"]'::jsonb);

-- === DOWN (reversible) ===
-- UPDATE roles
-- SET permissions = (
--   SELECT jsonb_agg(p) FROM jsonb_array_elements_text(permissions) AS p
--   WHERE p <> 'surveys.reopen'
-- )
-- WHERE name = 'director';
