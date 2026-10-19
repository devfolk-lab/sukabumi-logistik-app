// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Prisma's generated client: rewritten by `prisma generate`, never by hand.
  { ignores: ['server/generated/**'] }
)
