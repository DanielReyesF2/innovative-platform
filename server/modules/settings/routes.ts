import { Router } from "express";
import {
  createAreaSchema,
  createUserSchema,
  insertRoleSchema,
  resetPasswordSchema,
  updateAreaSchema,
  updateCompanySchema,
  updateCompanySettingsSchema,
  updateRoleSchema,
  updateUserSchema,
  upsertModuleConfigSchema,
} from "../../../shared/schema/settings";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { isErrorWithMessage } from "../../utils/errors";
import {
  createArea,
  createRole,
  createUser,
  deleteArea,
  deleteRole,
  getAreas,
  getAuditLog,
  getCompany,
  getModuleConfigs,
  getRoleById,
  getRoles,
  getUserById,
  getUserStats,
  getUsers,
  logAction,
  resetPassword,
  seedSystemRoles,
  toggleUserActive,
  updateArea,
  updateCompany,
  updateRole,
  updateUser,
  upsertCompanySettings,
  upsertModuleConfig,
} from "./storage";

export const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// Seed system roles on first request
let seeded = false;
router.use(async (_req, _res, next) => {
  if (!seeded) {
    try {
      await seedSystemRoles();
      seeded = true;
    } catch (error) {
      console.error("[settings] Seed error:", error);
    }
  }
  next();
});

// ========================
// Users
// ========================

