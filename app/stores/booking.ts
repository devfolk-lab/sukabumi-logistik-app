import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Address, Courier, Destination, Party, RoutePoint } from '~/types'

function emptyParty(): Party {
  return { nama: '', telp: '', alamat: '' }
}

function toPoint(destination: Destination | undefined): RoutePoint {
  if (!destination) return { city: '', area: '' }
  return { city: destination.city, area: destination.subdistrict }
}

/**
 * The kirim wizard spans three routes, so its draft is the one piece of state
 * that genuinely belongs in a store. Everything else is server state fetched
 * with `useAsyncData`.
 */
export const useBookingStore = defineStore('booking', () => {
  const origin = ref<Destination | undefined>()
  const destination = ref<Destination | undefined>()
  const sender = ref<Party>(emptyParty())
  const receiver = ref<Party>(emptyParty())
  // Which saved address each side was filled from, so the chips can show it;
  // null means the user is typing a custom one.
  const senderAddressId = ref<string | null>(null)
  const receiverAddressId = ref<string | null>(null)
  const weight = ref(1)
  const content = ref('')
  const selectedCourier = ref<Courier | null>(null)

  const pickup = computed(() => toPoint(origin.value))
  const delivery = computed(() => toPoint(destination.value))
  const weightGram = computed(() => Math.max(100, Math.round((weight.value || 0) * 1000)))

  const hasRoute = computed(() => Boolean(origin.value && destination.value))
  const hasCourier = computed(() => Boolean(selectedCourier.value))
  const hasParties = computed(() =>
    Boolean(sender.value.nama.trim() && sender.value.telp.trim() && sender.value.alamat.trim()
      && receiver.value.nama.trim() && receiver.value.telp.trim() && receiver.value.alamat.trim())
  )

  const ongkir = computed(() => selectedCourier.value?.cost ?? 0)
  const total = computed(() => ongkir.value)

  function selectCourier(courier: Courier | null): void {
    selectedCourier.value = courier
  }

  /** Fills one side of the booking from a saved address (location + contact). */
  function useAddress(side: 'sender' | 'receiver', address: Address): void {
    const party = { nama: address.nama, telp: address.telp, alamat: address.alamat }
    const location = address.destinationId
      ? destinationFromLabel(address.destinationId, address.destinationLabel ?? '', address.zipCode)
      : undefined

    if (side === 'sender') {
      sender.value = party
      senderAddressId.value = address.id
      if (location) origin.value = location
    } else {
      receiver.value = party
      receiverAddressId.value = address.id
      if (location) destination.value = location
    }
    selectedCourier.value = null
  }

  /** Switches one side back to a hand-typed address. */
  function useCustomAddress(side: 'sender' | 'receiver'): void {
    if (side === 'sender') {
      senderAddressId.value = null
      origin.value = undefined
      sender.value = emptyParty()
    } else {
      receiverAddressId.value = null
      destination.value = undefined
      receiver.value = emptyParty()
    }
    selectedCourier.value = null
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

    // Rates are route-specific; a swap invalidates the current pick.
    selectedCourier.value = null
  }

  function reset(): void {
    origin.value = undefined
    destination.value = undefined
    sender.value = emptyParty()
    receiver.value = emptyParty()
    senderAddressId.value = null
    receiverAddressId.value = null
    weight.value = 1
    content.value = ''
    selectedCourier.value = null
  }

  return {
    origin,
    destination,
    sender,
    receiver,
    senderAddressId,
    receiverAddressId,
    weight,
    weightGram,
    content,
    selectedCourier,
    pickup,
    delivery,
    hasRoute,
    hasCourier,
    hasParties,
    ongkir,
    total,
    selectCourier,
    useAddress,
    useCustomAddress,
    swapRoute,
    reset
  }
})
