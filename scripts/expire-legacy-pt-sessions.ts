/**
 * One-time cleanup: expire legacy PT check-ins that were created with NO
 * expiration (before PT sessions started expiring after 1 hour).
 *
 * These sessions have `source = "nevada_pt_code"`, `status = approved_pt`, and
 * `expiresAt = null`, so they hold a spot indefinitely and never leave the
 * "active" list. This script applies the new 1-hour rule retroactively by
 * setting `expiresAt = startedAt + 60 minutes`. Sessions that checked in more
 * than an hour ago become expired immediately (freeing the spot); very recent
 * ones keep the remainder of their hour.
 *
 * Safe by default: runs as a DRY RUN and only reports what it would change.
 * Pass `--apply` to actually write the changes.
 *
 *   npm run sessions:expire-legacy        # preview (no writes)
 *   npm run sessions:expire-legacy -- --apply   # apply the changes
 */
import { PrismaClient, SessionStatus } from "@prisma/client";

const prisma = new PrismaClient();

const PT_APPROVAL_MINUTES = 60;

async function main() {
  const apply = process.argv.includes("--apply");

  const stuck = await prisma.session.findMany({
    where: {
      source: "nevada_pt_code",
      status: SessionStatus.approved_pt,
      expiresAt: null,
    },
    include: { spot: true, vehicle: true },
    orderBy: { startedAt: "asc" },
  });

  if (stuck.length === 0) {
    console.log("No legacy no-expiry PT sessions found. Nothing to do.");
    return;
  }

  const now = new Date();
  console.log(
    `Found ${stuck.length} legacy no-expiry PT session(s)${apply ? "" : " (DRY RUN — no changes written)"}:\n`
  );

  for (const s of stuck) {
    const newExpiry = new Date(s.startedAt.getTime() + PT_APPROVAL_MINUTES * 60 * 1000);
    const freedNow = newExpiry <= now;
    console.log(
      `  Spot ${s.spot.label.padEnd(4)} | ${s.vehicle.licensePlate.padEnd(8)} | ` +
        `checked in ${s.startedAt.toISOString()} -> expires ${newExpiry.toISOString()} ` +
        `${freedNow ? "(freed now)" : "(keeps remainder of hour)"}`
    );

    if (apply) {
      await prisma.session.update({
        where: { id: s.id },
        data: {
          expiresAt: newExpiry,
          notes: "legacy PT session given retroactive 1-hour expiry",
        },
      });
    }
  }

  const freedCount = stuck.filter(
    (s) => new Date(s.startedAt.getTime() + PT_APPROVAL_MINUTES * 60 * 1000) <= now
  ).length;

  console.log(
    `\n${apply ? "Applied." : "Dry run complete."} ${freedCount} of ${stuck.length} ` +
      `session(s) are now past their 1-hour window and their spots are free.`
  );
  if (!apply) {
    console.log("Re-run with `-- --apply` to write these changes.");
  }
}

main()
  .catch((e) => {
    console.error("Error expiring legacy PT sessions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
