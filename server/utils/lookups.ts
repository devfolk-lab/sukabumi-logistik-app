import type { Shipment, TrackedWaybill } from '#shared/types'
import type { TrackingLookup } from '../generated/prisma/client'
import { prisma } from './prisma'

/**
 * Remembers a waybill tracked on Lacak, so the page can list it again. Only
 * waybills not created in this app reach here. Best effort: the lookup itself
 * has already worked, and a failed write must not turn it into an error.
 */
export async function recordLookup(profileId: string, shipment: Shipment): Promise<void> {
  const data = {
    courierName: shipment.courier,
    status: shipment.status,
    stage: shipment.stage,
    originNama: shipment.origin.nama,
    originAlamat: shipment.origin.alamat,
    destinationNama: shipment.destination.nama,
    destinationAlamat: shipment.destination.alamat
  }

  await prisma.trackingLookup.upsert({
    where: { profileId_waybill_courierCode: { profileId, waybill: shipment.resi, courierCode: shipment.courierCode } },
    // `updatedAt` moves on every lookup, even when nothing else changed.
    update: { ...data, updatedAt: new Date() },
    create: { profileId, waybill: shipment.resi, courierCode: shipment.courierCode, ...data }
  }).catch((error: unknown) => {
    console.error('[lacak] could not record lookup', shipment.resi, error)
  })
}

export function toTrackedWaybill(l: TrackingLookup): TrackedWaybill {
  return {
    id: l.id,
    resi: l.waybill,
    courierCode: l.courierCode,
    courier: l.courierName,
    status: l.status,
    stage: l.stage,
    origin: { nama: l.originNama || '-', alamat: l.originAlamat || '-' },
    destination: { nama: l.destinationNama || '-', alamat: l.destinationAlamat || '-' },
    lookedUpAt: formatWaktu(l.updatedAt)
  }
}
