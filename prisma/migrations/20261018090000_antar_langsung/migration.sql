-- Antar Langsung, our own courier, has no quote: its price is agreed with the
-- customer on WhatsApp and set by an admin before the order is paid, so an
-- order can exist without one.

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "shippingCost" DROP NOT NULL,
ALTER COLUMN "total" DROP NOT NULL;
