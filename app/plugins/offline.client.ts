/**
 * Boots the offline layer: seed the payload from disk before the first page
 * mounts, so a cold start with no network paints real data.
 */
export default defineNuxtPlugin(async () => {
  await hydrateApiCache()
})
