-- Lacak keeps a history of the waybills each account has tracked that were
-- not created in this app. One row per account, waybill and carrier, refreshed
-- on every lookup.

-- CreateTable
CREATE TABLE "tracking_lookups" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "waybill" TEXT NOT NULL,
    "courierCode" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stage" "OrderStatus" NOT NULL,
    "originNama" TEXT,
    "originAlamat" TEXT,
    "destinationNama" TEXT,
    "destinationAlamat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracking_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracking_lookups_profileId_updatedAt_idx" ON "tracking_lookups"("profileId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_lookups_profileId_waybill_courierCode_key" ON "tracking_lookups"("profileId", "waybill", "courierCode");

-- AddForeignKey
ALTER TABLE "tracking_lookups" ADD CONSTRAINT "tracking_lookups_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
