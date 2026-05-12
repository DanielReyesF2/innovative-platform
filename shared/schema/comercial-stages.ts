// Single source of truth for prospect stage IDs.
//
// The DB enum `prospectStageEnum` stores canonical values AND legacy values
// that predate the current flow. Use the helper arrays/functions below to
// query across both generations instead of hardcoding strings.
//
// Business labels (Kanban UI) live in client/src/lib/comercial-constants.tsx
// and consume these same IDs.

export const STAGE = {
  // Canonical
  CONTACTO_INICIAL: "contacto_inicial",
  PRESENTACION: "presentacion",
  LEVANTAMIENTO: "levantamiento",
  PROPUESTA: "propuesta",
  NEGOCIACION: "negociacion",
  CIERRE_GANADO: "cierre_ganado",
  CIERRE_PERDIDO: "cierre_perdido",
  // Legacy values still present in existing DB rows
  LEAD: "lead",
  PROSPECTO: "prospecto",
  CIERRE: "cierre",
  RECHAZADA: "rechazada",
} as const;

export type ProspectStageId = (typeof STAGE)[keyof typeof STAGE];

// Stages whose prospects are still in the pipeline.
export const ACTIVE_STAGE_IDS = [
  STAGE.CONTACTO_INICIAL,
  STAGE.LEAD,
  STAGE.PRESENTACION,
  STAGE.LEVANTAMIENTO,
  STAGE.PROPUESTA,
  STAGE.NEGOCIACION,
] as const;

// Won deals (canonical + legacy).
export const WON_STAGE_IDS = [STAGE.CIERRE_GANADO, STAGE.CIERRE] as const;

// Lost deals (canonical + legacy).
export const LOST_STAGE_IDS = [STAGE.CIERRE_PERDIDO, STAGE.RECHAZADA] as const;

// Prospect can be handed off to Operaciones only from these stages.
export const HANDOFF_ALLOWED_STAGE_IDS = [
  STAGE.LEAD,
  STAGE.CONTACTO_INICIAL,
  STAGE.PRESENTACION,
  STAGE.LEVANTAMIENTO,
] as const;

export const isWonStage = (s: string): boolean => (WON_STAGE_IDS as readonly string[]).includes(s);

export const isLostStage = (s: string): boolean => (LOST_STAGE_IDS as readonly string[]).includes(s);

export const isActiveStage = (s: string): boolean => (ACTIVE_STAGE_IDS as readonly string[]).includes(s);

export const canHandoffStage = (s: string): boolean => (HANDOFF_ALLOWED_STAGE_IDS as readonly string[]).includes(s);
