/**
 * An escape hatch for pages whose data is not one of the `useApi` keys.
 * `riwayat/[id]` fetches one order through its own `useAsyncData`, so a pull
 * that only invalidated the `orders` list would refresh the list behind the
 * screen and leave the screen itself stale.
 */
const handler = shallowRef<(() => Promise<void>) | null>(null)

export function registerPageRefresh(fn: () => Promise<void>): void {
  handler.value = fn
  onScopeDispose(() => {
    if (handler.value === fn) handler.value = null
  })
}

export function usePageRefresh() {
  return { handler }
}
