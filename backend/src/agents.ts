import { Router, Request, Response } from "express";
import prisma from "./prisma";
import { requireAuth, requireAgent } from "./middleware";
import { orderEvents } from "./notifications";

const router = Router();

router.use(requireAuth, requireAgent);

router.put("/me/state", async (req: Request, res: Response) => {
  const { availability, currentZoneId } = req.body;
  
  try {
    const updatedAgent = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(availability && { availability }),
        ...(currentZoneId !== undefined && { currentZoneId })
      },
      select: {
        id: true,
        name: true,
        availability: true,
        currentZoneId: true
      }
    });

    res.json({ agent: updatedAgent });
  } catch (error) {
    res.status(500).json({ error: "Failed to update state" });
  }
});

router.get("/orders", async (req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { agentId: req.user!.userId },
    orderBy: { createdAt: "desc" }
  });
  res.json({ orders });
});

router.get("/orders/:id", async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { trackingEvents: { orderBy: { createdAt: "asc" } } }
  });

  if (!order) return res.status(404).json({ error: "Order not found" });

  if (order.agentId !== req.user!.userId) {
    return res.status(403).json({ error: "Forbidden: You are not assigned to this order" });
  }

  res.json({ order });
});

router.put("/orders/:id/status", async (req: Request, res: Response) => {
  const { status, note } = req.body;

  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.agentId !== req.user!.userId) {
      return res.status(403).json({ error: "Forbidden: You are not assigned to this order" });
    }

    const validTransitions: Record<string, string[]> = {
      "ASSIGNED": ["PICKED_UP", "FAILED"],
      "PICKED_UP": ["IN_TRANSIT", "FAILED"],
      "IN_TRANSIT": ["OUT_FOR_DELIVERY", "FAILED"],
      "OUT_FOR_DELIVERY": ["DELIVERED", "FAILED"]
    };

    const allowedNext = validTransitions[order.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({ error: `Invalid transition from ${order.status} to ${status}` });
    }

    if (status === "FAILED" && !note) {
      return res.status(400).json({ error: "A failure reason (note) is required when marking an order as FAILED" });
    }

    const updatedOrder = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status }
      });

      await tx.trackingEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: status,
          actorId: req.user!.userId,
          actorRole: "AGENT",
          note
        }
      });

      return updated;
    });

    orderEvents.emit("statusChanged", updatedOrder.id, status);

    res.json({ order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
