/**
 * Demo data for the seeded accounts.
 *
 * Pure data plus the couple of helpers that shape it — `prisma/seed.ts` does all
 * the writing. Everything is expressed relative to the moment the seeder runs so
 * a freshly seeded database never looks stale.
 */

type Stage = 'MENUNGGU_PEMBAYARAN' | 'DIPROSES' | 'DIJEMPUT' | 'DALAM_PERJALANAN' | 'SELESAI' | 'BATAL'

/** Frozen at import so every timestamp in one run shares an origin. */
const NOW = Date.now()

/** `h` hours before the run started. */
function ago(h: number): Date {
  return new Date(NOW - h * 3600_000)
}

const HARI = 24

/** Declared value of each seeded item, in rupiah. */
const SEED_ITEM_VALUE = 100000

/** Biteship areas (kecamatan + postal code): id, kecamatan, kota, provinsi, kode pos. */
const PLACES = {
  sukabumi: ['IDNP9IDNC421IDND5218IDZ43111', 'Cikole', 'Sukabumi', 'Jawa Barat', 43111],
  cibadak: ['IDNP9IDNC421IDND5206IDZ43351', 'Cibadak', 'Sukabumi', 'Jawa Barat', 43351],
  jakarta: ['IDNP6IDNC146IDND825IDZ11480', 'Palmerah', 'Jakarta Barat', 'DKI Jakarta', 11480],
  bandung: ['IDNP9IDNC22IDND2069IDZ40162', 'Sukajadi', 'Bandung', 'Jawa Barat', 40162],
  surabaya: ['IDNP11IDNC434IDND5427IDZ60281', 'Gubeng', 'Surabaya', 'Jawa Timur', 60281],
  denpasar: ['IDNP1IDNC110IDND260IDZ80234', 'Denpasar Timur', 'Denpasar', 'Bali', 80234],
  medan: ['IDNP34IDNC273IDND2934IDZ20112', 'Medan Petisah', 'Medan', 'Sumatera Utara', 20112]
} as const

type PlaceKey = keyof typeof PLACES

/** The area object exactly as Biteship's `/v1/maps/areas` shapes it. */
function place(key: PlaceKey) {
  const [id, district, city, province, postalCode] = PLACES[key]

  return {
    id,
    name: `${district}, ${city}, ${province}. ${postalCode}`,
    country_name: 'Indonesia',
    country_code: 'ID',
    administrative_division_level_1_name: province,
    administrative_division_level_1_type: 'province',
    administrative_division_level_2_name: city,
    administrative_division_level_2_type: 'city',
    administrative_division_level_3_name: district,
    administrative_division_level_3_type: 'district',
    postal_code: postalCode
  }
}

export interface SeedAddress {
  label: string
  nama: string
  telp: string
  alamat: string
  place: PlaceKey
  isMain?: boolean
}

export interface SeedTrackingEvent {
  /** Hours before the run started. */
  at: number
  title: string
  /** Defaults to the order's origin city. */
  location?: string
}

export interface SeedOrder {
  orderNo: string
  status: Stage
  from: PlaceKey
  to: PlaceKey
  receiverNama: string
  receiverTelp: string
  receiverAlamat: string
  courierCode: string
  courierName: string
  serviceCode: string
  serviceName: string
  etd: string
  weightGram: number
  content: string
  shippingCost: number
  /** Hours before the run started. */
  createdAgo: number
  updatedAgo: number
  awb?: string
  events?: SeedTrackingEvent[]
}

export interface SeedAccount {
  id: string
  email: string
  password: string
  nama: string
  telp: string
  alamat: string
  addresses: SeedAddress[]
  orders: SeedOrder[]
}

