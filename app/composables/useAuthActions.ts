/** Thin wrapper over Supabase Auth so pages do not each re-derive the flows. */
export function useAuthActions() {
  const supabase = useSupabaseClient()

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  async function register(input: { nama: string, email: string, telp: string, password: string }) {
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { nama: input.nama, telp: input.telp } }
    })
    if (error) throw new Error(error.message)
  }

  async function logout() {
    await supabase.auth.signOut()
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

  return { login, register, logout, sendResetLink, updatePassword }
}
