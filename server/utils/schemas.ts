import { z } from 'zod'

/** A Biteship area as `/api/destinations` returned it; extra keys are dropped. */
export const areaSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().max(200),
  country_name: z.string().trim().max(60),
  country_code: z.string().trim().max(4),
  administrative_division_level_1_name: z.string().trim().max(100),
  administrative_division_level_1_type: z.string().trim().max(40),
  administrative_division_level_2_name: z.string().trim().max(100),
  administrative_division_level_2_type: z.string().trim().max(40),
  administrative_division_level_3_name: z.string().trim().min(1).max(100),
  administrative_division_level_3_type: z.string().trim().max(40),
  postal_code: z.number().int().min(0).max(99999)
})

const dimension = z.number().int().min(1).max(1000).nullable().default(null)

/** One package line, bounded to what Biteship accepts. */
export const itemSchema = z.object({
  name: z.string().trim().min(1, 'Nama barang wajib diisi').max(100),
  description: z.string().trim().max(300).default(''),
  category: z.string().trim().max(40).default(''),
  sku: z.string().trim().max(60).default(''),
  value: z.number().int().min(1, 'Nilai barang wajib diisi').max(1_000_000_000),
  quantity: z.number().int().min(1, 'Jumlah barang minimal 1').max(1000),
  weight: z.number().int().min(1, 'Berat barang wajib diisi').max(150_000),
  length: dimension,
  width: dimension,
  height: dimension
})

export const itemsSchema = z.array(itemSchema)
  .min(1, 'Tambahkan minimal satu barang')
  .max(50)
  .refine(items => itemsWeight(items) <= 150_000, 'Total berat maksimal 150 kg')

/** Emails are compared and stored lowercase. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Email tidak valid'))

/** bcrypt ignores everything past 72 bytes, so longer passwords are refused. */
export const newPasswordSchema = z.string()
  .min(8, 'Password minimal 8 karakter')
  .max(72, 'Password maksimal 72 karakter')

/** A token from an emailed link, as `newToken()` makes them. */
export const linkTokenSchema = z.string().trim().min(20, 'Link tidak valid').max(200, 'Link tidak valid')
