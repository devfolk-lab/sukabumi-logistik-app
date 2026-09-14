/** Thin wrapper over Supabase Auth so pages do not each re-derive the flows. */
export function useAuthActions() {
  const supabase = useSupabaseClient()

  /**
   * Cached API responses belong to one account, so they are dropped around
   * every sign-in and sign-out. A successful sign-in immediately warms the
   * cache with what the home screen needs so it renders without waiting.
   */
  async function login(email: string, password: string) {
    clearApiCache()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    prefetchApiData()
  }

  async function register(input: { nama: string, email: string, telp: string, password: string }) {
    clearApiCache()
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { nama: input.nama, telp: input.telp } }
    })
    if (error) throw new Error(error.message)
    // With email confirmation on there is no session yet, so nothing to warm.
    if (data.session) prefetchApiData()
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    clearApiCache()
  }

  /**
   * Supabase's `updateUser` never checks the old password, so it is verified
   * with a fresh sign-in first — which also refreshes the session it needs.
   */
  async function changePassword(email: string, current: string, next: string) {
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: current })
    if (authError) throw new Error('Password saat ini salah.')
    await updatePassword(next)
  }

  /** Sends the magic link that lands the user on /reset-password. */
  async function sendResetLink(email: string) {
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw new Error(error.message)
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(error.message)
  }

  return { login, register, logout, sendResetLink, updatePassword, changePassword }
}
