import { Router, Request, Response } from "express";
import prisma from "./prisma";
import { requireAuth } from "./middleware";
import { calculatePrice, generateTrackingId } from "./utils";
import { orderEvents } from "./notifications";

const router = Router();

router.use(requireAuth);

router.post("/preview", async (req: Request, res: Response) => {
  try {
    const { length, breadth, height, actualWeight, pickupAreaOrPincode, dropAreaOrPincode, orderType, paymentType } = req.body;

    const pricing = await calculatePrice({
      length, breadth, height, actualWeight, pickupAreaOrPincode, dropAreaOrPincode, orderType, paymentType
    });

    const eta = await prisma.zoneETA.findFirst({
      where: { fromZoneId: pricing.pickupZoneId, toZoneId: pricing.dropZoneId }
    });

    res.json({ ...pricing, etaMinutes: eta?.etaMinutes || null });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  if (req.user!.role !== "CUSTOMER") {
    return res.status(403).json({ error: "Only customers can create orders directly" });
  }

  const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

  try {
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
      if (existing) {
        return res.json({ order: existing });
      }
    }

    const { length, breadth, height, actualWeight, pickupAddress, dropAddress, pickupAreaOrPincode, dropAreaOrPincode, orderType, paymentType } = req.body;

    const pricing = await calculatePrice({
      length, breadth, height, actualWeight, pickupAreaOrPincode, dropAreaOrPincode, orderType, paymentType
    });

    const eta = await prisma.zoneETA.findFirst({
      where: { fromZoneId: pricing.pickupZoneId, toZoneId: pricing.dropZoneId }
    });

    let estimatedDeliveryAt: Date | null = null;
    if (eta?.etaMinutes) {
      estimatedDeliveryAt = new Date();
      estimatedDeliveryAt.setMinutes(estimatedDeliveryAt.getMinutes() + eta.etaMinutes);
    }

    const trackingId = await generateTrackingId();
    const order = await prisma.$transaction(async (tx: any) => {
      const newOrder = await tx.order.create({
        data: {
          id: trackingId,
          idempotencyKey,
          customerId: req.user!.userId,
          pickupAddress,
          dropAddress,
          pickupArea: pickupAreaOrPincode,
          dropArea: dropAreaOrPincode,
          pickupZoneId: pricing.pickupZoneId,
          dropZoneId: pricing.dropZoneId,
          length, breadth, height, actualWeight,
          orderType, paymentType,
          volumetricWeight: pricing.volumetricWeight,
          billableWeight: pricing.billableWeight,
          ratePerKg: pricing.ratePerKg,
          baseCharge: pricing.baseCharge,
          codSurcharge: pricing.codSurcharge,
          totalCharge: pricing.totalCharge,
          estimatedDeliveryAt
        }
      });

      await tx.trackingEvent.create({
        data: { 
          orderId: newOrder.id, 
          fromStatus: null,
          toStatus: "CREATED", 
          actorId: req.user!.userId,
          actorRole: "CUSTOMER"
        }
      });

      return newOrder;
    });

    orderEvents.emit("statusChanged", order.id, "CREATED");

    res.status(201).json({ order });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { customerId: req.user!.userId },
    orderBy: { createdAt: "desc" }
  });
  res.json({ orders });
});

router.get("/:id", async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      trackingEvents: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.customerId !== req.user!.userId) {
    return res.status(403).json({ error: "Forbidden: You cannot access this order" });
  }

  res.json({ order });
});

router.post("/:id/reschedule", async (req: Request, res: Response) => {
  const { scheduledAt } = req.body;

  if (!scheduledAt) {
    return res.status(400).json({ error: "scheduledAt is required" });
  }

  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.customerId !== req.user!.userId) {
      return res.status(403).json({ error: "Forbidden: You cannot access this order" });
    }

    if (order.status !== "FAILED") {
      return res.status(400).json({ error: "Only FAILED orders can be rescheduled" });
    }

    const updatedOrder = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "RESCHEDULED",
          agentId: null,
          scheduledAt: new Date(scheduledAt)
        }
      });

      await tx.trackingEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "RESCHEDULED",
          actorId: req.user!.userId,
          actorRole: "CUSTOMER",
          note: `Customer rescheduled for ${new Date(scheduledAt).toLocaleString()}`
        }
      });

      return updated;
    });

    orderEvents.emit("statusChanged", updatedOrder.id, "RESCHEDULED");

    res.json({ order: updatedOrder });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to reschedule order" });
  }
});

export default router;
