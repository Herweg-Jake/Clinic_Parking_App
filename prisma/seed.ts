import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Spots A0–A20 (21 total)
  const labels = Array.from({ length: 21 }, (_, i) => `A${i}`);
  for (const label of labels) {
    await prisma.spot.upsert({
      where: { label },
      update: {},
      create: { label },
    });
  }

  // Default config (you can edit later via SQL/Admin UI)
  const defaults: Record<string, string | number> = {
    rate_cents: 300,          // $3/hour
    duration_minutes: 60,     // 1 hour
    grace_minutes: 10,        // 10-minute grace period
    nevada_pt_code: "NVPT2025", // Code for Nevada PT patients & staff
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.config.upsert({
      where: { key },
      update: { value: String(value), updatedAt: new Date() },
      create: { key, value: String(value) },
    });
  }

  // Ticket counter singleton (for sequential ticket codes)
  await prisma.ticketCounter.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", count: 0 },
  });

  console.log("Seed complete: spots A0–A20 + default config + ticket counter");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
