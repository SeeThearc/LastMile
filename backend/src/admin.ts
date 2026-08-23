import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { requireAuth, requireAdmin } from "./middleware";
import { calculatePrice, generateTrackingId } from "./utils";
import { orderEvents } from "./notifications";

const router = Router();

router.use(requireAuth, requireAdmin);

router.post("/zones", async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Zone name is required" });

  try {
    const zone = await prisma.zone.create({ data: { name } });
    res.status(201).json({ zone });
  } catch (error) {
    res.status(400).json({ error: "Zone name must be unique" });
  }
});

router.get("/zones", async (req: Request, res: Response) => {
  const zones = await prisma.zone.findMany({ include: { areas: true } });
  res.json({ zones });
});

router.put("/zones/:id", async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Zone name is required" });

  try {
    const zone = await prisma.zone.update({
      where: { id: req.params.id },
      data: { name }
    });
    res.json({ zone });
  } catch (error) {
    res.status(404).json({ error: "Zone not found or name not unique" });
  }
});

router.post("/areas", async (req: Request, res: Response) => {
  const { name, pincode, zoneId } = req.body;
  if (!name || !zoneId) return res.status(400).json({ error: "name and zoneId are required" });

  try {
    const area = await prisma.area.create({
      data: { name, pincode: pincode ?? null, zoneId }
    });
    res.status(201).json({ area });
  } catch (error) {
    res.status(400).json({ error: "Area name must be unique or zone doesn't exist" });
  }
});

router.get("/areas", async (req: Request, res: Response) => {
  const areas = await prisma.area.findMany({ include: { zone: true } });
  res.json({ areas });
});

router.post("/ratecards", async (req: Request, res: Response) => {
  const { zoneId, orderType, isIntraZone, ratePerKg, codSurcharge } = req.body;
  if (!zoneId || !orderType || isIntraZone === undefined || ratePerKg === undefined) {
    return res.status(400).json({ error: "Missing required rate card fields" });
  }

  try {
    const rateCard = await prisma.rateCard.create({
      data: { zoneId, orderType, isIntraZone, ratePerKg, codSurcharge: codSurcharge || 0 }
    });
    await prisma.adminAuditLog.create({
      data: { adminId: req.user!.userId, action: "CREATED", entityType: "RateCard", entityId: rateCard.id, details: `Created ${orderType} ${isIntraZone ? 'intra' : 'inter'} zone rate` }
    });
    res.status(201).json({ rateCard });
  } catch (error) {
    res.status(400).json({ error: "Rate card for this zone, type, and direction already exists" });
  }
});

router.get("/ratecards", async (req: Request, res: Response) => {
  const rateCards = await prisma.rateCard.findMany({ include: { zone: true } });
  res.json({ rateCards });
});

router.put("/ratecards/:id", async (req: Request, res: Response) => {
  const { ratePerKg, codSurcharge } = req.body;
  
  try {
    const rateCard = await prisma.rateCard.update({
      where: { id: req.params.id },
      data: { 
        ...(ratePerKg !== undefined && { ratePerKg }),
        ...(codSurcharge !== undefined && { codSurcharge }) 
      }
    });
    await prisma.adminAuditLog.create({
      data: { adminId: req.user!.userId, action: "UPDATED", entityType: "RateCard", entityId: rateCard.id, details: `Updated rate/surcharge` }
    });
    res.json({ rateCard });
  } catch (error) {
    res.status(404).json({ error: "Rate card not found" });
  }
});

router.post("/etas", async (req: Request, res: Response) => {
  const { fromZoneId, toZoneId, etaMinutes } = req.body;
  if (!fromZoneId || !toZoneId || etaMinutes === undefined) {
    return res.status(400).json({ error: "Missing ETA fields" });
  }

  try {
    const eta = await prisma.zoneETA.create({
      data: { fromZoneId, toZoneId, etaMinutes }
    });
    await prisma.adminAuditLog.create({
      data: { adminId: req.user!.userId, action: "CREATED", entityType: "ZoneETA", entityId: eta.id, details: `Set ETA to ${etaMinutes} mins` }
    });
    res.status(201).json({ eta });
  } catch (error) {
    res.status(400).json({ error: "ETA for this zone pair already exists" });
  }
});

router.get("/etas", async (req: Request, res: Response) => {
  const etas = await prisma.zoneETA.findMany({ include: { fromZone: true, toZone: true } });
  res.json({ etas });
});

router.put("/etas/:id", async (req: Request, res: Response) => {
  const { etaMinutes } = req.body;
  
  try {
    const eta = await prisma.zoneETA.update({
      where: { id: req.params.id },
      data: { etaMinutes }
    });
    await prisma.adminAuditLog.create({
      data: { adminId: req.user!.userId, action: "UPDATED", entityType: "ZoneETA", entityId: eta.id, details: `Updated ETA to ${etaMinutes} mins` }
    });
    res.json({ eta });
  } catch (error) {
    res.status(404).json({ error: "ETA not found" });
  }
});

router.post("/orders", async (req: Request, res: Response) => {
  const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

  try {
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
      if (existing) {
        return res.json({ order: existing });
      }
    }

    const { customerId, length, breadth, height, actualWeight, pickupAddress, dropAddress, pickupAreaOrPincode, dropAreaOrPincode, orderType, paymentType } = req.body;

    if (!customerId) return res.status(400).json({ error: "customerId is required" });

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
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          id: trackingId,
          idempotencyKey,
          customerId,
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
          actorRole: "ADMIN"
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

router.get("/orders", async (req: Request, res: Response) => {
  const { status, pickupZoneId, unassigned } = req.query;

  const where: any = {};
  if (status) where.status = status;
  if (pickupZoneId) where.pickupZoneId = pickupZoneId;
  if (unassigned === "true") where.agentId = null;

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true, email: true } } }
  });

  res.json({ orders });
});

