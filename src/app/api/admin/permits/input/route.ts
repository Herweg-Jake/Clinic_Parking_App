import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePlate } from "@/lib/plates";
import { parse } from "csv-parse/sync";

/**
 * POST /api/admin/permits/import
 * Accepts text/csv in the request body (multipart file OR raw text).
 *
 * Expected CSV headers (case-insensitive):
 *   licensePlate, kind, validFrom, validTo, email?, phone?
 *
 * - kind: appointment | staff | long_term
 * - dates: ISO or anything JS Date can parse (YYYY-MM-DD recommended)
 *
 * Example:
 * licensePlate,kind,validFrom,validTo,email,phone
 * TEST123,appointment,2025-10-01,2025-10-31,pt@example.com,555-1234
 */
export async function POST(req: Request) {
  try {
    let csvText = "";

    // Handle multipart/form-data OR raw text/csv
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "Missing CSV file" }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      csvText = await req.text();
      if (!csvText?.trim()) {
        return NextResponse.json({ error: "Empty CSV payload" }, { status: 400 });
      }
    }

    // Parse CSV
    const records = parse(csvText, {
      columns: (h: string[]) => h.map(x => String(x).trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    if (!records.length) {
      return NextResponse.json({ error: "No rows found" }, { status: 400 });
    }

    const allowedKinds = new Set(["appointment", "staff", "long_term"]);
    const results: Array<{ row: number; status: "ok" | "skip" | "error"; message: string }> = [];

    let okCount = 0, skipCount = 0, errorCount = 0;

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 1;
      const r = records[i];

      const rawPlate = (r["licenseplate"] || r["plate"] || "").trim();
      const kind = (r["kind"] || "").trim().toLowerCase();
      const validFromStr = (r["validfrom"] || r["from"] || "").trim();
      const validToStr = (r["validto"] || r["to"] || "").trim();
      const email = (r["email"] || "").trim();
      const phone = (r["phone"] || "").trim();

      if (!rawPlate || !kind || !validFromStr || !validToStr) {
        results.push({ row: rowNum, status: "error", message: "Missing required fields" });
        errorCount++; continue;
      }
      if (!allowedKinds.has(kind)) {
        results.push({ row: rowNum, status: "error", message: `Invalid kind: ${kind}` });
        errorCount++; continue;
      }

      const licensePlate = normalizePlate(rawPlate);
      const validFrom = new Date(validFromStr);
      const validTo = new Date(validToStr);
      if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) {
        results.push({ row: rowNum, status: "error", message: "Invalid dates" });
        errorCount++; continue;
      }
      if (validTo < validFrom) {
        results.push({ row: rowNum, status: "error", message: "validTo < validFrom" });
        errorCount++; continue;
      }

      try {
        // Upsert vehicle
        const vehicle = await prisma.vehicle.upsert({
          where: { licensePlate },
          update: {
            ownerEmail: email || null,
            ownerPhone: phone || null,
          },
          create: {
            licensePlate,
            ownerEmail: email || null,
            ownerPhone: phone || null,
          },
        });

        // If there is an existing permit overlapping, skip or adjust.
        // For MVP, we'll just create a new one. You can dedupe later if needed.
        await prisma.permit.create({
          data: {
            vehicleId: vehicle.id,
            kind: kind as any, // "appointment" | "staff" | "long_term"
            validFrom,
            validTo,
            meta: email || phone ? { email, phone } : undefined,
          },
        });

        results.push({ row: rowNum, status: "ok", message: `Upserted ${licensePlate}` });
        okCount++;
      } catch (e: any) {
        results.push({ row: rowNum, status: "error", message: e?.message || "DB error" });
        errorCount++;
      }
    }

    return NextResponse.json({
      summary: { ok: okCount, skipped: skipCount, errors: errorCount, total: records.length },
      results,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
