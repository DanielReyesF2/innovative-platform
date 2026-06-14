// Permission catalog — capabilities checked by requirePermission (Opción B).
// Single source of truth for the role seed (server/modules/settings/storage.ts)
// and the reconcile script (scripts/reconcile-roles.ts). Derived from the actual
// requireRole call sites so migrating to permissions preserves current behavior.

export const PERMISSIONS = {
  PROSPECTS_DELETE: "prospects.delete",
  PROSPECTS_SEND_OPS: "prospects.send_ops",
  SALES_METRICS_EDIT: "sales_metrics.edit",
  ALERTS_GENERATE: "alerts.generate",
  KPIS_MANAGE: "kpis.manage",
  SURVEYS_REVIEW: "surveys.review",
  SURVEYS_ACCEPT: "surveys.accept",
  SURVEYS_REJECT_HANDOFF: "surveys.reject_handoff",
  SURVEYS_APPROVE: "surveys.approve",
  SURVEYS_RETURN: "surveys.return",
  SURVEYS_REOPEN: "surveys.reopen",
  SURVEYS_FILL: "surveys.fill",
  SURVEYS_SUBMIT: "surveys.submit",
  TEAM_VIEW: "team.view",
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  COTIZACIONES_VIEW: "cotizaciones.view",
  COTIZACIONES_EDIT: "cotizaciones.edit",
  COTIZACIONES_VOBO: "cotizaciones.vobo",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Wildcard — admin holds this and passes every permission check.
export const WILDCARD = "*";

const P = PERMISSIONS;

// Canonical roles and their baseline permissions. Admins can tune these per role
// from Settings (Opción B); this is only the seed/baseline, not a hard ceiling.
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [WILDCARD],
  director: [
    P.PROSPECTS_DELETE,
    P.PROSPECTS_SEND_OPS,
    P.SALES_METRICS_EDIT,
    P.SURVEYS_REVIEW,
    P.SURVEYS_ACCEPT,
    P.SURVEYS_REJECT_HANDOFF,
    P.SURVEYS_APPROVE,
    P.SURVEYS_RETURN,
    P.SURVEYS_REOPEN,
    P.COTIZACIONES_VIEW,
    P.COTIZACIONES_EDIT,
    P.COTIZACIONES_VOBO,
    P.TEAM_VIEW,
  ],
  comercial: [P.PROSPECTS_DELETE, P.PROSPECTS_SEND_OPS, P.TEAM_VIEW, P.COTIZACIONES_VIEW, P.COTIZACIONES_EDIT],
  operaciones: [
    P.SURVEYS_REVIEW,
    P.SURVEYS_ACCEPT,
    P.SURVEYS_REJECT_HANDOFF,
    P.SURVEYS_FILL,
    P.SURVEYS_SUBMIT,
    P.TEAM_VIEW,
  ],
  viewer: [],
};

// Display metadata for the canonical roles (used by the seed and Settings UI).
export const ROLE_META: Record<string, { displayName: string; description: string }> = {
  admin: { displayName: "Administrador", description: "Acceso completo al sistema" },
  director: {
    displayName: "Director",
    description: "Gestión, aprobación de levantamientos y reportes",
  },
  comercial: { displayName: "Comercial", description: "Pipeline comercial y prospectos" },
  operaciones: {
    displayName: "Operaciones",
    description: "Levantamientos y operación en sitio",
  },
  viewer: { displayName: "Visualizador", description: "Solo lectura" },
};

// True if a role's permission list grants the requested permission.
export function hasPermission(rolePermissions: string[] | null | undefined, required: string): boolean {
  if (!rolePermissions) return false;
  return rolePermissions.includes(WILDCARD) || rolePermissions.includes(required);
}
