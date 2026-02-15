import assert from "node:assert/strict";
import net from "node:net";
import { URL } from "node:url";
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

function warn(message: string) {
  warnings.push(message);
  console.warn(`⚠️  ${message}`);
}

function hasEnv(name: string): boolean {
  return Boolean(process.env[name]);
}

function ensureEnv(name: string, strict: boolean): boolean {
  if (hasEnv(name)) return true;
  const message = `Missing env var: ${name}`;
  if (strict) {
    assert.fail(message);
  }
  warn(`${message} (set STRICT_INTEGRATION_ENV=1 to fail hard).`);
  return false;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isLikelyConnectivityError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return [
    "can't reach database server",
    "network is unreachable",
    "econnrefused",
    "etimedout",
    "connect tunnel failed",
    "fetch failed",
    "unable to connect",
    "connection to stripe",
  ].some((token) => message.includes(token));
}

async function runTest(test: TestCase) {
  try {
    await test.run();
    console.log(`✅ ${test.name}`);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    failures.push(`${test.name}: ${message}`);
    console.error(`❌ ${test.name}`);
    console.error(`   ${message}`);
  }
}

async function fetchJson(url: string): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

async function detectHttpEgressBlocked(): Promise<boolean> {
  try {
    const response = await fetch("https://api.stripe.com", { method: "GET" });
    const serverHeader = response.headers.get("server") || "";
    if (response.status === 403 && serverHeader.toLowerCase().includes("envoy")) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

async function canReachTcp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 4000 }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function databaseHostFromUrl(databaseUrl: string): { host: string; port: number } | null {
  try {
    const parsed = new URL(databaseUrl);
    const host = parsed.hostname;
    const port = Number(parsed.port || 5432);
    if (!host) return null;
    return { host, port };
  } catch {
    return null;
  }
}

async function main() {
  console.log("\n🧪 Running integration service checks...\n");

  const strictEnv = process.env.STRICT_INTEGRATION_ENV === "1";
  const strictExternal = process.env.STRICT_INTEGRATION_EXTERNAL === "1";
  const tests: TestCase[] = [];

  const httpEgressBlocked = await detectHttpEgressBlocked();
  if (httpEgressBlocked) {
    warn("Outbound HTTP appears blocked in this environment; external API checks may be skipped.");
  }

  tests.push({
    name: "Critical integration env vars are present",
    run: async () => {
      ensureEnv("NEXT_PUBLIC_BASE_URL", strictEnv);
      if (!hasEnv("DATABASE_URL")) {
        warn("DATABASE_URL is not set; database-dependent checks will be skipped.");
      }
    },
  });

  if (hasEnv("DATABASE_URL")) {
    const dbTarget = databaseHostFromUrl(process.env.DATABASE_URL!);
    let dbReachable = true;

    if (dbTarget) {
      dbReachable = await canReachTcp(dbTarget.host, dbTarget.port);
      if (!dbReachable) {
        const msg = `Database host ${dbTarget.host}:${dbTarget.port} is not reachable from this environment.`;
        if (strictExternal) {
          tests.push({
            name: "Database network reachability",
            run: async () => assert.fail(msg),
          });
        } else {
          warn(`${msg} Skipping DB checks (set STRICT_INTEGRATION_EXTERNAL=1 to fail hard).`);
        }
      }
    }

    if (dbReachable) {
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
  } else {
    warn("Skipping DB integration checks because DATABASE_URL is not set.");
  }

  tests.push({
    name: "Stripe API credentials work",
    run: async () => {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        warn("Skipping Stripe API check because STRIPE_SECRET_KEY is not set.");
        return;
      }
      if (httpEgressBlocked && !strictExternal) {
        warn("Skipping Stripe API check due to outbound HTTP restrictions in this environment.");
        return;
      }

      const stripe = new Stripe(stripeSecretKey);
      try {
        const balance = await stripe.balance.retrieve();
        assert.ok(Array.isArray(balance.available), "Unexpected Stripe balance response.");
      } catch (error: unknown) {
        if (!strictExternal && isLikelyConnectivityError(error)) {
          warn(`Skipping Stripe API check due to connectivity constraints (${getErrorMessage(error)}).`);
          return;
        }
        throw error;
      }
    },
  });

  tests.push({
    name: "Stripe webhook signature verification path works",
    run: async () => {
      const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!stripeWebhookSecret) {
        warn("Skipping Stripe webhook signature check because STRIPE_WEBHOOK_SECRET is not set.");
        return;
      }

      const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });
      const header = Stripe.webhooks.generateTestHeaderString({
        payload,
        secret: stripeWebhookSecret,
      });
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");
      const event = stripe.webhooks.constructEvent(payload, header, stripeWebhookSecret);
      assert.equal(event.type, "checkout.session.completed");
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

      ensureEnv("TWILIO_PHONE_NUMBER", strictEnv);
      if (httpEgressBlocked && !strictExternal) {
        warn("Skipping Twilio API check due to outbound HTTP restrictions in this environment.");
        return;
      }

      const client = Twilio(sid, token);
      try {
        const account = await client.api.accounts(sid).fetch();
        assert.equal(account.sid, sid, "Twilio account SID mismatch.");
      } catch (error: unknown) {
        if (!strictExternal && isLikelyConnectivityError(error)) {
          warn(`Skipping Twilio API check due to connectivity constraints (${getErrorMessage(error)}).`);
          return;
        }
        throw error;
      }
    },
  });

  tests.push({
    name: "Optional live endpoint health checks",
    run: async () => {
      const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
      if (!baseUrl) {
        warn("Skipping live endpoint checks because APP_BASE_URL/NEXT_PUBLIC_BASE_URL is not set.");
        return;
      }
      if (httpEgressBlocked && !strictExternal) {
        warn("Skipping live endpoint checks due to outbound HTTP restrictions in this environment.");
        return;
      }

      try {
        const health = await fetchJson(`${baseUrl}/api/health`);
        assert.ok(health.status >= 200 && health.status < 500, `Unexpected /api/health status: ${health.status}`);
      } catch (error: unknown) {
        if (!strictExternal && isLikelyConnectivityError(error)) {
          warn(`Could not reach ${baseUrl}/api/health (${getErrorMessage(error)}).`);
          return;
        }
        throw error;
      }

      try {
        const availability = await fetchJson(`${baseUrl}/api/spots/availability`);
        assert.ok(
          availability.status >= 200 && availability.status < 500,
          `Unexpected /api/spots/availability status: ${availability.status}`
        );
      } catch (error: unknown) {
        if (!strictExternal && isLikelyConnectivityError(error)) {
          warn(`Could not reach ${baseUrl}/api/spots/availability (${getErrorMessage(error)}).`);
          return;
        }
        throw error;
      }
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

main().catch(async (error: unknown) => {
  console.error("\n❌ Integration suite crashed", getErrorMessage(error));
  await prisma.$disconnect();
  process.exit(1);
});
