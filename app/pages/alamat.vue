<script setup lang="ts">
import type { Address } from '~/types'
import type { AddressFormPayload } from '~/components/alamat/AddressForm.vue'

definePageMeta({ refreshKeys: ['addresses'] })

const nav = useAppNav()
const toast = useToast()

const { data: addresses, status, refresh } = useAddresses()

const online = useOnline()
const { enqueue } = useOutbox()

/** A row that exists only on this device until its POST replays. */
function isPending(address: Address): boolean {
  return address.id.startsWith('tmp-')
}

const showForm = ref(false)
const saving = ref(false)

// The row being edited; null means the dialog is adding a new one.
const editing = ref<Address | null>(null)

function openAdd() {
  editing.value = null
  showForm.value = true
}

function openEdit(id: string) {
  editing.value = addresses.value.find(a => a.id === id) ?? null
  showForm.value = editing.value !== null
}

async function saveAddress(payload: AddressFormPayload) {
  saving.value = true
  const target = editing.value

  try {
    if (online.value) {
      if (target) {
        await $fetch(`/api/addresses/${target.id}`, { method: 'PATCH', body: payload })
      } else {
        await $fetch('/api/addresses', { method: 'POST', body: payload })
      }
      await refresh()
    } else if (target) {
      // Show the edit straight away; the PATCH replays once there is a network.
      writeApiCache('addresses', addresses.value.map(a => (a.id === target.id ? { ...a, ...payload } : a)))
      await enqueue({
        method: 'PATCH',
        url: `/api/addresses/${target.id}`,
        body: { ...payload },
        invalidates: ['addresses'],
        label: 'alamat'
      })
    } else {
      // `tmpId` travels in the body so the drain can map it to the real id the
      // server assigns, and repoint any edit queued behind it.
      const tmpId = `tmp-${crypto.randomUUID()}`
      const draft: Address = {
        id: tmpId,
        label: payload.label,
        main: addresses.value.length === 0,
        nama: payload.nama,
        telp: payload.telp,
        alamat: payload.alamat,
        area: payload.area
      }
      writeApiCache('addresses', [...addresses.value, draft])
      await enqueue({
        method: 'POST',
        url: '/api/addresses',
        body: { ...payload, tmpId },
        invalidates: ['addresses'],
        label: 'alamat'
      })
    }

    showForm.value = false
    toast.add({
      title: online.value
        ? (target ? 'Alamat diperbarui' : 'Alamat tersimpan')
        : 'Tersimpan offline',
      description: online.value ? undefined : 'Akan disinkronkan setelah kembali online.'
    })
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
    if (online.value) {
      await $fetch(`/api/addresses/${id}`, { method: 'DELETE' })
      await refresh()
      return
    }

    writeApiCache('addresses', addresses.value.filter(a => a.id !== id))
    await enqueue({
      method: 'DELETE',
      url: `/api/addresses/${id}`,
      invalidates: ['addresses'],
      label: 'alamat'
    })
    toast.add({ title: 'Dihapus offline', description: 'Akan disinkronkan setelah kembali online.' })
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
    if (online.value) {
      await $fetch(`/api/addresses/${id}`, { method: 'PATCH', body: { main: true } })
      await refresh()
      return
    }

    writeApiCache('addresses', addresses.value.map(a => ({ ...a, main: a.id === id })))
    await enqueue({
      method: 'PATCH',
      url: `/api/addresses/${id}`,
      body: { main: true },
      invalidates: ['addresses'],
      label: 'alamat utama'
    })
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
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
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
        v-if="(status === 'pending' || status === 'idle') && !addresses.length"
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
          :pending="isPending(address)"
          @edit="openEdit"
          @remove="removeAddress"
          @set-main="setMain"
        />
      </div>
      <div
        v-else
        class="rounded-3xl bg-white p-6 text-center shadow-card lg:shadow-card-flat"
      >
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-50">
          <UIcon
            name="i-lucide-map-pinned"
            class="size-6 text-primary"
          />
        </div>
        <p class="mt-3 text-base font-bold text-gray-800">
          Belum ada alamat tersimpan
        </p>
        <p class="mt-1 text-sm text-gray-500">
          Simpan alamat rumah atau toko supaya kirim paket cukup sekali tap.
        </p>
      </div>

      <button
        type="button"
        class="relative flex w-full items-center gap-4 rounded-3xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-4 text-left text-white shadow-lg shadow-primary/20"
        @click="openAdd"
      >
        <span
          v-ripple
          class="absolute inset-0 rounded-3xl"
        />
        <span class="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 pointer-events-none">
          <UIcon
            name="i-lucide-plus"
            class="size-6"
          />
        </span>
        <span class="relative z-10 min-w-0 flex-1 pointer-events-none">
          <span class="block text-base font-bold">Tambah alamat baru</span>
          <span class="block text-sm text-white/70">Rumah, kantor, atau alamat langganan</span>
        </span>
        <UIcon
          name="i-lucide-chevron-right"
          class="relative z-10 size-5 shrink-0 text-white/70 pointer-events-none"
        />
      </button>
    </AppPageContent>

    <AppDialog
      v-model:open="showForm"
      :title="editing ? 'Ubah alamat' : 'Alamat baru'"
      description="Lengkapi kecamatan supaya ongkir bisa dihitung dari alamat ini."
      :ui="{ content: 'sm:max-w-lg', body: 'p-0 sm:p-0 max-lg:-mx-4 max-lg:-mb-4' }"
    >
      <template #body>
        <AlamatAddressForm
          :key="editing?.id ?? 'new'"
          :address="editing"
          :pending="saving"
          @submit="saveAddress"
          @cancel="showForm = false"
        />
      </template>
    </AppDialog>
  </div>
</template>
