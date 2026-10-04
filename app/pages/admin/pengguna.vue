<script setup lang="ts">
import type { Role, StaffUser } from '~/types'

/**
 * Who is staff, for the superadmins. With no search the list is the admins
 * and superadmins; a search finds any account, so a customer can be promoted.
 * Nobody can change their own role, so the last superadmin stays one.
 */
const nav = useAppNav()
const toast = useToast()
const request = useRequestFetch()
const authUser = useAuthUser()

const search = ref('')
const query = refDebounced(search, 400)

const { data: users, status, error, refresh } = useAsyncData(
  () => `admin-users-${query.value.trim()}`,
  () => request<StaffUser[]>('/api/admin/users', { query: { q: query.value.trim() } })
    .catch((err: unknown) => {
      handleUnauthorized(err)
      throw err
    }),
  { default: () => [] }
)

registerPageRefresh(async () => {
  await refresh()
})

const loading = computed(() => (status.value === 'pending' || status.value === 'idle') && !users.value.length)

const roleItems = (['USER', 'ADMIN', 'SUPERADMIN'] as const).map(value => ({ label: ROLE_LABEL[value], value }))

const roleColor: Record<Role, 'neutral' | 'primary' | 'warning'> = {
  USER: 'neutral',
  ADMIN: 'primary',
  SUPERADMIN: 'warning'
}

const saving = ref<string | null>(null)

async function changeRole(user: StaffUser, role: Role) {
  if (role === user.role || saving.value) return
  saving.value = user.id
  try {
    const updated = await $fetch<StaffUser>(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { role } })
    users.value = users.value.map(u => (u.id === updated.id ? updated : u))
    toast.add({ title: 'Peran diubah', description: `${updated.nama} sekarang ${ROLE_LABEL[updated.role]}.` })
  } catch (err) {
    handleUnauthorized(err)
    toast.add({ title: 'Gagal mengubah peran', description: apiMessage(err, 'Coba lagi sebentar.'), color: 'error' })
  } finally {
    saving.value = null
  }
}

const showCreate = ref(false)

function created(user: StaffUser) {
  users.value = [user, ...users.value.filter(u => u.id !== user.id)]
  void refresh()
}
</script>

<template>
  <div>
    <AppPageHero>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 lg:hidden"
          aria-label="Kembali"
          @click="nav.back('/profil')"
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
        <div class="min-w-0 flex-1">
          <h1 class="text-xl font-bold text-white">
            Kelola Admin
          </h1>
          <p class="text-sm text-white/60">
            Atur siapa yang bisa menyetujui pesanan
          </p>
        </div>
        <UButton
          v-ripple
          icon="i-lucide-user-plus"
          size="lg"
          class="shrink-0 bg-white/10 font-bold text-white hover:bg-white/20"
          @click="showCreate = true"
        >
          <span class="hidden sm:inline">Tambah</span>
        </UButton>
      </div>
    </AppPageHero>

    <AppPageContent class="pt-4 pb-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        size="xl"
        placeholder="Cari akun lewat nama atau email untuk dijadikan admin"
        class="w-full"
        :ui="{ base: 'rounded-2xl bg-white shadow-card-flat ring-0' }"
      />
      <p class="mt-2 px-1 text-xs text-gray-500">
        {{ query.trim() ? 'Hasil pencarian dari semua akun.' : 'Menampilkan admin dan superadmin.' }}
      </p>
    </AppPageContent>

    <AppPageContent class="mt-2 mb-6">
      <div
        v-if="loading"
        class="space-y-3"
      >
        <USkeleton
          v-for="n in 3"
          :key="n"
          class="h-20 rounded-3xl"
        />
      </div>
      <AppNotFound
        v-else-if="error && !users.length"
        title="Gagal memuat akun"
        :description="apiMessage(error, 'Periksa koneksi lalu coba lagi.')"
        back-label="Kembali ke Profil"
        back-to="/profil"
        :retry="refresh"
      />
      <ul
        v-else-if="users.length"
        class="space-y-3"
      >
        <li
          v-for="user in users"
          :key="user.id"
          class="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat"
        >
          <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-50">
            <UIcon
              :name="user.role === 'USER' ? 'i-lucide-user' : 'i-lucide-shield-user'"
              class="size-5 text-primary"
            />
          </span>
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2 truncate text-base font-bold text-gray-800">
              <span class="truncate">{{ user.nama }}</span>
              <UBadge
                v-if="user.id === authUser?.id"
                color="neutral"
                variant="subtle"
                size="sm"
                class="shrink-0 rounded-full"
              >
                Kamu
              </UBadge>
            </p>
            <p class="truncate text-sm text-gray-500">
              {{ user.email }}
            </p>
            <p
              v-if="!user.verified"
              class="text-xs font-semibold text-amber-600"
            >
              Email belum dikonfirmasi
            </p>
          </div>
          <UBadge
            v-if="user.id === authUser?.id"
            :color="roleColor[user.role]"
            variant="subtle"
            class="shrink-0 rounded-full"
          >
            {{ ROLE_LABEL[user.role] }}
          </UBadge>
          <USelect
            v-else
            :model-value="user.role"
            :items="roleItems"
            :loading="saving === user.id"
            :disabled="saving !== null"
            :color="roleColor[user.role]"
            class="w-36 shrink-0"
            aria-label="Peran"
            @update:model-value="changeRole(user, $event as Role)"
          />
        </li>
      </ul>
      <div
        v-else
        class="rounded-3xl bg-white p-6 text-center shadow-card lg:shadow-card-flat"
      >
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gray-50">
          <UIcon
            name="i-lucide-users"
            class="size-6 text-gray-400"
          />
        </div>
        <p class="mt-3 text-base font-bold text-gray-800">
          Tidak ada akun
        </p>
        <p class="mt-1 text-sm text-gray-500">
          Coba nama atau email lain.
        </p>
      </div>
    </AppPageContent>

    <AdminStaffForm
      v-model:open="showCreate"
      @created="created"
    />
  </div>
</template>
