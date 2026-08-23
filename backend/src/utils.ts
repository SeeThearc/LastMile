import prisma from "./prisma";

/**
 * Resolves a given area name or pincode to its configured Zone.
 * Throws an error if the area/pincode is not serviceable (not found in DB).
 */
export async function resolveZone(areaOrPincode: string) {
  const area = await prisma.area.findFirst({
    where: {
      OR: [
        { name: { equals: areaOrPincode, mode: "insensitive" } },
        { pincode: { equals: areaOrPincode } }
      ]
    },
    include: { zone: true }
  });

  if (!area) {
    throw new Error(`Area or pincode '${areaOrPincode}' is not serviceable.`);
  }

  return area.zone;
}

export interface PricingInput {
  length: number;
  breadth: number;
  height: number;
  actualWeight: number;
  pickupAreaOrPincode: string;
  dropAreaOrPincode: string;
  orderType: "B2B" | "B2C";
  paymentType: "PREPAID" | "COD";
}

/**
 * Core Pricing Engine. Calculates the exact breakdown for an order.
 */
export async function calculatePrice(input: PricingInput) {
  const volumetricWeight = (input.length * input.breadth * input.height) / 5000;
  const billableWeight = Math.max(input.actualWeight, volumetricWeight);

  const pickupZone = await resolveZone(input.pickupAreaOrPincode);
  const dropZone = await resolveZone(input.dropAreaOrPincode);
  const isIntraZone = pickupZone.id === dropZone.id;

  const rateCard = await prisma.rateCard.findUnique({
    where: {
      zoneId_orderType_isIntraZone: {
        zoneId: pickupZone.id,
        orderType: input.orderType,
        isIntraZone
      }
    }
  });

  if (!rateCard) {
    throw new Error(`No rate configuration found for Zone ${pickupZone.name}, Type ${input.orderType}, IntraZone: ${isIntraZone}`);
  }

  const baseCharge = billableWeight * rateCard.ratePerKg;
  const codSurcharge = input.paymentType === "COD" ? rateCard.codSurcharge : 0;
  const totalCharge = baseCharge + codSurcharge;

  return {
    actualWeight: input.actualWeight,
    volumetricWeight,
    billableWeight,
    pickupZone: pickupZone.name,
    pickupZoneId: pickupZone.id,
    dropZone: dropZone.name,
    dropZoneId: dropZone.id,
    rateType: isIntraZone ? "INTRA_ZONE" : "INTER_ZONE",
    orderType: input.orderType,
    paymentType: input.paymentType,
    ratePerKg: rateCard.ratePerKg,
    baseCharge,
    codSurcharge,
    totalCharge
  };
}

export async function generateTrackingId(): Promise<string> {
  let id = "";
  let isUnique = false;
  while (!isUnique) {
    id = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) isUnique = true;
  }
  return id;
}

