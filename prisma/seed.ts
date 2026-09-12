import 'dotenv/config'
import { seedClient } from './seed/client.js'
import { upsertAuthUser, verifyPasswordLogin } from './seed/auth.js'
import { addressData, orderData, seedAccounts } from './seed/fixtures.js'

/**
 * Seeds a working login plus enough demo data to exercise every screen.
 *
 * Run with `pnpm db:seed`. Identity goes straight into Supabase's `auth` schema
 * (see `prisma/seed/auth.ts` for why), and everything under `public` is rebuilt
 * from `prisma/seed/fixtures.ts`.
 *
 * Re-running is safe and idempotent: each seeded account's addresses and orders
 * are dropped and recreated, so timestamps stay fresh. It only ever touches the
 * accounts listed in the fixtures — no other user's rows are read or written.
 */

function guardProduction(): void {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== '1') {
    throw new Error('Refusing to seed with NODE_ENV=production (set SEED_ALLOW_PRODUCTION=1 to override)')
  }
}

async function main(): Promise<void> {
  guardProduction()

  const prisma = seedClient()
  const accounts = seedAccounts()

  try {
    for (const account of accounts) {
      // `auth.users` first: `Profile.id` mirrors whatever id ends up owning the
      // email, which is not necessarily the one the fixture asked for.
      const id = await upsertAuthUser(prisma, account)

      await prisma.profile.upsert({
        where: { id },
        update: { nama: account.nama, email: account.email, telp: account.telp },
        create: { id, nama: account.nama, email: account.email, telp: account.telp }
      })

      // Orders cascade to tracking_events, so this clears the whole subtree.
      const { count: droppedOrders } = await prisma.order.deleteMany({ where: { profileId: id } })
      const { count: droppedAddresses } = await prisma.address.deleteMany({ where: { profileId: id } })

      for (const address of account.addresses) {
        await prisma.address.create({ data: { profileId: id, ...addressData(address) } })
      }

      for (const order of account.orders) {
        await prisma.order.create({ data: { profileId: id, ...orderData(account, order) } })
      }

      await verifyPasswordLogin(account.email, account.password)

      console.log(
        `✓ ${account.email} — ${account.addresses.length} alamat, ${account.orders.length} pesanan`
        + ` (replaced ${droppedAddresses} alamat, ${droppedOrders} pesanan)`
      )
    }

    console.log('\nLogin at http://localhost:3000/login with:')
    for (const account of accounts) {
      console.log(`  ${account.email}  /  ${account.password}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('\nSeeding failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
