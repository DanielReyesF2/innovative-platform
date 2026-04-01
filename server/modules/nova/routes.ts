import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";

export const router = Router();

const NOVA_API_URL = process.env.NOVA_API_URL;
const NOVA_API_KEY = process.env.NOVA_API_KEY;
const NOVA_TENANT_ID = process.env.NOVA_TENANT_ID;

// All nova routes require authentication
router.use(requireAuth);

// POST /api/nova/chat — Proxy chat to Nova AI with SSE streaming
router.post("/chat", async (req, res) => {
  try {
    if (!NOVA_API_URL || !NOVA_API_KEY) {
      return res.status(503).json({
        message: "Nova AI no esta configurado. Verifica NOVA_API_URL y NOVA_API_KEY.",
      });
    }

    const user = req.user!;
    const chatSchema = z.object({
      message: z.string().min(1, "Message is required").max(10000),
      conversationId: z.string().optional(),
    });
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Datos inválidos" });
    }
    const { message, conversationId } = parsed.data;

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Forward request to Nova AI API Gateway
    const novaRes = await fetch(`${NOVA_API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NOVA_API_KEY}`,
        "X-Tenant-ID": NOVA_TENANT_ID || "",
        "X-User-ID": String(user.id),
        "X-User-Role": user.role,
      },
      body: JSON.stringify({
        message,
        conversationId,
        tenantId: NOVA_TENANT_ID,
        userId: user.id,
        userName: user.name,
      }),
    });

    if (!novaRes.ok) {
      const errorText = await novaRes.text();
      console.error("[nova] API error:", novaRes.status, errorText);
      res.write(`data: ${JSON.stringify({ type: "error", content: "Error al comunicar con Nova AI" })}\n\n`);
      res.end();
      return;
    }

    // Stream response back to client
    if (novaRes.body) {
      const reader = novaRes.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (streamError) {
        console.error("[nova] Stream error:", streamError);
      }
    } else {
      // Non-streaming fallback
      const data = await novaRes.json();
      res.write(`data: ${JSON.stringify({ type: "message", content: data.message || data })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("[nova] Chat error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error connecting to Nova AI" });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", content: "Error de conexion" })}\n\n`);
      res.end();
    }
  }
});

// GET /api/nova/status — Check Nova AI connectivity
router.get("/status", async (_req, res) => {
  try {
    if (!NOVA_API_URL) {
      return res.json({ connected: false, reason: "NOVA_API_URL not configured" });
    }

    const healthRes = await fetch(`${NOVA_API_URL}/health`, {
      headers: { Authorization: `Bearer ${NOVA_API_KEY || ""}` },
      signal: AbortSignal.timeout(5000),
    });

    res.json({
      connected: healthRes.ok,
      status: healthRes.status,
      tenantId: NOVA_TENANT_ID,
    });
  } catch (error) {
    res.json({ connected: false, reason: "Connection failed" });
  }
});

export default router;
