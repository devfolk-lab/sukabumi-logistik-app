-- Orders are no longer held as Biteship drafts. They wait in our database
-- until an admin has checked the transfer and approves them, which books them
-- on Biteship directly. Accounts get a role to say who may approve, and who
-- may manage the staff.

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedById" UUID,
ADD COLUMN "biteshipPrice" INTEGER,
ADD COLUMN "biteshipStatus" TEXT;

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Someone has to be able to hand out roles: the operator account becomes the
-- first superadmin. A database without it gets one from `pnpm db:seed`.
UPDATE "users" SET "role" = 'SUPERADMIN' WHERE "email" = 'superadmin@sukabumilogistik.com';
