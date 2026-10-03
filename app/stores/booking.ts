import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Address, Area, Courier, Order, PackageItem, Party, RoutePoint } from '~/types'

function emptyParty(): Party {
  return { nama: '', telp: '', alamat: '' }
}

function toPoint(area: Area | undefined): RoutePoint {
  if (!area) return { city: '', area: '' }
  return { city: area.administrative_division_level_2_name, area: area.administrative_division_level_3_name }
}

export type BookingSide = 'sender' | 'receiver'

/**
 * The kirim wizard spans three routes, so its draft is the one piece of state
 * that genuinely belongs in a store. Everything else is server state fetched
 * with `useAsyncData`.
 */
export const useBookingStore = defineStore('booking', () => {
  const origin = ref<Area | undefined>()
  const destination = ref<Area | undefined>()
  const sender = ref<Party>(emptyParty())
  const receiver = ref<Party>(emptyParty())
  // Which saved address each side was filled from, so the chips can show it;
  // null means the user picked or typed a location of their own.
  const senderAddressId = ref<string | null>(null)
  const receiverAddressId = ref<string | null>(null)
  const items = ref<PackageItem[]>([emptyItem()])
  const selectedCourier = ref<Courier | null>(null)

  const pickup = computed(() => toPoint(origin.value))
  const delivery = computed(() => toPoint(destination.value))
  const weightGram = computed(() => itemsWeight(items.value))
  const quantity = computed(() => itemsQuantity(items.value))

  const hasRoute = computed(() => Boolean(origin.value && destination.value))
  const hasCourier = computed(() => Boolean(selectedCourier.value))
  const hasParties = computed(() =>
    Boolean(sender.value.nama.trim() && sender.value.telp.trim() && sender.value.alamat.trim()
      && receiver.value.nama.trim() && receiver.value.telp.trim() && receiver.value.alamat.trim())
  )
  /** The first thing still missing from the items, or `''`. */
  const itemsProblem = computed(() =>
    items.value.length ? items.value.map(itemProblem).find(Boolean) ?? '' : 'Tambahkan minimal satu barang.'
  )

  const ongkir = computed(() => selectedCourier.value?.cost ?? 0)
  const total = computed(() => ongkir.value)

  function selectCourier(courier: Courier | null): void {
    selectedCourier.value = courier
  }

  function setSide(side: BookingSide, party: Party, area: Area | undefined, addressId: string | null): void {
    if (side === 'sender') {
      sender.value = party
      senderAddressId.value = addressId
      origin.value = area
    } else {
      receiver.value = party
      receiverAddressId.value = addressId
      destination.value = area
    }
    // Rates are route-specific; any change of place invalidates the pick.
    selectedCourier.value = null
  }

  /** Fills one side of the booking from a saved address (location + contact). */
  function useAddress(side: BookingSide, address: Address): void {
    if (!address.area) return
    setSide(side, { nama: address.nama, telp: address.telp, alamat: address.alamat }, address.area, address.id)
  }

  /**
   * A kecamatan picked by hand. It no longer matches the saved address the
   * side came from, so the street address is cleared; name and phone stay.
   */
  function setLocation(side: BookingSide, area: Area | undefined): void {
    const current = side === 'sender' ? origin.value : destination.value
    if (current?.id === area?.id) return

    const party = side === 'sender' ? sender.value : receiver.value
    const fromSaved = (side === 'sender' ? senderAddressId.value : receiverAddressId.value) !== null
    setSide(side, fromSaved ? { ...party, alamat: '' } : party, area, null)
  }

  /** Starts a new booking over the same route and people as a past order. */
  function repeatOrder(order: Order): void {
    reset()
    setSide('sender', { ...order.sender }, order.origin, null)
    setSide('receiver', { ...order.receiver }, order.destination, null)
  }

  // A quote is for these exact items; editing any of them needs a new one.
  watch(items, () => {
    selectedCourier.value = null
  }, { deep: true })

  function addItem(): void {
    items.value.push(emptyItem())
  }

  function removeItem(index: number): void {
    if (items.value.length <= 1) return
    items.value.splice(index, 1)
  }

  function swapRoute(): void {
    const previousOrigin = origin.value
    origin.value = destination.value
    destination.value = previousOrigin

    const previousSender = sender.value
    sender.value = receiver.value
    receiver.value = previousSender

    const previousSenderAddressId = senderAddressId.value
    senderAddressId.value = receiverAddressId.value
    receiverAddressId.value = previousSenderAddressId

    selectedCourier.value = null
  }

  function reset(): void {
    origin.value = undefined
    destination.value = undefined
    sender.value = emptyParty()
    receiver.value = emptyParty()
    senderAddressId.value = null
    receiverAddressId.value = null
    items.value = [emptyItem()]
    selectedCourier.value = null
  }

  return {
    origin,
    destination,
    sender,
    receiver,
    senderAddressId,
    receiverAddressId,
    items,
    weightGram,
    quantity,
    selectedCourier,
    pickup,
    delivery,
    hasRoute,
    hasCourier,
    hasParties,
    itemsProblem,
    ongkir,
    total,
    selectCourier,
    useAddress,
    setLocation,
    repeatOrder,
    addItem,
    removeItem,
    swapRoute,
    reset
  }
})
