-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('MENUNGGU_PEMBAYARAN', 'DIPROSES', 'DIJEMPUT', 'DALAM_PERJALANAN', 'SELESAI', 'BATAL');

-- CreateEnum
CREATE TYPE "CourierType" AS ENUM ('REGULAR', 'SAMEDAY', 'INSTANT');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "telp" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "destinationId" INTEGER,
    "destinationLabel" TEXT,
    "zipCode" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "orderNo" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'MENUNGGU_PEMBAYARAN',
    "senderNama" TEXT NOT NULL,
    "senderTelp" TEXT NOT NULL,
    "senderAlamat" TEXT NOT NULL,
    "receiverNama" TEXT NOT NULL,
    "receiverTelp" TEXT NOT NULL,
    "receiverAlamat" TEXT NOT NULL,
    "originId" INTEGER NOT NULL,
    "originLabel" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "originArea" TEXT NOT NULL,
    "destinationId" INTEGER NOT NULL,
    "destinationLabel" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "destinationArea" TEXT NOT NULL,
    "courierCode" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "courierType" "CourierType" NOT NULL DEFAULT 'REGULAR',
    "etd" TEXT,
    "weightGram" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "shippingCost" INTEGER NOT NULL,
    "insuranceFee" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "insured" BOOLEAN NOT NULL DEFAULT false,
    "awb" TEXT,
    "komshipOrderId" TEXT,
    "komshipOrderNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "addresses_profileId_idx" ON "addresses"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNo_key" ON "orders"("orderNo");

-- CreateIndex
CREATE INDEX "orders_profileId_createdAt_idx" ON "orders"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_awb_idx" ON "orders"("awb");

-- CreateIndex
CREATE INDEX "tracking_events_orderId_occurredAt_idx" ON "tracking_events"("orderId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_events_orderId_title_occurredAt_key" ON "tracking_events"("orderId", "title", "occurredAt");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
