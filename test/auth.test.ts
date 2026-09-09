import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '~/stores/auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts logged out', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('logs in with the dummy profile name', () => {
    const store = useAuthStore()
    store.login('fulan@email.com')
    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual({ nama: 'Fulan', email: 'fulan@email.com' })
  })

  it('registers with the supplied name', () => {
    const store = useAuthStore()
    store.register('Budi', 'budi@email.com')
    expect(store.user?.nama).toBe('Budi')
  })

  it('falls back to the default name when registering without one', () => {
    const store = useAuthStore()
    store.register('  ', 'budi@email.com')
    expect(store.user?.nama).toBe('Fulan')
  })

  it('clears the user on logout', () => {
    const store = useAuthStore()
    store.login('fulan@email.com')
    store.logout()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