const demo: SeedAccount = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'superadmin@sukabumilogistik.com',
  password: 'testing123',
  nama: 'Superadmin',
  telp: '081234567890',
  alamat: 'Jl. Ahmad Yani No. 12, RT 03/RW 05, Gunung Parang, Cikole',
  addresses: [
    {
      label: 'Rumah',
      nama: 'Andi Nugraha',
      telp: '081234567890',
      alamat: 'Jl. Ahmad Yani No. 12, RT 03/RW 05, Gunung Parang, Cikole',
      place: 'sukabumi',
      isMain: true
    },
    {
      label: 'Toko',
      nama: 'Toko Andi Snack',
      telp: '081234567891',
      alamat: 'Ruko Pasar Pelita Blok B2 No. 7, Cikole',
      place: 'sukabumi'
    },
    {
      label: 'Gudang Cibadak',
      nama: 'Gudang Cibadak',
      telp: '081234567892',
      alamat: 'Jl. Raya Cibadak KM 5, Komplek Pergudangan Nusa Indah',
      place: 'cibadak'
    }
  ],
  orders: [
    {
      orderNo: 'SL-2026-1001',
      status: 'SELESAI',
      from: 'sukabumi',
      to: 'jakarta',
      receiverNama: 'Rina Kusuma',
      receiverTelp: '081377889900',
      receiverAlamat: 'Jl. Palmerah Barat No. 45, Palmerah',
      courierCode: 'jne',
      courierName: 'JNE',
      serviceCode: 'reg',
      serviceName: 'Reguler',
      etd: '2-3 hari',
      weightGram: 1500,
      content: 'Pakaian dan aksesoris',
      shippingCost: 24000,
      createdAgo: 12 * HARI,
      updatedAgo: 9 * HARI,
      awb: 'JNE0012845571',
      events: [
        { at: 12 * HARI, title: 'Pesanan diterima di konter Sukabumi' },
        { at: 11 * HARI - 12, title: 'Paket telah dijemput kurir' },
        { at: 11 * HARI, title: 'Diproses di Gateway Bandung', location: 'KOTA BANDUNG' },
        { at: 10 * HARI, title: 'Transit di Gateway Jakarta', location: 'KOTA JAKARTA BARAT' },
        { at: 9 * HARI + 8, title: 'Paket sedang diantar kurir', location: 'KOTA JAKARTA BARAT' },
        { at: 9 * HARI, title: 'Terkirim, diterima oleh RINA (yang bersangkutan)', location: 'KOTA JAKARTA BARAT' }
      ]
    },
    {
      orderNo: 'SL-2026-1002',
      status: 'SELESAI',
      from: 'sukabumi',
      to: 'bandung',
      receiverNama: 'Dimas Prakoso',
      receiverTelp: '082155667788',
      receiverAlamat: 'Jl. Sukajadi No. 210, Sukajadi',
      courierCode: 'sicepat',
      courierName: 'SiCepat Express',
      serviceCode: 'reg',
      serviceName: 'Reguler',
      etd: '1-2 hari',
      weightGram: 800,
      content: 'Buku dan alat tulis',
      shippingCost: 12000,
      createdAgo: 9 * HARI,
      updatedAgo: 7 * HARI
    },
    {
      orderNo: 'SL-2026-1003',
      status: 'BATAL',
      from: 'sukabumi',
      to: 'surabaya',
      receiverNama: 'Yoga Saputra',
      receiverTelp: '085744332211',
      receiverAlamat: 'Jl. Gubeng Kertajaya VII No. 3, Gubeng',
      courierCode: 'jnt',
      courierName: 'J&T Express',
      serviceCode: 'ez',
      serviceName: 'EZ',
      etd: '3-4 hari',
      weightGram: 2000,
      content: 'Sepatu olahraga',
      shippingCost: 38000,
      createdAgo: 7 * HARI,
      updatedAgo: 7 * HARI - 3
    },
    {
      orderNo: 'SL-2026-1004',
      status: 'DALAM_PERJALANAN',
      from: 'sukabumi',
      to: 'denpasar',
      receiverNama: 'Komang Ayu',
      receiverTelp: '081999002211',
      receiverAlamat: 'Jl. Nusa Kambangan No. 88, Dangin Puri',
      courierCode: 'anteraja',
      courierName: 'AnterAja',
      serviceCode: 'reg',
      serviceName: 'Reguler',
      etd: '3-5 hari',
      weightGram: 3200,
      content: 'Kopi bubuk 3 kg',
      shippingCost: 52000,
      createdAgo: 4 * HARI,
      updatedAgo: 1 * HARI,
      awb: 'ANT100234567891',
      events: [
        { at: 4 * HARI, title: 'Pesanan diterima di konter Sukabumi' },
        { at: 4 * HARI - 7, title: 'Paket telah dijemput kurir' },
        { at: 3 * HARI, title: 'Diproses di Sorting Center Bandung', location: 'KOTA BANDUNG' },
        { at: 2 * HARI, title: 'Transit di Gateway Surabaya', location: 'KOTA SURABAYA' },
        { at: 1 * HARI, title: 'Dalam perjalanan ke Denpasar', location: 'KOTA DENPASAR' }
      ]
    },
    {
      orderNo: 'SL-2026-1005',
      status: 'DIJEMPUT',
      from: 'sukabumi',
      to: 'medan',
      receiverNama: 'Hasan Lubis',
      receiverTelp: '081266554433',
      receiverAlamat: 'Jl. Gatot Subroto No. 17, Petisah Tengah',
      courierCode: 'pos',
      courierName: 'POS Indonesia',
      serviceCode: 'reg',
      serviceName: 'Pos Reguler',
      etd: '4-6 hari',
      weightGram: 5000,
      content: 'Kerajinan bambu',
      shippingCost: 78000,
      createdAgo: 2 * HARI,
      updatedAgo: 1 * HARI - 6
    },
    {
      orderNo: 'SL-2026-1006',
      status: 'DIPROSES',
      from: 'sukabumi',
      to: 'cibadak',
      receiverNama: 'Notaris Wijaya',
      receiverTelp: '081211223344',
      receiverAlamat: 'Jl. Raya Cibadak No. 101, Cibadak',
      courierCode: 'sicepat',
      courierName: 'SiCepat Express',
      serviceCode: 'best',
      serviceName: 'Best',
      etd: '1 hari',
      weightGram: 1000,
      content: 'Dokumen kontrak',
      shippingCost: 15000,
      createdAgo: 26,
      updatedAgo: 22
    },
    {
      orderNo: 'SL-2026-1007',
      status: 'MENUNGGU_PEMBAYARAN',
      from: 'sukabumi',
      to: 'jakarta',
      receiverNama: 'Fitri Handayani',
      receiverTelp: '081322114455',
      receiverAlamat: 'Jl. Kemanggisan Ilir III No. 9, Palmerah',
      courierCode: 'tiki',
      courierName: 'TIKI',
      serviceCode: 'ons',
      serviceName: 'ONS',
      etd: '1 hari',
      weightGram: 1200,
      content: 'Oleh-oleh mochi Sukabumi',
      shippingCost: 29000,
      createdAgo: 5,
      updatedAgo: 5
    },
    {
      orderNo: 'SL-2026-1008',
      status: 'DALAM_PERJALANAN',
      from: 'sukabumi',
      to: 'bandung',
      receiverNama: 'Bayu Ramadhan',
      receiverTelp: '087811992244',
      receiverAlamat: 'Jl. Cipedes Tengah No. 24, Sukajadi',
      courierCode: 'ninja',
      courierName: 'Ninja Xpress',
      serviceCode: 'standard',
      serviceName: 'Standard',
      etd: '1-2 hari',
      weightGram: 700,
      content: 'Casing handphone',
      shippingCost: 11000,
      createdAgo: 3 * HARI,
      updatedAgo: 6,
      awb: 'NJX0098871234',
      events: [
        { at: 3 * HARI, title: 'Pesanan diterima di konter Sukabumi' },
        { at: 3 * HARI - 10, title: 'Paket telah dijemput kurir' },
        { at: 1 * HARI, title: 'Diproses di Sorting Center Bandung', location: 'KOTA BANDUNG' },
        { at: 6, title: 'Paket sedang diantar kurir', location: 'KOTA BANDUNG' }
      ]
    }
  ]
}

