import { prisma } from "./prisma";

/**
 * Atomically increment the TicketCounter and return the next formatted ticket code.
 * Uses a database-level atomic increment to prevent duplicate codes.
 * Returns codes like TKT-001, TKT-002, etc.
 */
export async function nextTicketCode(): Promise<string> {
  const counter = await prisma.ticketCounter.update({
    where: { id: "singleton" },
    data: { count: { increment: 1 } },
  });

  return `TKT-${String(counter.count).padStart(3, "0")}`;
}
