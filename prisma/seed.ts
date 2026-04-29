import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Spots A1–A20 (numbered 1-20, not 0-20)
  const labels = Array.from({ length: 20 }, (_, i) => `A${i + 1}`);
  for (const label of labels) {
    await prisma.spot.upsert({
      where: { label },
      update: {},
      create: { label },
    });
  }

  // Remove any legacy A0 spot if present (and unused). Sessions referencing A0
  // will block the delete, which is desirable to avoid orphaning history.
  const legacyA0 = await prisma.spot.findUnique({ where: { label: "A0" } });
  if (legacyA0) {
    const refCount = await prisma.session.count({ where: { spotId: legacyA0.id } });
    if (refCount === 0) {
      await prisma.spot.delete({ where: { id: legacyA0.id } });
      console.log("Removed legacy spot A0");
    } else {
      console.log(`Spot A0 has ${refCount} session(s) — leaving in place`);
    }
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

  console.log("Seed complete: spots A1–A20 + default config + ticket counter");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
