import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Courier, Destination, Party, RoutePoint } from '~/types'

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
  const weight = ref(1)
  const content = ref('')
  const instant = ref(false)
  const insurance = ref(false)
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

  const ongkir = computed(() => selectedCourier.value?.price ?? 0)
  const asuransi = computed(() => (insurance.value ? INSURANCE_FEE : 0))
  const total = computed(() => ongkir.value + (hasCourier.value ? asuransi.value : 0))

  function selectCourier(courier: Courier | null): void {
    selectedCourier.value = courier
  }

  function swapRoute(): void {
    const previous = origin.value
    origin.value = destination.value
    destination.value = previous
    // Rates are route-specific; a swap invalidates the current pick.
    selectedCourier.value = null
  }

  function reset(): void {
    origin.value = undefined
    destination.value = undefined
    sender.value = emptyParty()
    receiver.value = emptyParty()
    weight.value = 1
    content.value = ''
    instant.value = false
    insurance.value = false
    selectedCourier.value = null
  }

  return {
    origin,
    destination,
    sender,
    receiver,
    weight,
    weightGram,
    content,
    instant,
    insurance,
    selectedCourier,
    pickup,
    delivery,
    hasRoute,
    hasCourier,
    hasParties,
    ongkir,
    asuransi,
    total,
    selectCourier,
    swapRoute,
    reset
  }
})