/** A second account, so "every route is user-scoped" is actually observable. */
const siti: SeedAccount = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'siti@sukabumilogistik.id',
  password: 'testing123',
  nama: 'Siti Rahayu',
  telp: '081298765432',
  alamat: 'Jl. Siliwangi No. 56, Cibadak',
  addresses: [
    {
      label: 'Rumah',
      nama: 'Siti Rahayu',
      telp: '081298765432',
      alamat: 'Jl. Siliwangi No. 56, Cibadak',
      place: 'cibadak',
      isMain: true
    }
  ],
  orders: [
    {
      orderNo: 'SL-2026-2001',
      status: 'DIPROSES',
      from: 'cibadak',
      to: 'jakarta',
      receiverNama: 'Toko Berkah Jaya',
      receiverTelp: '081455667711',
      receiverAlamat: 'Jl. Palmerah Utara No. 3, Palmerah',
      courierCode: 'jne',
      courierName: 'JNE',
      serviceCode: 'reg',
      serviceName: 'Reguler',
      etd: '2-3 hari',
      weightGram: 2500,
      content: 'Keripik singkong 2.5 kg',
      shippingCost: 31000,
      createdAgo: 2 * HARI,
      updatedAgo: 1 * HARI
    },
    {
      orderNo: 'SL-2026-2002',
      status: 'SELESAI',
      from: 'cibadak',
      to: 'bandung',
      receiverNama: 'Nia Oktaviani',
      receiverTelp: '082277889911',
      receiverAlamat: 'Jl. Pasteur No. 77, Sukajadi',
      courierCode: 'jnt',
      courierName: 'J&T Express',
      serviceCode: 'ez',
      serviceName: 'EZ',
      etd: '1-2 hari',
      weightGram: 900,
      content: 'Mukena bordir',
      shippingCost: 14000,
      createdAgo: 8 * HARI,
      updatedAgo: 6 * HARI
    }
  ]
}

