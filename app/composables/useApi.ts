import type { Address, Order, OrderStats, Shipment, User } from '~/types'

// Fixed keys so every component that calls one of these shares a single
// request and a single cache entry.
//
// The app renders client-side only, so callers must not `await` these in
// setup — read `status` and show a skeleton while it is 'idle' or 'pending'.
//
// `useRequestFetch()` rather than plain `$fetch` is kept so the composables
// stay correct if a route is ever server-rendered again: inside Nitro a bare
// `$fetch` sends no cookies and every authenticated route answers 401.

export function useProfile() {
  const request = useRequestFetch()
  return useAsyncData('profile', () => request<User>('/api/profile'))
}

export function useAddresses() {
  const request = useRequestFetch()
  return useAsyncData('addresses', () => request<Address[]>('/api/addresses'), { default: () => [] })
}

export function useOrders() {
  const request = useRequestFetch()
  return useAsyncData('orders', () => request<Order[]>('/api/orders'), { default: () => [] })
}

export function useActiveShipments() {
  const request = useRequestFetch()
  return useAsyncData('shipments', () => request<Shipment[]>('/api/shipments'), { default: () => [] })
}

export function useOrderStats() {
  const request = useRequestFetch()
  return useAsyncData('stats', () => request<OrderStats>('/api/stats'))
}

/** Turns an H3 error from `$fetch` into the message the API meant to show. */
export function apiMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { message?: string, statusMessage?: string } })?.data
  return data?.statusMessage || data?.message || fallback
}
