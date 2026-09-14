-- Insurance was a flat fee this app invented; RajaOngkir quotes none, so the
-- option is gone. CourierType was guessed from the service name, not returned
-- by the API, so it goes too.

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "courierType",
DROP COLUMN "insuranceFee",
DROP COLUMN "insured";

-- DropEnum
DROP TYPE "CourierType";
