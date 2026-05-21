-- Restore spot A0 (displayed to users as "0") so visitors can check in to it
-- and admins can issue tickets against it. Idempotent: skip if already present.
INSERT INTO "Spot" ("id", "label", "isActive")
SELECT 'spot_a0', 'A0', true
WHERE NOT EXISTS (SELECT 1 FROM "Spot" WHERE "label" = 'A0');
