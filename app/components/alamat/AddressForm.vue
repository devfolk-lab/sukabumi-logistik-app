<script setup lang="ts">
import type { Destination } from '~/types'

export interface AddressFormPayload {
  label: string
  nama: string
  telp: string
  alamat: string
  destinationId: number | null
  destinationLabel: string | null
  zipCode: string | null
}

const props = defineProps<{ pending?: boolean }>()

const emit = defineEmits<{
  submit: [payload: AddressFormPayload]
  cancel: []
}>()

const labelOptions = ['Rumah', 'Kantor', 'Lainnya']

const form = reactive({
  label: 'Rumah',
  nama: '',
  telp: '',
  alamat: ''
})

const destination = ref<Destination | undefined>()

const touched = reactive({ nama: false, telp: false, alamat: false })

const canSubmit = computed(() =>
  !props.pending
  && form.nama.trim() !== ''
  && form.telp.trim() !== ''
  && form.alamat.trim() !== ''
)

const namaError = computed(() => touched.nama && form.nama.trim() === '' ? 'Wajib diisi' : undefined)
const telpError = computed(() => touched.telp && form.telp.trim() === '' ? 'Wajib diisi' : undefined)
const alamatError = computed(() => touched.alamat && form.alamat.trim() === '' ? 'Wajib diisi' : undefined)

function submit() {
  touched.nama = true
  touched.telp = true
  touched.alamat = true
  if (!canSubmit.value) return

  emit('submit', {
    label: form.label,
    nama: form.nama.trim(),
    telp: form.telp.trim(),
    alamat: form.alamat.trim(),
    destinationId: destination.value?.id ?? null,
    destinationLabel: destination.value?.label ?? null,
    zipCode: destination.value?.zipCode ?? null
  })
}
</script>

<template>
  <div class="space-y-3 rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
    <h3 class="mb-1 text-base font-bold text-gray-800">
      Alamat Baru
    </h3>

    <UFormField label="Label Alamat">
      <USelect
        v-model="form.label"
        :items="labelOptions"
        size="xl"
        class="w-full"
      />
    </UFormField>

    <UFormField
      label="Nama Penerima"
      :error="namaError"
    >
      <UInput
        v-model="form.nama"
        placeholder="Nama Penerima"
        size="xl"
        class="w-full"
        @blur="touched.nama = true"
      />
    </UFormField>

    <UFormField
      label="No. Telepon"
      :error="telpError"
    >
      <UInput
        v-model="form.telp"
        type="tel"
        placeholder="No. Telepon"
        size="xl"
        class="w-full"
        @blur="touched.telp = true"
      />
    </UFormField>

    <UFormField
      label="Kecamatan / Kelurahan"
      help="Dipakai untuk menghitung ongkir saat memesan dari alamat ini."
    >
      <AppDestinationSelect v-model="destination" />
    </UFormField>

    <UFormField
      label="Alamat Lengkap"
      :error="alamatError"
    >
      <UTextarea
        v-model="form.alamat"
        :rows="2"
        placeholder="Alamat lengkap (jalan, RT/RW, kelurahan, kota, kode pos)"
        size="xl"
        class="w-full"
        @blur="touched.alamat = true"
      />
    </UFormField>

    <div class="flex gap-2 pt-1">
      <button
        v-ripple.dark
        type="button"
        class="flex-1 rounded-2xl bg-gray-100 py-3 text-base font-bold text-gray-600"
        @click="emit('cancel')"
      >
        Batal
      </button>
      <button
        type="button"
        class="relative flex-1 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] py-3 text-base font-bold text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!canSubmit"
        @click="submit"
      >
        <span
          v-if="canSubmit"
          v-ripple
          class="absolute inset-0 rounded-2xl"
        />
        <span class="relative z-10 pointer-events-none">{{ pending ? 'Menyimpan...' : 'Simpan Alamat' }}</span>
      </button>
    </div>
  </div>
</template>
