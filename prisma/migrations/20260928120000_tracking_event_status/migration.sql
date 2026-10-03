-- Tracking events keep Biteship's raw status code and note next to the
-- Indonesian title, so the timeline can pick an icon per status and show the
-- carrier's own wording.
ALTER TABLE "tracking_events" ADD COLUMN "status" TEXT,
ADD COLUMN "note" TEXT;

-- Events cached before this migration only have the title, which is a fixed
-- translation of the status (`STATUS_TITLE` in server/utils/mappers.ts), so
-- the code can be recovered from it. Titles that fell back to a note stay NULL.
UPDATE "tracking_events" SET "status" = CASE "title"
  WHEN 'Pesanan dikonfirmasi, kurir dijadwalkan menjemput' THEN 'confirmed'
  WHEN 'Penjemputan dijadwalkan' THEN 'scheduled'
  WHEN 'Kurir ditugaskan' THEN 'allocated'
  WHEN 'Kurir menuju lokasi penjemputan' THEN 'picking_up'
  WHEN 'Paket dijemput kurir' THEN 'picked'
  WHEN 'Paket sedang diantar ke penerima' THEN 'dropping_off'
  WHEN 'Paket dalam perjalanan' THEN 'in_transit'
  WHEN 'Pengiriman ditahan sementara' THEN 'on_hold'
  WHEN 'Paket diterima' THEN 'delivered'
  WHEN 'Paket dalam perjalanan kembali ke pengirim' THEN 'return_in_transit'
  WHEN 'Paket dikembalikan ke pengirim' THEN 'returned'
  WHEN 'Paket ditolak' THEN 'rejected'
  WHEN 'Kurir tidak ditemukan' THEN 'courier_not_found'
  WHEN 'Pengiriman dibatalkan' THEN 'cancelled'
  WHEN 'Paket dimusnahkan' THEN 'disposed'
END
WHERE "status" IS NULL;