/**
 * The first account is overridable so you can seed a login you already use:
 * `SEED_EMAIL=you@example.com SEED_PASSWORD=... pnpm db:seed`.
 */
export function seedAccounts(): SeedAccount[] {
  const email = process.env.SEED_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_PASSWORD?.trim()

  return [
    {
      ...demo,
      email: email || demo.email,
      password: password || demo.password
    },
    siti
  ]
}

/** Expands a fixture into the row `prisma.address.create` wants. */
export function addressData(address: SeedAddress) {
  const p = place(address.place)

  return {
    label: address.label,
    nama: address.nama,
    telp: address.telp,
    alamat: address.alamat,
    area: p,
    isMain: address.isMain ?? false
  }
}

/** Expands a fixture into the row `prisma.order.create` wants, events included. */
export function orderData(account: SeedAccount, order: SeedOrder) {
  const origin = place(order.from)
  const destination = place(order.to)

  return {
    orderNo: order.orderNo,
    status: order.status,

    senderNama: account.nama,
    senderTelp: account.telp,
    senderAlamat: account.alamat,
    receiverNama: order.receiverNama,
    receiverTelp: order.receiverTelp,
    receiverAlamat: order.receiverAlamat,

    originArea: origin,
    destinationArea: destination,

    courierCode: order.courierCode,
    courierName: order.courierName,
    serviceCode: order.serviceCode,
    serviceName: order.serviceName,
    etd: order.etd,

    weightGram: order.weightGram,
    // One line per fixture, named after its contents.
    items: {
      create: [{
        position: 0,
        name: order.content,
        category: 'others',
        value: SEED_ITEM_VALUE,
        quantity: 1,
        weight: order.weightGram
      }]
    },

    shippingCost: order.shippingCost,
    total: order.shippingCost,

    awb: order.awb ?? null,
    // Left null on purpose: these shipments were never booked on Biteship, so
    // `syncTracking` has nothing to follow and serves the seeded events.
    biteshipOrderId: null,
    biteshipTrackingId: null,
    trackingUrl: null,
    paymentMethod: order.status === 'MENUNGGU_PEMBAYARAN' ? null : 'DEMO',
    paidAt: order.status === 'MENUNGGU_PEMBAYARAN' ? null : ago(order.createdAgo),

    createdAt: ago(order.createdAgo),
    updatedAt: ago(order.updatedAgo),

    trackingEvents: {
      create: (order.events ?? []).map(e => ({
        title: e.title,
        location: e.location ?? origin.administrative_division_level_2_name,
        occurredAt: ago(e.at)
      }))
    }
  }
}
