import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Spots A1–A20
  const labels = Array.from({ length: 20 }, (_, i) => `A${i + 1}`);
  for (const label of labels) {
    await prisma.spot.upsert({
      where: { label },
      update: {},
      create: { label },
    });
  }

  // Default config (you can edit later via SQL/Admin UI)
  const defaults: Record<string, string | number> = {
    rate_cents: 500,          // $5 flat
    duration_minutes: 120,    // 2 hours
    grace_minutes: 10,        // 10-minute grace period
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.config.upsert({
      where: { key },
      update: { value: String(value), updatedAt: new Date() },
      create: { key, value: String(value) },
    });
  }

  console.log("Seed complete: spots A1–A20 + default config");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