router.get("/orders/:id", async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      agent: { select: { name: true, phone: true } },
      trackingEvents: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!order) return res.status(404).json({ error: "Order not found" });

  res.json({ order });
});

router.post("/agents", async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Missing agent details" });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const agent = await prisma.user.create({
      data: { name, email, phone: phone || null, passwordHash, role: "AGENT", availability: "OFFLINE" }
    });
    res.status(201).json({ agent: { id: agent.id, name: agent.name, email: agent.email } });
  } catch (error) {
    res.status(400).json({ error: "Email already exists" });
  }
});

router.get("/customers", async (req: Request, res: Response) => {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, name: true, email: true, phone: true }
  });
  res.json({ customers });
});

router.get("/agents", async (req: Request, res: Response) => {
  const agents = await prisma.user.findMany({
    where: { role: "AGENT" },
    select: { id: true, name: true, email: true, phone: true, availability: true, currentZoneId: true }
  });
  res.json({ agents });
});

router.put("/agents/:id", async (req: Request, res: Response) => {
  const { availability, currentZoneId } = req.body;
  try {
    const agent = await prisma.user.update({
      where: { id: req.params.id, role: "AGENT" },
      data: { 
        ...(availability && { availability }),
        ...(currentZoneId !== undefined && { currentZoneId })
      },
      select: { id: true, name: true, availability: true, currentZoneId: true }
    });
    res.json({ agent });
  } catch (error) {
    res.status(404).json({ error: "Agent not found" });
  }
});

router.post("/orders/:id/assign", async (req: Request, res: Response) => {
  const { agentId } = req.body;
  if (!agentId) return res.status(400).json({ error: "agentId is required" });

  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "CREATED" && order.status !== "RESCHEDULED") {
      return res.status(400).json({ error: "Order is already assigned or in progress" });
    }

    const agent = await prisma.user.findUnique({ where: { id: agentId, role: "AGENT" } });
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    if (agent.availability !== "AVAILABLE") return res.status(400).json({ error: "Agent is not AVAILABLE" });

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { agentId: agent.id, status: "ASSIGNED" }
      });

      await tx.trackingEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "ASSIGNED",
          actorId: req.user!.userId,
          actorRole: "ADMIN",
          note: `Assigned to agent ${agent.name}`
        }
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: req.user!.userId,
          action: "ASSIGN_AGENT",
          entityType: "Order",
          entityId: order.id,
          details: `Manually assigned to agent ${agent.id}`
        }
      });

      return updated;
    });

    orderEvents.emit("statusChanged", updatedOrder.id, "ASSIGNED");

    res.json({ order: updatedOrder });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to assign agent" });
  }
});

router.post("/orders/:id/auto-assign", async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "CREATED" && order.status !== "RESCHEDULED") {
      return res.status(400).json({ error: "Order is already assigned or in progress" });
    }

    let candidates = await prisma.user.findMany({
      where: { role: "AGENT", availability: "AVAILABLE", currentZoneId: order.pickupZoneId },
      include: {
        agentOrders: {
          where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } }
        }
      }
    });

    if (candidates.length === 0) {
      candidates = await prisma.user.findMany({
        where: { role: "AGENT", availability: "AVAILABLE" },
        include: {
          agentOrders: {
            where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"] } }
          }
        }
      });
    }

    if (candidates.length === 0) {
      return res.status(404).json({ error: "No available agents found in any zone" });
    }

    candidates.sort((a, b) => a.agentOrders.length - b.agentOrders.length);
    const selectedAgent = candidates[0];

    const isSameZone = selectedAgent.currentZoneId === order.pickupZoneId;
    const reason = `Selected agent ${selectedAgent.name} because they ${isSameZone ? 'are in the pickup zone' : 'are the only available agent'} with lowest workload (${selectedAgent.agentOrders.length} active orders).`;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { agentId: selectedAgent.id, status: "ASSIGNED" }
      });

      await tx.trackingEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "ASSIGNED",
          actorId: req.user!.userId,
          actorRole: "ADMIN",
          note: `Auto-assigned: ${reason}`
        }
      });

      return updated;
    });

    orderEvents.emit("statusChanged", updatedOrder.id, "ASSIGNED");

    res.json({ order: updatedOrder, explanation: reason });
  } catch (error: any) {
    console.error("Auto-assign error:", error);
    res.status(500).json({ error: "Failed to auto-assign agent" });
  }
});

router.put("/orders/:id/status", async (req: Request, res: Response) => {
  const { status, note } = req.body;
  if (!status || !note) {
    return res.status(400).json({ error: "status and note are required for admin override" });
  }

  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const updatedOrder = await prisma.$transaction(async (tx) => {
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
          actorRole: "ADMIN",
          note: `Admin Override: ${note}`
        }
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: req.user!.userId,
          action: "STATUS_OVERRIDE",
          entityType: "Order",
          entityId: order.id,
          details: `Changed status from ${order.status} to ${status}. Reason: ${note}`
        }
      });

      return updated;
    });

    orderEvents.emit("statusChanged", updatedOrder.id, status);

    res.json({ order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: "Failed to override order status" });
  }
});

export default router;
