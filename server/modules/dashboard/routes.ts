import { Router } from "express";
import { requireAuth } from "../../middleware/auth";

export const router = Router();

// All dashboard routes require authentication
router.use(requireAuth);

// GET /api/dashboard/summary — Get dashboard summary metrics
router.get("/summary", async (_req, res) => {
  try {
    // This is a base implementation. Each project customizes with their own metrics.
    res.json({
      metrics: [],
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[dashboard] Summary error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/dashboard/stats — Get quick stats
router.get("/stats", async (req, res) => {
  try {
    res.json({
      stats: [],
      period: req.query.period || "month",
    });
  } catch (error) {
    console.error("[dashboard] Stats error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
