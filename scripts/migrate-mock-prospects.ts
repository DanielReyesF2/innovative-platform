import { neon } from "@neondatabase/serverless";
import "dotenv/config";

// Mock data from App.jsx - mapped to real schema
const mockProspects = [
  // VERO ALVARADO (VA)
  { name: "Liverpool Plan", industry: "Retail", location: "CDMX", ejecutivo: "VA", contactName: "Gabriela Cisnero", contactRole: "Coordinadora Sustentabilidad", contactEmail: "agcisnerosc@liverpool.com.mx", stage: "propuesta", estimatedValue: 1358778, services: ["rme"] },
  { name: "DHL", industry: "Logística", location: "Edo Mex", ejecutivo: "VA", contactName: "Marco Pardines", contactRole: "DHL Purchasing Buyer México", contactEmail: "Marco.Pardinesc@dhl.com", stage: "propuesta", estimatedValue: 158785, services: ["rme"] },
  { name: "BRINCO", industry: "Retail", location: "CDMX", ejecutivo: "VA", contactName: "David Mizrahi", contactRole: "Owner", contactEmail: "dmizd@brinco.com.mx", stage: "propuesta", estimatedValue: 0, services: ["rme"] },
  { name: "Home Depot", industry: "Retail", location: "CDMX", ejecutivo: "VA", contactName: "Juan Pérez", contactRole: "Gerente de Sustentabilidad", contactEmail: "jperez@homedepot.com.mx", stage: "lead", estimatedValue: 500000, services: ["rme"] },
  { name: "Walmart México", industry: "Retail", location: "CDMX", ejecutivo: "VA", contactName: "María García", contactRole: "Directora Ambiental", contactEmail: "mgarcia@walmart.com.mx", stage: "levantamiento", estimatedValue: 2500000, services: ["rme", "rsu"] },

  // CARMEN RODRIGUEZ (CR)
  { name: "Tritech Autoparts Mexico", industry: "Automotriz", location: "Guanajuato", ejecutivo: "CR", contactName: "Roberto López", contactRole: "Gerente de Planta", contactEmail: "rlopez@tritech.com", stage: "lead", estimatedValue: 450000, services: ["rme"] },
  { name: "ZKW Mexico", industry: "Automotriz", location: "Silao", ejecutivo: "CR", contactName: "Ana Martínez", contactRole: "Coordinadora EHS", contactEmail: "amartinez@zkw.com", stage: "lead", estimatedValue: 380000, services: ["rme"] },
  { name: "Nishikawa Sealing Systems", industry: "Automotriz", location: "Guanajuato", ejecutivo: "CR", contactName: "Carlos Hernández", contactRole: "Gerente Ambiental", contactEmail: "chernandez@nishikawa.com", stage: "lead", estimatedValue: 290000, services: ["rme"] },
  { name: "Tsubakimoto Automotive Mexico", industry: "Automotriz", location: "Guanajuato", ejecutivo: "CR", contactName: "Claudia Irene García Martínez", contactRole: "Gerente de EHS", contactEmail: "c.garcia@tsubakimoto.com.mx", contactPhone: "4777300614", stage: "propuesta", estimatedValue: 520000, services: ["rme"] },
  { name: "KASAI Mexicana", industry: "Automotriz", location: "Guanajuato", ejecutivo: "CR", contactName: "Pedro Sánchez", contactRole: "Director de Operaciones", contactEmail: "psanchez@kasai.com", stage: "propuesta", estimatedValue: 410000, services: ["rme"] },
  { name: "SOVERE", industry: "Automotriz", location: "León", ejecutivo: "CR", contactName: "Luis Ramírez", contactRole: "Gerente General", contactEmail: "lramirez@sovere.com", stage: "negociacion", estimatedValue: 680000, services: ["rme"] },
  { name: "Hutchinson Autopartes", industry: "Automotriz", location: "Celaya", ejecutivo: "CR", contactName: "Fernanda Díaz", contactRole: "Coordinadora Ambiental", contactEmail: "fdiaz@hutchinson.com", stage: "levantamiento", estimatedValue: 350000, services: ["rsu"] },
  { name: "SARRELMEX", industry: "Automotriz", location: "Celaya", ejecutivo: "CR", contactName: "Jorge Torres", contactRole: "Gerente de Planta", contactEmail: "jtorres@sarrelmex.com", stage: "levantamiento", estimatedValue: 420000, services: ["rme"] },
  { name: "L'Oréal - Estado de México", industry: "Cosmética", location: "Estado de México", ejecutivo: "CR", contactName: "Patricia Vega", contactRole: "Directora de Sustentabilidad", contactEmail: "pvega@loreal.com", stage: "levantamiento", estimatedValue: 890000, services: ["rme"] },
  { name: "L'Oréal - CDMX", industry: "Cosmética", location: "CDMX", ejecutivo: "CR", contactName: "Patricia Vega", contactRole: "Directora de Sustentabilidad", contactEmail: "pvega@loreal.com", stage: "levantamiento", estimatedValue: 750000, services: ["rme"] },
  { name: "HOPE GLOBAL", industry: "Manufactura", location: "León", ejecutivo: "CR", contactName: "Ricardo Morales", contactRole: "Gerente de Operaciones", contactEmail: "rmorales@hopeglobal.com", stage: "levantamiento", estimatedValue: 320000, services: ["rme"] },
  { name: "MAGNA COSMA", industry: "Automotriz", location: "San Luis Potosí", ejecutivo: "CR", contactName: "Sandra Ruiz", contactRole: "Coordinadora EHS", contactEmail: "sruiz@magna.com", stage: "levantamiento", estimatedValue: 560000, services: ["rme"] },

  // JESUS MARTINEZ (JM)
  { name: "Grupo Industrial Saltillo", industry: "Manufactura", location: "Saltillo", ejecutivo: "JM", contactName: "Miguel Ángel Flores", contactRole: "Director de Sustentabilidad", contactEmail: "maflores@gis.com.mx", stage: "propuesta", estimatedValue: 1200000, services: ["rme", "rsu"] },
  { name: "Nemak", industry: "Automotriz", location: "Monterrey", ejecutivo: "JM", contactName: "Laura Mendoza", contactRole: "Gerente Ambiental", contactEmail: "lmendoza@nemak.com", stage: "levantamiento", estimatedValue: 980000, services: ["rme"] },
  { name: "Ternium México", industry: "Acero", location: "Monterrey", ejecutivo: "JM", contactName: "Alberto Garza", contactRole: "Director EHS", contactEmail: "agarza@ternium.com", stage: "lead", estimatedValue: 1500000, services: ["rme", "rp"] },

  // RODRIGO PEREZ (RP)
  { name: "Constellation Brands", industry: "Bebidas", location: "Nava", ejecutivo: "RP", contactName: "Elena Castillo", contactRole: "Gerente de Sustentabilidad", contactEmail: "ecastillo@cbrands.com", stage: "propuesta", estimatedValue: 2100000, services: ["rme", "rsu"] },
  { name: "John Deere", industry: "Maquinaria", location: "Saltillo", ejecutivo: "RP", contactName: "Francisco Luna", contactRole: "Director de Operaciones", contactEmail: "fluna@deere.com", stage: "negociacion", estimatedValue: 1800000, services: ["rme"] },
  { name: "Caterpillar", industry: "Maquinaria", location: "Monterrey", ejecutivo: "RP", contactName: "Diana Herrera", contactRole: "Coordinadora Ambiental", contactEmail: "dherrera@cat.com", stage: "levantamiento", estimatedValue: 1350000, services: ["rme", "rp"] },
];

