<script setup lang="ts">
import { useAddressesStore } from '~/stores/addresses'
import type { Address } from '~/types'

const nav = useAppNav()
const addresses = useAddressesStore()
const showForm = ref(false)

function addAddress(payload: Omit<Address, 'id' | 'main'>) {
  addresses.add(payload)
  showForm.value = false
}
</script>

<template>
  <div>
    <AppPageHero>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
          @click="nav.back('/')"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-xl"
          />
          <UIcon
            name="i-lucide-arrow-left"
            class="relative z-10 size-5 text-white pointer-events-none"
          />
        </button>
        <div>
          <h1 class="text-xl font-bold text-white">
            Alamat Tersimpan
          </h1>
          <p class="text-sm text-white/60">
            Sukabumi Logistik
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent class="mt-5 space-y-4 pb-10">
      <div class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5">
        <AlamatAddressCard
          v-for="address in addresses.list"
          :key="address.id"
          :address="address"
          @remove="addresses.remove"
        />
      </div>

      <button
        v-if="!showForm"
        v-ripple.dark
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white py-3.5 text-base font-bold text-primary"
        @click="showForm = true"
      >
        <UIcon
          name="i-lucide-plus"
          class="pointer-events-none size-4"
        />
        <span class="pointer-events-none">Tambah Alamat Baru</span>
      </button>

      <AlamatAddressForm
        v-if="showForm"
        @submit="addAddress"
        @cancel="showForm = false"
      />
    </AppPageContent>
  </div>
</template>
