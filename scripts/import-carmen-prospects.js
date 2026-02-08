import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

const CARMEN_ID = 9; // Carmen Cruz

// Mapeo de estatus a etapas del pipeline
function mapearEtapa(estatus) {
  if (!estatus) return 'lead';
  const e = estatus.toLowerCase();
  if (e.includes('fallo') || e.includes('contrapropuesta') || e.includes('round')) return 'negociacion';
  if (e.includes('propuesta')) return 'propuesta';
  if (e.includes('levantamiento')) return 'levantamiento';
  return 'lead';
}

// Mapeo de probabilidad por etapa
const probabilidadPorEtapa = {
  'lead': 10,
  'levantamiento': 30,
  'propuesta': 50,
  'negociacion': 70,
  'rechazada': 0
};

async function importarProspectos() {
  const workbook = XLSX.readFile('/Users/danielreyes/Downloads/Prospecccion, seguimientos y oportunidades perdias Feb 2026.xlsx');

  // Hoja 1: Prospectos en seguimiento
  const sheet1 = workbook.Sheets['Prospectos en seguimiento'];
  const prospectos = XLSX.utils.sheet_to_json(sheet1);

  // Hoja 2: Oportunidades no ganadas
  const sheet2 = workbook.Sheets['OPORTUNIDADES NO GANADAS'];
  const rechazadas = XLSX.utils.sheet_to_json(sheet2);

  console.log(`\n📊 Prospectos en seguimiento: ${prospectos.length}`);
  console.log(`❌ Oportunidades no ganadas: ${rechazadas.length}`);

  let insertados = 0;
  let errores = 0;

  // Importar prospectos en seguimiento
  for (const row of prospectos) {
    const nombre = row['Proyecto'];
    if (!nombre) continue;

    const etapa = mapearEtapa(row['Estatus']);
    const giro = row['Giro de la Empresa'] || 'Sin clasificar';
    const contacto = row['Nombre del Contacto'] || '';
    const puesto = row['Puesto'] || '';
    const telefono = row['Telefono de contacto'] ? String(row['Telefono de contacto']) : '';
    const email = row['Direccion correo electronico'] || '';
    const notas = row['Estatus'] || '';

    try {
      await sql`
        INSERT INTO prospects (
          name, industry, location, potential, stage,
          contact_name, contact_role, contact_phone, contact_email,
          assigned_to_id, probability, last_activity, priority
        ) VALUES (
          ${nombre}, ${giro}, ${'México'}, ${'medio'}, ${etapa},
          ${contacto}, ${puesto}, ${telefono}, ${email},
          ${CARMEN_ID}, ${probabilidadPorEtapa[etapa]},
          ${notas || 'Importado desde Excel'}, ${'media'}
        )
      `;
      insertados++;
    } catch (err) {
      console.error(`Error insertando ${nombre}:`, err.message);
      errores++;
    }
  }

  // Importar rechazadas
  for (const row of rechazadas) {
    const nombre = row['Proyecto'];
    if (!nombre) continue;

    const giro = row['Giro de la Empresa'] || 'Sin clasificar';
    const contacto = row['Nombre del contacto'] || '';
    const puesto = row['Puesto'] || '';
    const telefono = row['Telefono móvil'] ? String(row['Telefono móvil']) : '';
    const email = row['correo'] || '';
    const comentarios = row['Comentarios'] || '';

    try {
      await sql`
        INSERT INTO prospects (
          name, industry, location, potential, stage,
          contact_name, contact_role, contact_phone, contact_email,
          assigned_to_id, probability, rejection_detail, last_activity, priority
        ) VALUES (
          ${nombre}, ${giro}, ${'México'}, ${'medio'}, ${'rechazada'},
          ${contacto}, ${puesto}, ${telefono}, ${email},
          ${CARMEN_ID}, ${0}, ${comentarios},
          ${comentarios || 'Oportunidad no ganada'}, ${'baja'}
        )
      `;
      insertados++;
    } catch (err) {
      console.error(`Error insertando rechazada ${nombre}:`, err.message);
      errores++;
    }
  }

  console.log(`\n✅ Insertados: ${insertados}`);
  console.log(`❌ Errores: ${errores}`);

  // Resumen por etapa
  const resumen = await sql`
    SELECT stage, COUNT(*) as total
    FROM prospects
    WHERE assigned_to_id = ${CARMEN_ID}
    GROUP BY stage
    ORDER BY stage
  `;

  console.log(`\n📈 Prospectos de Carmen por etapa:`);
  resumen.forEach(r => console.log(`   ${r.stage}: ${r.total}`));
}

importarProspectos().catch(console.error);
