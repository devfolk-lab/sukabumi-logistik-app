<script setup lang="ts">
import type { AddressFormPayload } from '~/components/alamat/AddressForm.vue'

const nav = useAppNav()
const toast = useToast()

const { data: addresses, status, refresh } = await useAddresses()

const showForm = ref(false)
const saving = ref(false)

async function addAddress(payload: AddressFormPayload) {
  saving.value = true

  try {
    await $fetch('/api/addresses', { method: 'POST', body: payload })
    await refresh()
    showForm.value = false
    toast.add({ title: 'Alamat tersimpan' })
  } catch (error) {
    toast.add({
      title: 'Gagal menyimpan alamat',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function removeAddress(id: string) {
  try {
    await $fetch(`/api/addresses/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (error) {
    toast.add({
      title: 'Gagal menghapus alamat',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
  }
}

async function setMain(id: string) {
  try {
    await $fetch(`/api/addresses/${id}`, { method: 'PATCH', body: { main: true } })
    await refresh()
  } catch (error) {
    toast.add({
      title: 'Gagal mengubah alamat utama',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
  }
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
      <div
        v-if="status === 'pending'"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <USkeleton
          v-for="n in 2"
          :key="n"
          class="h-36 rounded-3xl"
        />
      </div>
      <div
        v-else-if="addresses.length"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <AlamatAddressCard
          v-for="address in addresses"
          :key="address.id"
          :address="address"
          @remove="removeAddress"
          @set-main="setMain"
        />
      </div>
      <p
        v-else-if="!showForm"
        class="rounded-3xl bg-white p-6 text-center text-sm text-gray-500 shadow-card lg:shadow-card-flat"
      >
        Belum ada alamat tersimpan.
      </p>

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
        :pending="saving"
        @submit="addAddress"
        @cancel="showForm = false"
      />
    </AppPageContent>
  </div>
</template>
