-- Asigna grupo visual a los 22 equipos del catálogo (categoría = equipos).
-- Idempotente: usa UPDATE por name.

UPDATE master_catalog SET group_name = 'Compactación y prensado' WHERE category = 'equipos' AND name IN (
  'Compactador estacionario 2.5 YDS3',
  'Prensa mediana (pacas de 400 a 500 kg)',
  'Prensa chica (pacas de 120 a 180 kg)',
  'Prensa de picos'
);

UPDATE master_catalog SET group_name = 'Jaulas' WHERE category = 'equipos' AND name IN (
  'Jaula para tanque de gas',
  'Jaula vertical ligera',
  'Jaula vertical ligera con llantas',
  'Jaula vertical reforzada',
  'Jaula vertical reforzada con llantas',
  'Jaula horizontal'
);

UPDATE master_catalog SET group_name = 'Contenedores' WHERE category = 'equipos' AND name IN (
  'Canoa de plástico',
  'Contenedor de plástico con copete',
  'Contenedor de plástico con copete con llantas'
);

UPDATE master_catalog SET group_name = 'Remolques' WHERE category = 'equipos' AND name IN (
  'Remolque Jaula (1.76 x 3.05 x 2.50 mts Cap.1,500 kg)',
  'Remolque Jaula (4.2 x 2.1 x 2.1 mts Cap.3,000 kg)'
);

UPDATE master_catalog SET group_name = 'Cartuchos y tolvas' WHERE category = 'equipos' AND name IN (
  'Cartucho de 40 YDS30',
  'Tolva estándar de 40 YDS3 de capacidad 30 m3'
);

UPDATE master_catalog SET group_name = 'Pesaje y movimiento' WHERE category = 'equipos' AND name IN (
  'Báscula de piso 1.2 x 1.2 m',
  'Patín hidráulico'
);

UPDATE master_catalog SET group_name = 'Procesamiento y accesorios' WHERE category = 'equipos' AND name IN (
  'Molino 40 HP',
  'Guía metálica',
  'Sustayn'
);

-- Sanity check
SELECT group_name, count(*) FROM master_catalog WHERE category = 'equipos' GROUP BY group_name ORDER BY group_name;