// Map ejecutivo codes to user IDs (based on actual DB users)
const ejecutivoMap: Record<string, number | null> = {
  "VA": 16, // Veronica Arias
  "CR": 9,  // Carmen Rodriguez
  "JM": 10, // Jose Armando Martínez
  "RP": null, // No user, will assign to Carmen
};

async function migrateProspects() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Starting mock prospects migration...\n");

  // First, check existing users
  const users = await sql`SELECT id, name FROM users`;
  console.log("Existing users:", users);

  // Clear existing prospects (optional - comment out if you want to keep them)
  // await sql`DELETE FROM prospect_activities`;
  // await sql`DELETE FROM prospect_notes`;
  // await sql`DELETE FROM prospect_meetings`;
  // await sql`DELETE FROM prospect_documents`;
  // await sql`DELETE FROM proposal_versions`;
  // await sql`DELETE FROM prospects`;
  // console.log("Cleared existing prospects");

  let inserted = 0;
  let errors = 0;

  for (const p of mockProspects) {
    try {
      // Map stage to enum value
      const stageMap: Record<string, string> = {
        "lead": "lead",
        "levantamiento": "levantamiento",
        "propuesta": "propuesta",
        "negociacion": "negociacion",
        "cierre": "cierre",
        "rechazada": "rechazada",
      };

      const assignedToId = ejecutivoMap[p.ejecutivo] ?? 9; // Default to Carmen

      await sql`
        INSERT INTO prospects (
          name, industry, location, potential, estimated_value,
          stage, contact_name, contact_role, contact_email, contact_phone,
          assigned_to_id, probability, priority
        ) VALUES (
          ${p.name}, ${p.industry}, ${p.location}, 'Alto', ${p.estimatedValue || 0},
          ${stageMap[p.stage] || 'lead'}, ${p.contactName || null}, ${p.contactRole || null},
          ${p.contactEmail || null}, ${p.contactPhone || null},
          ${assignedToId}, ${Math.floor(Math.random() * 40) + 30}, 'media'
        )
      `;
      inserted++;
      console.log(`✓ Inserted: ${p.name}`);
    } catch (error: any) {
      errors++;
      console.error(`✗ Failed: ${p.name} - ${error.message}`);
    }
  }

  console.log(`\nMigration complete: ${inserted} inserted, ${errors} errors`);

  // Show final count
  const count = await sql`SELECT COUNT(*) as total FROM prospects`;
  console.log(`Total prospects in database: ${count[0].total}`);
}

migrateProspects();
