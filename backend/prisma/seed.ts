
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
async function main() {
  console.log("🌱 Seeding database...");
  await prisma.adminAuditLog.deleteMany();
  await prisma.trackingEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rateCard.deleteMany();
  await prisma.zoneETA.deleteMany();
  await prisma.area.deleteMany();
  await prisma.user.deleteMany();
  await prisma.zone.deleteMany();
  const [zoneA, zoneB, zoneC] = await Promise.all([
    prisma.zone.create({ data: { name: "ZONE_A" } }),
    prisma.zone.create({ data: { name: "ZONE_B" } }),
    prisma.zone.create({ data: { name: "ZONE_C" } }),
  ]);
  console.log("✅ Zones created: ZONE_A, ZONE_B, ZONE_C");
  await prisma.area.createMany({
    data: [
      { name: "110001", pincode: "110001", zoneId: zoneA.id },
      { name: "110002", pincode: "110002", zoneId: zoneA.id },
      { name: "110007", pincode: "110007", zoneId: zoneB.id },
      { name: "110009", pincode: "110009", zoneId: zoneB.id },
      { name: "110016", pincode: "110016", zoneId: zoneC.id },
      { name: "110017", pincode: "110017", zoneId: zoneC.id },
    ],
  });
  console.log("✅ Areas created (6 pincodes across 3 zones)");
  const PASSWORD_ROUNDS = 10;
  const [admin, customer, agent1, agent2, agent3] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@lastmile.com",
        passwordHash: await bcrypt.hash("Admin@123", PASSWORD_ROUNDS),
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        name: "Test Customer",
        email: "customer@lastmile.com",
        phone: "9000000001",
        passwordHash: await bcrypt.hash("Customer@123", PASSWORD_ROUNDS),
        role: "CUSTOMER",
      },
    }),
    prisma.user.create({
      data: {
        name: "Agent One",
        email: "agent1@lastmile.com",
        phone: "9000000002",
        passwordHash: await bcrypt.hash("Agent@123", PASSWORD_ROUNDS),
        role: "AGENT",
        availability: "AVAILABLE",
        currentZoneId: zoneA.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Agent Two",
        email: "agent2@lastmile.com",
        phone: "9000000003",
        passwordHash: await bcrypt.hash("Agent@123", PASSWORD_ROUNDS),
        role: "AGENT",
        availability: "AVAILABLE",
        currentZoneId: zoneB.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Agent Three",
        email: "agent3@lastmile.com",
        phone: "9000000004",
        passwordHash: await bcrypt.hash("Agent@123", PASSWORD_ROUNDS),
        role: "AGENT",
        availability: "OFFLINE",
        currentZoneId: zoneC.id,
      },
    }),
  ]);
  console.log(`✅ Users created: ${admin.email}, ${customer.email}, ${agent1.email}, ${agent2.email}, ${agent3.email}`);
  const rateData = (zoneId: string, base: number) => [
    { zoneId, orderType: "B2B" as const, isIntraZone: true,  ratePerKg: base,      codSurcharge: 29 },
    { zoneId, orderType: "B2C" as const, isIntraZone: true,  ratePerKg: base - 10, codSurcharge: 29 },
    { zoneId, orderType: "B2B" as const, isIntraZone: false, ratePerKg: base + 30, codSurcharge: 29 },
    { zoneId, orderType: "B2C" as const, isIntraZone: false, ratePerKg: base + 20, codSurcharge: 29 },
  ];
  await prisma.rateCard.createMany({
    data: [
      ...rateData(zoneA.id, 50),
      ...rateData(zoneB.id, 55),
      ...rateData(zoneC.id, 60),
    ],
  });
  console.log("✅ Rate cards created (12 total: 4 per zone)");
  const zones = [zoneA, zoneB, zoneC];
  const etaMinutes: Record<string, Record<string, number>> = {
    [zoneA.id]: { [zoneA.id]: 30, [zoneB.id]: 60, [zoneC.id]: 90 },
    [zoneB.id]: { [zoneA.id]: 60, [zoneB.id]: 30, [zoneC.id]: 60 },
    [zoneC.id]: { [zoneA.id]: 90, [zoneB.id]: 60, [zoneC.id]: 30 },
  };
  const etaData = zones.flatMap((from) =>
    zones.map((to) => ({
      fromZoneId: from.id,
      toZoneId: to.id,
      etaMinutes: etaMinutes[from.id][to.id],
    }))
  );
  await prisma.zoneETA.createMany({ data: etaData });
  console.log("✅ Zone ETAs created (9 pairs)");
  console.log("\n🎉 Seed complete!");
  console.log("\nTest credentials:");
  console.log("  Admin:    admin@lastmile.com    / Admin@123");
  console.log("  Customer: customer@lastmile.com / Customer@123");
  console.log("  Agent 1:  agent1@lastmile.com   / Agent@123  (AVAILABLE, ZONE_A)");
  console.log("  Agent 2:  agent2@lastmile.com   / Agent@123  (AVAILABLE, ZONE_B)");
  console.log("  Agent 3:  agent3@lastmile.com   / Agent@123  (OFFLINE,   ZONE_C)");
}
main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
