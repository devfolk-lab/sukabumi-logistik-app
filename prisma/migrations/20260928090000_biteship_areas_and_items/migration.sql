-- Places are stored as the Biteship area object itself (`/v1/maps/areas`,
-- key for key) instead of an id plus a local-index label, and an order carries
-- one row per package item with the fields Biteship's `items` take.
--
-- Existing rows are converted, not dropped: a label reads
-- "Kelurahan, Kecamatan, Kota, Provinsi, kodepos", which is enough to rebuild
-- every field of an area. Each existing order becomes a single item named
-- after its old `content`.

-- A throwaway helper for the conversion, dropped at the end.
CREATE FUNCTION "_label_to_area"(area_id TEXT, label TEXT, zip TEXT) RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'id', area_id,
    'name', concat_ws(', ',
      NULLIF(trim(split_part(label, ',', 2)), ''),
      NULLIF(trim(split_part(label, ',', 3)), ''),
      NULLIF(trim(split_part(label, ',', 4)), '')
    ) || '. ' || COALESCE(NULLIF(zip, ''), trim(split_part(label, ',', 5))),
    'country_name', 'Indonesia',
    'country_code', 'ID',
    'administrative_division_level_1_name', trim(split_part(label, ',', 4)),
    'administrative_division_level_1_type', 'province',
    'administrative_division_level_2_name', trim(split_part(label, ',', 3)),
    'administrative_division_level_2_type', 'city',
    'administrative_division_level_3_name', trim(split_part(label, ',', 2)),
    'administrative_division_level_3_type', 'district',
    'postal_code', COALESCE(
      NULLIF(regexp_replace(COALESCE(NULLIF(zip, ''), split_part(label, ',', 5)), '\D', '', 'g'), '')::INTEGER,
      0
    )
  )
$$ LANGUAGE SQL IMMUTABLE;

-- Addresses
ALTER TABLE "addresses" ADD COLUMN "area" JSONB;

UPDATE "addresses"
SET "area" = "_label_to_area"("destinationId", "destinationLabel", "zipCode")
WHERE "destinationId" IS NOT NULL AND "destinationLabel" IS NOT NULL;

ALTER TABLE "addresses" DROP COLUMN "destinationId",
DROP COLUMN "destinationLabel",
DROP COLUMN "zipCode";

-- Orders: areas
ALTER TABLE "orders" ADD COLUMN "originAreaNew" JSONB,
ADD COLUMN "destinationAreaNew" JSONB;

UPDATE "orders"
SET "originAreaNew" = "_label_to_area"("originId", "originLabel", NULL),
    "destinationAreaNew" = "_label_to_area"("destinationId", "destinationLabel", NULL);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sku" TEXT,
    "value" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "length" INTEGER,
    "width" INTEGER,
    "height" INTEGER,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Orders: one item per existing order, from its free-text content. The value
-- is the nominal Rp 100.000 these orders were always declared to Biteship at.
INSERT INTO "order_items" ("id", "orderId", "position", "name", "value", "quantity", "weight")
SELECT gen_random_uuid(), "id", 0, COALESCE(NULLIF(trim("content"), ''), 'Paket'), 100000, 1, "weightGram"
FROM "orders";

ALTER TABLE "orders" DROP COLUMN "originId",
DROP COLUMN "originLabel",
DROP COLUMN "originCity",
DROP COLUMN "originArea",
DROP COLUMN "destinationId",
DROP COLUMN "destinationLabel",
DROP COLUMN "destinationCity",
DROP COLUMN "destinationArea",
DROP COLUMN "content";

ALTER TABLE "orders" RENAME COLUMN "originAreaNew" TO "originArea";
ALTER TABLE "orders" RENAME COLUMN "destinationAreaNew" TO "destinationArea";
ALTER TABLE "orders" ALTER COLUMN "originArea" SET NOT NULL,
ALTER COLUMN "destinationArea" SET NOT NULL;

DROP FUNCTION "_label_to_area"(TEXT, TEXT, TEXT);
