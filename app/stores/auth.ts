import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '~/types'

const DEFAULT_NAME = 'Fulan'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => user.value !== null)

  function login(email: string): void {
    user.value = { nama: DEFAULT_NAME, email }
  }

  function register(nama: string, email: string): void {
    user.value = { nama: nama.trim() || DEFAULT_NAME, email }
  }

  function logout(): void {
    user.value = null
  }

  return { user, isAuthenticated, login, register, logout }
})
