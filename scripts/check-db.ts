import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log("🔍 Checking database setup...\n");

  try {
    // 1. Check connection
    console.log("1️⃣ Testing database connection...");
    await prisma.$connect();
    console.log("   ✅ Database connected\n");

    // 2. Check spots
    console.log("2️⃣ Checking parking spots...");
    const spots = await prisma.spot.findMany();
    console.log(`   Found ${spots.length} spots`);
    if (spots.length === 0) {
      console.log("   ⚠️  No spots found! Run: npm run db:seed");
    } else {
      console.log(`   ✅ Spots: ${spots.map(s => s.label).join(", ")}\n`);
    }

    // 3. Check config
    console.log("3️⃣ Checking configuration...");
    const configs = await prisma.config.findMany();
    console.log(`   Found ${configs.length} config entries`);

    const requiredKeys = ["rate_cents", "duration_minutes", "grace_minutes"];
    const missingKeys = requiredKeys.filter(
      key => !configs.find(c => c.key === key)
    );

    if (missingKeys.length > 0) {
      console.log(`   ⚠️  Missing config keys: ${missingKeys.join(", ")}`);
      console.log("   Run: npm run db:seed");
    } else {
      console.log("   ✅ All required config keys found");
      configs.forEach(c => {
        console.log(`      ${c.key}: ${c.value}`);
      });
      console.log();
    }

    // 4. Check vehicles and permits
    console.log("4️⃣ Checking vehicles and permits...");
    const vehicles = await prisma.vehicle.count();
    const permits = await prisma.permit.count();
    console.log(`   Vehicles: ${vehicles}`);
    console.log(`   Permits: ${permits}\n`);

    // 5. Check sessions
    console.log("5️⃣ Checking sessions...");
    const sessions = await prisma.session.count();
    const activeSessions = await prisma.session.count({
      where: {
        status: { in: ["approved_pt", "paid"] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    console.log(`   Total sessions: ${sessions}`);
    console.log(`   Active sessions: ${activeSessions}\n`);

    // 6. Check payments
    console.log("6️⃣ Checking payments...");
    const payments = await prisma.payment.count();
    console.log(`   Total payments: ${payments}\n`);

    console.log("✅ Database check complete!");

  } catch (error: any) {
    console.error("❌ Database error:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
