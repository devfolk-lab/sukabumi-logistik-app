-- Orders are now held as Biteship draft orders until the customer's bank
-- transfer is verified; the draft is confirmed in the Biteship dashboard,
-- which books the courier. The draft id is unique, like the order it becomes.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "biteshipDraftId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_biteshipDraftId_key" ON "orders"("biteshipDraftId");
