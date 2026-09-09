export function useAppNav() {
  const router = useRouter()

  function back(fallback = '/'): void {
    if (window.history.length > 1) {
      router.back()
      return
    }
    navigateTo(fallback)
  }

  return { back }
}
