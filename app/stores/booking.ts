import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Party, RoutePoint } from '~/types'
import { useCouriersStore } from '~/stores/couriers'

export const INSURANCE_FEE = 2000

function emptyParty(): Party {
  return { nama: '', telp: '', alamat: '' }
}

export const useBookingStore = defineStore('booking', () => {
  const pickup = ref<RoutePoint>({ city: '', area: '' })
  const delivery = ref<RoutePoint>({ city: '', area: '' })
  const sender = ref<Party>(emptyParty())
  const receiver = ref<Party>(emptyParty())
  const weight = ref(1)
  const content = ref('')
  const instant = ref(false)
  const insurance = ref(false)
  const selectedCourierId = ref<string | null>(null)

  const selectedCourier = computed(() => {
    if (!selectedCourierId.value) return undefined
    return useCouriersStore().byId(selectedCourierId.value)
  })

  const hasCourier = computed(() => Boolean(selectedCourier.value))
  const ongkir = computed(() => selectedCourier.value?.price ?? 0)
  const asuransi = computed(() => (insurance.value ? INSURANCE_FEE : 0))
  const total = computed(() => ongkir.value + (hasCourier.value ? asuransi.value : 0))

  function selectCourier(id: string): void {
    selectedCourierId.value = useCouriersStore().byId(id) ? id : null
  }

  function swapRoute(): void {
    const previous = pickup.value
    pickup.value = delivery.value
    delivery.value = previous
  }

  function reset(): void {
    pickup.value = { city: '', area: '' }
    delivery.value = { city: '', area: '' }
    sender.value = emptyParty()
    receiver.value = emptyParty()
    weight.value = 1
    content.value = ''
    instant.value = false
    insurance.value = false
    selectedCourierId.value = null
  }

  return {
    pickup,
    delivery,
    sender,
    receiver,
    weight,
    content,
    instant,
    insurance,
    selectedCourierId,
    selectedCourier,
    hasCourier,
    ongkir,
    asuransi,
    total,
    selectCourier,
    swapRoute,
    reset
  }
})