router.get("/users", async (req, res) => {
  try {
    const { search, role, areaId, isActive } = req.query;
    const users = await getUsers({
      search: search as string,
      role: role as string,
      areaId: areaId ? Number(areaId) : undefined,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });
    res.json(users);
  } catch (error) {
    console.error("[settings] Get users error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/users/stats", async (_req, res) => {
  try {
    const stats = await getUserStats();
    res.json(stats);
  } catch (error) {
    console.error("[settings] Get user stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const user = await getUserById(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    res.json(user);
  } catch (error) {
    console.error("[settings] Get user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const parsed = createUserSchema.parse(req.body);
    const user = await createUser(parsed);
    const currentUser = req.user!;
    await logAction({
      action: "create",
      entityType: "user",
      entityId: String(user.id),
      performedById: currentUser.id,
      details: { name: user.name, email: user.email },
    });
    res.status(201).json(user);
  } catch (error: unknown) {
    if (isErrorWithMessage(error, "EMAIL_EXISTS")) {
      return res.status(409).json({ message: "El email ya esta registrado" });
    }
    console.error("[settings] Create user error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const parsed = updateUserSchema.parse(req.body);
    const currentUser = req.user!;
    const updated = await updateUser(Number(req.params.id), parsed, currentUser.id);
    if (!updated) return res.status(404).json({ message: "Usuario no encontrado" });
    await logAction({
      action: "update",
      entityType: "user",
      entityId: req.params.id,
      performedById: currentUser.id,
      details: parsed,
    });
    res.json(updated);
  } catch (error: unknown) {
    if (isErrorWithMessage(error, "CANNOT_CHANGE_OWN_ROLE")) {
      return res.status(400).json({ message: "No puedes cambiar tu propio rol" });
    }
    if (isErrorWithMessage(error, "CANNOT_DEACTIVATE_SELF")) {
      return res.status(400).json({ message: "No puedes desactivarte a ti mismo" });
    }
    if (isErrorWithMessage(error, "EMAIL_EXISTS")) {
      return res.status(409).json({ message: "El email ya esta registrado" });
    }
    console.error("[settings] Update user error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.post("/users/:id/toggle-active", async (req, res) => {
  try {
    const currentUser = req.user!;
    const updated = await toggleUserActive(Number(req.params.id), currentUser.id);
    if (!updated) return res.status(404).json({ message: "Usuario no encontrado" });
    await logAction({
      action: updated.isActive ? "activate" : "deactivate",
      entityType: "user",
      entityId: req.params.id,
      performedById: currentUser.id,
    });
    res.json(updated);
  } catch (error: unknown) {
    if (isErrorWithMessage(error, "CANNOT_DEACTIVATE_SELF")) {
      return res.status(400).json({ message: "No puedes desactivarte a ti mismo" });
    }
    console.error("[settings] Toggle user active error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/users/:id/reset-password", async (req, res) => {
  try {
    const parsed = resetPasswordSchema.parse(req.body);
    const updated = await resetPassword(Number(req.params.id), parsed.newPassword);
    if (!updated) return res.status(404).json({ message: "Usuario no encontrado" });
    const currentUser = req.user!;
    await logAction({
      action: "reset_password",
      entityType: "user",
      entityId: req.params.id,
      performedById: currentUser.id,
    });
    res.json({ message: "Contrasena actualizada" });
  } catch (error) {
    console.error("[settings] Reset password error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// ========================
// Roles
// ========================

router.get("/roles", async (_req, res) => {
  try {
    const roles = await getRoles();
    res.json(roles);
  } catch (error) {
    console.error("[settings] Get roles error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/roles/:id", async (req, res) => {
  try {
    const role = await getRoleById(Number(req.params.id));
    if (!role) return res.status(404).json({ message: "Rol no encontrado" });
    res.json(role);
  } catch (error) {
    console.error("[settings] Get role error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/roles", async (req, res) => {
  try {
    const parsed = insertRoleSchema.parse(req.body);
    const role = await createRole(parsed);
    const currentUser = req.user!;
    await logAction({
      action: "create",
      entityType: "role",
      entityId: String(role.id),
      performedById: currentUser.id,
      details: { name: role.name },
    });
    res.status(201).json(role);
  } catch (error: unknown) {
    if (isErrorWithMessage(error, "ROLE_NAME_EXISTS")) {
      return res.status(409).json({ message: "Ya existe un rol con ese nombre" });
    }
    console.error("[settings] Create role error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/roles/:id", async (req, res) => {
  try {
    const parsed = updateRoleSchema.parse(req.body);
    const updated = await updateRole(Number(req.params.id), parsed);
    if (!updated) return res.status(404).json({ message: "Rol no encontrado" });
    const currentUser = req.user!;
    await logAction({
      action: "update",
      entityType: "role",
      entityId: req.params.id,
      performedById: currentUser.id,
      details: parsed,
    });
    res.json(updated);
  } catch (error) {
    console.error("[settings] Update role error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.delete("/roles/:id", async (req, res) => {
  try {
    const deleted = await deleteRole(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Rol no encontrado" });
    const currentUser = req.user!;
    await logAction({
      action: "delete",
      entityType: "role",
      entityId: req.params.id,
      performedById: currentUser.id,
      details: { name: deleted.name },
    });
    res.json({ message: "Rol eliminado" });
  } catch (error: unknown) {
    if (isErrorWithMessage(error, "CANNOT_DELETE_SYSTEM_ROLE")) {
      return res.status(400).json({ message: "No se puede eliminar un rol del sistema" });
    }
    if (isErrorWithMessage(error, "ROLE_IN_USE")) {
      return res.status(400).json({ message: "El rol tiene usuarios asignados" });
    }
    console.error("[settings] Delete role error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ========================
// Areas
// ========================

router.get("/areas", async (_req, res) => {
  try {
    const areas = await getAreas();
    res.json(areas);
  } catch (error) {
    console.error("[settings] Get areas error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/areas", async (req, res) => {
  try {
    const parsed = createAreaSchema.parse(req.body);
    const area = await createArea(parsed);
    const currentUser = req.user!;
    await logAction({
      action: "create",
      entityType: "area",
      entityId: String(area.id),
      performedById: currentUser.id,
      details: { name: area.name },
    });
    res.status(201).json(area);
  } catch (error) {
    console.error("[settings] Create area error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/areas/:id", async (req, res) => {
  try {
    const parsed = updateAreaSchema.parse(req.body);
    const updated = await updateArea(Number(req.params.id), parsed);
    if (!updated) return res.status(404).json({ message: "Area no encontrada" });
    const currentUser = req.user!;
    await logAction({
      action: "update",
      entityType: "area",
      entityId: req.params.id,
      performedById: currentUser.id,
      details: parsed,
    });
    res.json(updated);
  } catch (error) {
    console.error("[settings] Update area error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.delete("/areas/:id", async (req, res) => {
  try {
    const deleted = await deleteArea(Number(req.params.id));
    if (!deleted) return res.status(404).json({ message: "Area no encontrada" });
    const currentUser = req.user!;
    await logAction({
      action: "delete",
      entityType: "area",
      entityId: req.params.id,
      performedById: currentUser.id,
      details: { name: deleted.name },
    });
    res.json({ message: "Area eliminada" });
  } catch (error: unknown) {
    if (isErrorWithMessage(error, "AREA_IN_USE")) {
      return res.status(400).json({ message: "El area tiene usuarios asignados" });
    }
    console.error("[settings] Delete area error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ========================
// Company
// ========================

router.get("/company", async (_req, res) => {
  try {
    const company = await getCompany();
    res.json(company);
  } catch (error) {
    console.error("[settings] Get company error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/company", async (req, res) => {
  try {
    const parsed = updateCompanySchema.parse(req.body);
    const updated = await updateCompany(parsed);
    if (!updated) return res.status(404).json({ message: "Empresa no encontrada" });
    const currentUser = req.user!;
    await logAction({
      action: "update",
      entityType: "company",
      entityId: String(updated.id),
      performedById: currentUser.id,
      details: parsed,
    });
    res.json(updated);
  } catch (error) {
    console.error("[settings] Update company error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

router.patch("/company/settings", async (req, res) => {
  try {
    const parsed = updateCompanySettingsSchema.parse(req.body);
    const updated = await upsertCompanySettings(parsed);
    if (!updated) return res.status(404).json({ message: "Empresa no encontrada" });
    const currentUser = req.user!;
    await logAction({
      action: "upsert",
      entityType: "company_settings",
      performedById: currentUser.id,
      details: parsed,
    });
    res.json(updated);
  } catch (error) {
    console.error("[settings] Update company settings error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// ========================
// Module Config
// ========================

router.get("/modules/:name/config", async (req, res) => {
  try {
    const configs = await getModuleConfigs(req.params.name);
    res.json(configs);
  } catch (error) {
    console.error("[settings] Get module config error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/modules/config", async (req, res) => {
  try {
    const parsed = upsertModuleConfigSchema.parse(req.body);
    const currentUser = req.user!;
    const config = await upsertModuleConfig(parsed, currentUser.id);
    await logAction({
      action: "upsert",
      entityType: "module_config",
      entityId: parsed.moduleName,
      performedById: currentUser.id,
      details: { key: parsed.configKey },
    });
    res.json(config);
  } catch (error) {
    console.error("[settings] Upsert module config error:", error);
    res.status(400).json({ message: "Datos invalidos" });
  }
});

// ========================
// Audit Log
// ========================

router.get("/audit-log", async (req, res) => {
  try {
    const entityType = req.query.entityType as string | undefined;
    const log = await getAuditLog(entityType);
    res.json(log);
  } catch (error) {
    console.error("[settings] Get audit log error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
