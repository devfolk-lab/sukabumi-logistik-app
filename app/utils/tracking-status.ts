export type TrackingTone = 'progress' | 'success' | 'warning' | 'danger'

export interface TrackingStatusMeta {
  icon: string
  tone: TrackingTone
}

/**
 * Icon and colour for each Biteship shipment status, plus `created` for the
 * first step of a timeline derived from our own order stage.
 */
const STATUS_META: Record<string, TrackingStatusMeta> = {
  created: { icon: 'i-lucide-receipt-text', tone: 'progress' },
  confirmed: { icon: 'i-lucide-clipboard-check', tone: 'progress' },
  scheduled: { icon: 'i-lucide-calendar-clock', tone: 'progress' },
  allocated: { icon: 'i-lucide-user-round-check', tone: 'progress' },
  picking_up: { icon: 'i-lucide-navigation', tone: 'progress' },
  picked: { icon: 'i-lucide-package-check', tone: 'progress' },
  in_transit: { icon: 'i-lucide-truck', tone: 'progress' },
  dropping_off: { icon: 'i-lucide-map-pin-house', tone: 'progress' },
  delivered: { icon: 'i-lucide-house', tone: 'success' },
  on_hold: { icon: 'i-lucide-circle-pause', tone: 'warning' },
  return_in_transit: { icon: 'i-lucide-undo-2', tone: 'warning' },
  returned: { icon: 'i-lucide-package-x', tone: 'danger' },
  rejected: { icon: 'i-lucide-ban', tone: 'danger' },
  courier_not_found: { icon: 'i-lucide-user-round-x', tone: 'danger' },
  cancelled: { icon: 'i-lucide-circle-x', tone: 'danger' },
  disposed: { icon: 'i-lucide-trash-2', tone: 'danger' }
}

const FALLBACK: TrackingStatusMeta = { icon: 'i-lucide-circle-dot', tone: 'progress' }

export function trackingStatusMeta(status: string | null | undefined): TrackingStatusMeta {
  return (status && STATUS_META[status.toLowerCase()]) || FALLBACK
}
