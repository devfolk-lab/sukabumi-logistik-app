import type { OrderStage } from '~/types'

/**
 * How many of the stepper's four steps (Dibuat, Dijemput, Dikirim, Diterima)
 * a stage has reached. The stepper predates the six persisted stages, so they
 * are mapped onto it; both detail pages read it from here.
 */
export function stepperCompleted(stage: OrderStage | undefined): number {
  switch (stage) {
    case 'MENUNGGU_PEMBAYARAN': return 1
    case 'DIPROSES': return 2
    case 'DIJEMPUT': return 3
    case 'DALAM_PERJALANAN': return 3
    default: return 4
  }
}
