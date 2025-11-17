import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updatePricing() {
  console.log("Updating parking pricing configuration...");

  // Update rate_cents to $2/hour (200 cents)
  await prisma.config.upsert({
    where: { key: "rate_cents" },
    update: { value: "200", updatedAt: new Date() },
    create: { key: "rate_cents", value: "200" },
  });
  console.log("✓ Updated rate_cents to 200 ($2.00)");

  // Update duration_minutes to 60 (1 hour)
  await prisma.config.upsert({
    where: { key: "duration_minutes" },
    update: { value: "60", updatedAt: new Date() },
    create: { key: "duration_minutes", value: "60" },
  });
  console.log("✓ Updated duration_minutes to 60");

  // Add Nevada PT code if it doesn't exist
  await prisma.config.upsert({
    where: { key: "nevada_pt_code" },
    update: { value: "NVPT2025", updatedAt: new Date() },
    create: { key: "nevada_pt_code", value: "NVPT2025" },
  });
  console.log("✓ Updated nevada_pt_code to NVPT2025");

  // Verify the updates
  const configs = await prisma.config.findMany({
    where: { key: { in: ["rate_cents", "duration_minutes", "nevada_pt_code"] } },
  });

  console.log("\nCurrent configuration:");
  configs.forEach((config) => {
    console.log(`  ${config.key}: ${config.value}`);
  });

  console.log("\n✓ Pricing configuration updated successfully!");
}

updatePricing()
  .catch((e) => {
    console.error("Error updating pricing:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
