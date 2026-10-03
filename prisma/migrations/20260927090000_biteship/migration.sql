-- RajaOngkir and Komship are replaced by Biteship. Biteship identifies places
-- by string area ids (kecamatan + postal code), so destination ids become text.
--
-- Saved addresses lose their RajaOngkir subdistrict: those ids mean nothing to
-- Biteship, and the address form asks for the location again. Existing orders
-- keep theirs as text, since they are history and never re-priced.

-- AlterTable
ALTER TABLE "addresses" ALTER COLUMN "destinationId" SET DATA TYPE TEXT;

UPDATE "addresses" SET "destinationId" = NULL, "destinationLabel" = NULL, "zipCode" = NULL;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "originId" SET DATA TYPE TEXT,
ALTER COLUMN "destinationId" SET DATA TYPE TEXT,
DROP COLUMN "komshipOrderId",
DROP COLUMN "komshipOrderNo",
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "biteshipOrderId" TEXT,
ADD COLUMN "biteshipTrackingId" TEXT,
ADD COLUMN "trackingUrl" TEXT;
