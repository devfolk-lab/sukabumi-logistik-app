import type { SessionUser } from '~/types'

/**
 * Every account flow, over our own `/api/auth/*` routes. The session is an
 * httpOnly cookie the server sets and clears; this side only tracks who is
 * signed in (`useAuthUser`) and keeps the cached API data per account.
 */
export function useAuthActions() {
  /**
   * Cached API responses belong to one account, so they are dropped around
   * every sign-in and sign-out. A successful sign-in immediately warms the
   * cache with what the home screen needs so it renders without waiting.
   */
  async function login(email: string, password: string) {
    clearApiCache()
    const { user } = await authRequest<{ user: SessionUser }>('/api/auth/login', { email, password }, 'Gagal masuk, coba lagi sebentar.')
    setAuthUser(user)
    prefetchApiData()
  }

  /** Creates the account unconfirmed; it can sign in once the emailed link is opened. */
  async function register(input: { nama: string, email: string, telp: string, password: string }) {
    await authRequest('/api/auth/register', input, 'Gagal mendaftar, coba lagi sebentar.')
  }

  async function resendConfirmation(email: string) {
    await authRequest('/api/auth/resend-confirmation', { email }, 'Gagal mengirim ulang email.')
  }

  /** Redeems the link from the confirmation email; signs the user in. */
  async function confirmEmail(token: string) {
    clearApiCache()
    const { user } = await authRequest<{ user: SessionUser }>('/api/auth/verify-email', { token }, 'Gagal mengonfirmasi email.')
    setAuthUser(user)
    prefetchApiData()
  }

  /**
   * Signs this device out. Needs the server, since only it can clear the
   * httpOnly cookie; local state is dropped only once that has worked.
   */
  async function logout() {
    await authRequest('/api/auth/logout', {}, 'Gagal keluar, periksa koneksi internet.')
    setAuthUser(null)
    clearApiCache()
  }

  /** Checks the current password on the server; other devices are signed out. */
  async function changePassword(current: string, next: string) {
    await authRequest('/api/auth/change-password', { current, password: next }, 'Gagal mengganti password.')
  }

  /** Emails the link that lands the user on /reset-password. */
  async function sendResetLink(email: string) {
    await authRequest('/api/auth/forgot-password', { email }, 'Gagal mengirim link, coba lagi sebentar.')
  }

  /** Whether a reset link still works, without spending it. */
  async function checkResetLink(token: string): Promise<boolean> {
    const { valid } = await authRequest<{ valid: boolean }>('/api/auth/check-reset-token', { token }, 'Gagal memeriksa link.')
    return valid
  }

  /** Sets the new password; every device, this one included, is signed out. */
  async function resetPassword(token: string, password: string) {
    await authRequest('/api/auth/reset-password', { token, password }, 'Gagal menyimpan password.')
    setAuthUser(null)
    clearApiCache()
  }

  return { login, register, resendConfirmation, confirmEmail, logout, changePassword, sendResetLink, checkResetLink, resetPassword }
}

/** POSTs to one of our auth routes, surfacing its Indonesian `statusMessage`. */
async function authRequest<T = unknown>(url: string, body: Record<string, unknown>, fallback: string): Promise<T> {
  try {
    // Nitro's typed `$fetch` resolves the response type from the URL; this
    // helper takes any of our routes, so the caller's `T` is asserted instead.
    return await ($fetch(url, { method: 'POST', body }) as Promise<T>)
  } catch (error) {
    throw new Error(apiMessage(error, fallback), { cause: error })
  }
}
