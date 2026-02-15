import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import Stripe from "stripe";
import Twilio from "twilio";
import { SessionStatus } from "@prisma/client";
import {
  createExtensionToken,
  validateExtensionToken,
  markTokenUsed,
  buildExtendUrl,
  buildStatusUrl,
} from "../src/lib/tokens";

type TestCase = {
  name: string;
  run: () => Promise<void>;
};

const failures: string[] = [];
const warnings: string[] = [];

async function runTest(test: TestCase) {
  try {
    await test.run();
    console.log(`✅ ${test.name}`);
  } catch (error: any) {
    failures.push(`${test.name}: ${error?.message || String(error)}`);
    console.error(`❌ ${test.name}`);
    console.error(`   ${error?.message || String(error)}`);
  }
}

function warn(message: string) {
  warnings.push(message);
  console.warn(`⚠️  ${message}`);
}

function ensureEnv(name: string, strict: boolean): boolean {
  const value = process.env[name];
  if (value) return true;

  const message = `Missing env var: ${name}`;
  if (strict) {
    assert.ok(value, message);
  } else {
    warn(`${message} (set STRICT_INTEGRATION_ENV=1 to fail hard).`);
  }
  return false;
}

async function main() {
  console.log("\n🧪 Running integration service checks...\n");

  const tests: TestCase[] = [];

  const strictEnv = process.env.STRICT_INTEGRATION_ENV === "1";
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  if (!hasDatabaseUrl) {
    warn("Skipping DB integration checks because DATABASE_URL is not set.");
  } else {
    tests.push({
      name: "Database connection is healthy",
      run: async () => {
        await prisma.$queryRaw`SELECT 1`;
      },
    });

    tests.push({
      name: "Core DB seed/config data exists",
      run: async () => {
        const [spots, configRows] = await Promise.all([
          prisma.spot.count({ where: { isActive: true } }),
          prisma.config.findMany({
            where: {
              key: {
                in: ["rate_cents", "rate_cents_weekend", "duration_minutes", "grace_minutes"],
              },
            },
          }),
        ]);

        assert.ok(spots > 0, "No active spots found. Run `npm run db:seed`.");
        assert.equal(configRows.length, 4, "Missing one or more required config keys.");
      },
    });

    tests.push({
      name: "DB relationships (Vehicle/Payment/Session) can be written and linked",
      run: async () => {
        const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const plate = `INT${suffix}`;

        const firstSpot = await prisma.spot.findFirst({ where: { isActive: true } });
        assert.ok(firstSpot, "No active spot available for integration write test.");

        const vehicle = await prisma.vehicle.create({
          data: {
            licensePlate: plate,
            ownerPhone: "+17025550123",
          },
        });

        const payment = await prisma.payment.create({
          data: {
            stripeCheckoutSessionId: `cs_test_${suffix}`,
            amountCents: 300,
            currency: "usd",
            status: "paid",
            paidAt: new Date(),
          },
        });

        const session = await prisma.session.create({
          data: {
            vehicleId: vehicle.id,
            spotId: firstSpot.id,
            status: SessionStatus.paid,
            source: "integration_test",
            paymentId: payment.id,
            phoneNumber: "+17025550123",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
          include: {
            vehicle: true,
            spot: true,
            payment: true,
          },
        });

        assert.equal(session.vehicle.licensePlate, plate);
        assert.equal(session.spot.id, firstSpot.id);
        assert.equal(session.payment?.id, payment.id);

        await prisma.session.delete({ where: { id: session.id } });
        await prisma.payment.delete({ where: { id: payment.id } });
        await prisma.vehicle.delete({ where: { id: vehicle.id } });
      },
    });

    tests.push({
      name: "Extension token lifecycle works against DB",
      run: async () => {
        const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const plate = `TOK${suffix}`;
        const spot = await prisma.spot.findFirst({ where: { isActive: true } });
        assert.ok(spot, "No active spot found for token test.");

        const vehicle = await prisma.vehicle.create({ data: { licensePlate: plate } });
        const session = await prisma.session.create({
          data: {
            vehicleId: vehicle.id,
            spotId: spot.id,
            status: SessionStatus.paid,
            source: "integration_test",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        });

        const token = await createExtensionToken(session.id);
        const resolvedSessionId = await validateExtensionToken(token);
        assert.equal(resolvedSessionId, session.id);

        await markTokenUsed(token);
        const consumedSessionId = await validateExtensionToken(token);
        assert.equal(consumedSessionId, null);

        assert.ok(buildExtendUrl(token).includes(`/extend/${token}`));
        assert.ok(buildStatusUrl(session.id).includes(`/status?session=${session.id}`));

        await prisma.extensionToken.deleteMany({ where: { sessionId: session.id } });
        await prisma.session.delete({ where: { id: session.id } });
        await prisma.vehicle.delete({ where: { id: vehicle.id } });
      },
    });
  }

  tests.push({
      name: "Stripe API credentials work",
      run: async () => {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
          warn("Skipping Stripe API check because STRIPE_SECRET_KEY is not set.");
          return;
        }

        const stripe = new Stripe(stripeSecretKey);
        const balance = await stripe.balance.retrieve();
        assert.ok(Array.isArray(balance.available), "Unexpected Stripe balance response.");
      },
    });

  tests.push({
      name: "Twilio API credentials work",
      run: async () => {
        const sid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;

        if (!sid || !token) {
          warn("Skipping Twilio API check because TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN are not set.");
          return;
        }

        const client = Twilio(sid, token);
        const account = await client.api.accounts(sid).fetch();
        assert.equal(account.sid, sid, "Twilio account SID mismatch.");
      },
    });

  tests.push({
      name: "Critical integration env vars are present",
      run: async () => {
        if (hasDatabaseUrl) {
          ensureEnv("DATABASE_URL", strictEnv);
        } else {
          warn("DATABASE_URL is not set; database-dependent routes will fail until configured.");
        }
        ensureEnv("NEXT_PUBLIC_BASE_URL", strictEnv);
      },
    });

  for (const test of tests) {
    await runTest(test);
  }

  await prisma.$disconnect();

  console.log("\n--- Integration service summary ---");
  console.log(`Passed: ${tests.length - failures.length}`);
  console.log(`Failed: ${failures.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (warnings.length) {
    console.log("\nWarnings:");
    warnings.forEach((w) => console.log(` - ${w}`));
  }

  if (failures.length) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(` - ${f}`));
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  console.error("\n❌ Integration suite crashed", error);
  await prisma.$disconnect();
  process.exit(1);
});
